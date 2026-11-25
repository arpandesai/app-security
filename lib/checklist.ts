import type { Profile, Rule, RuleVariant } from "./types";
import { ALL_RULES, CATEGORIES } from "./rules";
import { EXCLUDE } from "./rules/globs";

export interface PlannedRule {
  rule: Rule;
  variants: RuleVariant[];
}

/** Rules (with only their applicable variants) for a detected profile, in category order. */
export function planRules(profile: Profile): PlannedRule[] {
  const active = new Set(profile.targets);
  const planned: PlannedRule[] = [];
  for (const cat of CATEGORIES) {
    for (const rule of ALL_RULES.filter((r) => r.category === cat.id)) {
      const variants = rule.variants.filter((v) => active.has(v.target));
      if (variants.length) planned.push({ rule, variants });
    }
  }
  return planned;
}

/** Split comma-separated glob lists without breaking brace sets such as *.{js,ts}. */
export const splitGlobs = (g: string) => g.split(/,(?![^{]*\})/).map((x) => x.trim()).filter(Boolean);

const list = (xs: string[]) => xs.map((x) => "`" + x + "`").join(", ");

/** Compact markdown checklist the coding agent works through. */
export function renderChecklist(planned: PlannedRule[]): string {
  const out: string[] = [];
  let n = 0;
  for (const cat of CATEGORIES) {
    const items = planned.filter((p) => p.rule.category === cat.id);
    if (!items.length) continue;
    n++;
    out.push(`\n## ${n}. ${cat.name} — ${items.length} check${items.length > 1 ? "s" : ""}`);
    for (const { rule, variants } of items) {
      out.push(`\n### ${rule.id} · ${rule.severity} · ${rule.title}`);
      if (rule.highValueOnly)
        out.push("Applies only to apps handling money, health or identity data. Otherwise answer not_applicable.");
      out.push(`Check: ${rule.check}`);
      if (!rule.serverEvaluated) {
        out.push(`Fail if: ${rule.failIf}`);
        out.push(`Pass if: ${rule.passIf}`);
      }
      out.push("Where:");
      for (const v of variants) {
        out.push(
          `- ${v.scope}: look in ${list(v.lookIn.flatMap(splitGlobs))}; search ${list(v.searchFor)}` +
            (v.hint ? ` — ${v.hint}` : "")
        );
      }
    }
  }
  return out.join("\n");
}

export function agentInstructions(auditId: string, total: number): string {
  return [
    `Audit ID: ${auditId}`,
    "",
    "HOW TO RUN THIS AUDIT (read-only — do not modify any file):",
    `1. Work through the ${total} checks below, one category at a time. Use your own file search/read tools on this repository.`,
    `   Skip third-party and generated folders: ${EXCLUDE.join(", ")}.`,
    "   Search terms are PCRE-style regex starting points (use rg --pcre2 or grep -P); always read the surrounding code before deciding.",
    "2. Give every check exactly one status:",
    "   - fail: the issue is present. Include evidence: file path, line number, and the offending line(s) as snippet (max 3 lines).",
    "   - pass: you checked and the issue is not present (or the safe pattern is used).",
    "   - not_applicable: the feature the check is about isn't used in this app.",
    "   - unable_to_check: it can't be verified from source in this repo. Say why in `note`.",
    "   Mask live secrets in snippets: keep the first 6 and last 4 characters (e.g. sk_live_••••9f2a).",
    "3. After each category, call `submit_findings` with the audit_id and that category's results. One fail result per rule with all evidence locations (up to 10).",
    "   Send the app's direct dependencies with exact resolved versions (from the lockfiles) in `dependencies` once, with any category.",
    "   The server checks them for known vulnerabilities (MFS-CODE-01, don't judge it yourself) and against the public registries for packages that don't exist (added to MFS-CODE-07).",
    "4. When every check has a result, submit_findings returns the summary and the report link. Show that summary to the user exactly as returned.",
    "Tell the user briefly that the audit is running (it takes a few minutes); don't narrate each check.",
  ].join("\n");
}
