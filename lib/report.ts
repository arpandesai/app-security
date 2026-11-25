import type { AuditSession, CheckResult, Evidence, Finding, Report, Severity, Verdict } from "./types";
import { getRule, categoryName } from "./rules";
import type { DepScan } from "./osv";
import type { RegistryScan } from "./registry";
import { BRAND } from "./config";

export const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low"];
const WEIGHT: Record<Severity, number> = { critical: 25, high: 12, medium: 5, low: 2 };
const sevRank = (s: Severity) => SEV_ORDER.indexOf(s);

function grade(score: number) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function buildReport(
  reportId: string,
  session: AuditSession,
  results: Record<string, CheckResult>,
  dep: DepScan,
  reg: RegistryScan = { status: "skipped", flags: [] }
): Report {
  const findings: Finding[] = [];
  const needsReview: Finding[] = [];
  const passed: Report["passed"] = [];
  const notApplicable: Report["notApplicable"] = [];

  for (const id of session.ruleIds) {
    const rule = getRule(id);
    if (!rule) continue;
    const r = results[id];

    if (rule.serverEvaluated) {
      // Dependency check: verdict comes from OSV, not the agent.
      if (dep.status === "done" && dep.vulns.length) {
        const worst = dep.vulns[0].severity;
        findings.push({
          ruleId: id,
          title: rule.title,
          category: rule.category,
          severity: worst,
          status: "fail",
          founder: rule.founder,
          fix: rule.fix,
          evidence: dep.vulns.slice(0, 15).map((v) => ({
            file: `${v.ecosystem}: ${v.package}@${v.version}`,
            snippet: `${v.severity.toUpperCase()} — ${v.ids.join(", ")}${v.summary ? " — " + v.summary : ""}`,
          })),
          note: dep.vulns.length > 15 ? `${dep.vulns.length - 15} more vulnerable packages not shown.` : undefined,
          refs: rule.refs,
          standards: rule.standards,
          level: rule.level,
        });
      } else if (dep.status === "done") {
        passed.push({ ruleId: id, title: rule.title, category: rule.category });
      } else {
        needsReview.push({
          ruleId: id,
          title: rule.title,
          category: rule.category,
          severity: rule.severity,
          status: "unable_to_check",
          founder: rule.founder,
          fix: rule.fix,
          evidence: [],
          note:
            dep.status === "skipped"
              ? r?.note || "No dependency list was provided by the coding agent."
              : "The vulnerability database could not be reached. Re-run the audit to complete this check.",
          refs: rule.refs,
          standards: rule.standards,
          level: rule.level,
        });
      }
      continue;
    }

    if (!r) continue;
    const base = {
      ruleId: id,
      title: rule.title,
      category: rule.category,
      severity: rule.severity,
      founder: rule.founder,
      fix: rule.fix,
      evidence: r.evidence || [],
      note: r.note,
      refs: rule.refs,
      standards: rule.standards,
      level: rule.level,
    };

    if (rule.registryCheck && reg.flags.length) {
      // Merge the server's registry lookups with the agent's lockfile result.
      const missing = reg.flags.filter((f) => f.reason === "not_found");
      const regEvidence: Evidence[] = reg.flags.slice(0, 15).map((f) => ({
        file: `${f.ecosystem}: ${f.package}@${f.version}`,
        snippet:
          f.reason === "not_found"
            ? "Not found on the public registry. Possibly invented by an AI tool, a typo, or a private package."
            : `Only ${f.downloads} downloads ${f.ecosystem === "npm" ? "last week" : "in 30 days"}. Confirm it is the package you meant.`,
      }));
      const agentFailed = r.status === "fail";
      const severity: Severity = agentFailed || missing.length ? rule.severity : "medium";
      const notes = [
        agentFailed ? r.note : undefined,
        missing.length ? "If a flagged package comes from your own private registry, you can ignore it." : undefined,
        reg.flags.length > 15 ? `${reg.flags.length - 15} more flagged packages not shown.` : undefined,
      ].filter(Boolean);
      findings.push({
        ...base,
        severity,
        status: "fail",
        evidence: [...(agentFailed ? base.evidence : []), ...regEvidence],
        note: notes.length ? notes.join(" ") : undefined,
      });
      continue;
    }

    if (r.status === "fail") findings.push({ ...base, status: "fail" });
    else if (r.status === "unable_to_check") needsReview.push({ ...base, status: "unable_to_check" });
    else if (r.status === "pass") passed.push({ ruleId: id, title: rule.title, category: rule.category });
    else notApplicable.push({ ruleId: id, title: rule.title, category: rule.category });
  }

  findings.sort((a, b) => sevRank(a.severity) - sevRank(b.severity));
  const counts = { critical: 0, high: 0, medium: 0, low: 0 } as Record<Severity, number>;
  for (const f of findings) counts[f.severity]++;

  // Score = severity-weighted share of applicable checks passed (not-applicable and needs-review excluded),
  // then capped by the verdict so a critical issue can never look "fine".
  const failWeight = findings.reduce((s, f) => s + WEIGHT[f.severity], 0);
  const passWeight = passed.reduce((s, p) => s + WEIGHT[getRule(p.ruleId)?.severity ?? "low"], 0);
  const applicable = failWeight + passWeight;
  let score = applicable ? Math.round(100 * (1 - failWeight / applicable)) : 100;
  let verdict: Verdict = "Safe to launch";
  if (counts.critical) {
    verdict = "Not safe to launch";
    score = Math.min(score, 39);
  } else if (counts.high) {
    verdict = "Fix before launch";
    score = Math.min(score, 74);
  }

  return {
    id: reportId,
    auditId: session.id,
    createdAt: new Date().toISOString(),
    appName: session.appName,
    stack: session.profile.label,
    verdict,
    score,
    grade: grade(score),
    counts,
    findings,
    needsReview,
    passed,
    notApplicable,
    dependencyVulns: dep.vulns,
    dependencyScan: dep.status,
    registryFlags: reg.flags,
    registryScan: reg.status,
    checksRun: session.ruleIds.length,
    agent: session.agent,
  };
}

const loc = (f: Finding) => {
  const e = f.evidence[0];
  if (!e) return "";
  return e.line ? ` (${e.file}:${e.line})` : ` (${e.file})`;
};

/** What the coding agent shows the user in chat: the headline, top three, and the link. */
export function chatSummary(r: Report, url: string): string {
  const lines = [
    `**${BRAND} audit: ${r.appName}**`,
    `Verdict: **${r.verdict}** · Score ${r.score}/100 (${r.grade})`,
    `Critical ${r.counts.critical} · High ${r.counts.high} · Medium ${r.counts.medium} · Low ${r.counts.low}` +
      (r.needsReview.length ? ` · Needs review ${r.needsReview.length}` : ""),
    "",
  ];
  if (r.findings.length) {
    lines.push("Fix these first:");
    r.findings.slice(0, 3).forEach((f, i) => lines.push(`${i + 1}. [${f.severity}] ${f.title}${loc(f)}`));
    if (r.findings.length > 3) lines.push(`…plus ${r.findings.length - 3} more in the full report.`);
  } else {
    lines.push(`No issues found across ${r.checksRun} checks.`);
  }
  lines.push("", `Full report with fix guidance: ${url}`);
  return lines.join("\n");
}

export { categoryName };
