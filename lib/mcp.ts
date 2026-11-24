import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { AuditSession, CheckResult, Dependency } from "./types";
import { detectProfile } from "./detect";
import { planRules, renderChecklist, agentInstructions } from "./checklist";
import { getRule, categoryName, RULESET_VERSION } from "./rules";
import { cleanSnippet } from "./mask";
import { scanDependencies } from "./osv";
import { buildReport, chatSummary } from "./report";
import { kv, TTL } from "./store";
import { BASE_URL, BRAND, newId } from "./config";

export const SERVER_INSTRUCTIONS = `${BRAND} runs a read-only security audit of a mobile app's source code (React Native/Expo, Flutter, native Android, native iOS). The audit runs entirely inside your coding agent on the user's machine: this server supplies the rules and writes the report.
When the user says "audit", asks for a security audit or check, or asks whether their app is safe to launch, call the \`audit\` tool and follow its instructions until \`submit_findings\` returns the report link.
Never modify the user's files during the audit.`;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const errorText = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });

const DETECT_FILES =
  "package.json, app.json, app.config.js, app.config.ts, pubspec.yaml, AndroidManifest.xml, build.gradle, build.gradle.kts, Info.plist, Podfile, Package.swift, *.xcodeproj, google-services.json, GoogleService-Info.plist, firebase.json, firestore.rules, supabase/config.toml, supabase/migrations";

const auditInput = z.object({
  project_files: z
    .array(z.string())
    .min(1)
    .describe(
      `Repo-relative paths of every file or folder matching these names (search the whole repo, skip node_modules, Pods, build, .dart_tool): ${DETECT_FILES}`
    ),
  dependency_names: z
    .array(z.string())
    .optional()
    .describe("Package names listed under dependencies in package.json and/or pubspec.yaml (names only)."),
  app_name: z.string().optional().describe("The app's display name if known."),
  app_description: z
    .string()
    .optional()
    .describe("One line on what the app does, e.g. 'peer-to-peer payments app'. Used to judge checks that only matter for apps handling money, health or identity data."),
  agent: z.string().optional().describe("Your product name, e.g. Claude Code, Codex, Cursor, Copilot."),
});

const evidence = z.object({
  file: z.string().describe("Repo-relative file path"),
  line: z.number().int().optional(),
  snippet: z.string().optional().describe("The offending line(s), max 3 lines, secrets masked"),
});

const submitInput = z.object({
  audit_id: z.string(),
  results: z
    .array(
      z.object({
        rule_id: z.string(),
        status: z.enum(["fail", "pass", "not_applicable", "unable_to_check"]),
        evidence: z.array(evidence).max(10).optional().describe("Required when status is fail"),
        note: z.string().max(600).optional().describe("Short explanation; required for unable_to_check"),
      })
    )
    .describe("Results for one or more checks. Send an empty array to see which checks are still open."),
  dependencies: z
    .array(
      z.object({
        ecosystem: z.enum(["npm", "Pub", "Maven", "SwiftURL", "CocoaPods"]),
        name: z.string(),
        version: z.string(),
      })
    )
    .max(1000)
    .optional()
    .describe("Direct dependencies with exact resolved versions, for MFS-CODE-01."),
});

const sessionKey = (id: string) => `audit:${id}`;
const resultsKey = (id: string) => `audit:${id}:results`;
const depsKey = (id: string) => `audit:${id}:deps`;
const reportLockKey = (id: string) => `audit:${id}:report`;
export const reportKey = (id: string) => `report:${id}`;
export const reportUrl = (id: string) => `${BASE_URL}/r/${id}`;

async function loadResults(auditId: string): Promise<Record<string, CheckResult>> {
  const raw = await kv.hgetall(resultsKey(auditId));
  const out: Record<string, CheckResult> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = typeof v === "string" ? JSON.parse(v) : (v as CheckResult);
  return out;
}

async function loadDeps(auditId: string): Promise<Dependency[]> {
  const raw = await kv.hgetall(depsKey(auditId));
  return Object.values(raw).map((v) => (typeof v === "string" ? JSON.parse(v) : v));
}

function remainingByCategory(session: AuditSession, answered: Set<string>) {
  const open = session.ruleIds.filter((id) => !answered.has(id));
  const groups = new Map<string, string[]>();
  for (const id of open) {
    const cat = categoryName(getRule(id)!.category);
    groups.set(cat, [...(groups.get(cat) || []), id]);
  }
  return { open, text: [...groups].map(([c, ids]) => `- ${c}: ${ids.join(", ")}`).join("\n") };
}

export function registerMobileFirstSecure(server: McpServer) {
  server.registerPrompt(
    "audit",
    { title: `${BRAND}: audit this app`, description: "Run a read-only security audit of the mobile app in this project." },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Run a ${BRAND} security audit of the mobile app in this project. Call the \`audit\` tool and follow its instructions until the report link is ready. Don't modify any files.`,
          },
        },
      ],
    })
  );

  server.registerTool(
    "audit",
    {
      title: `${BRAND}: start security audit`,
      description:
        `Start a ${BRAND} security audit of the mobile app in the current project (React Native/Expo, Flutter, native Android, native iOS). ` +
        `Use when the user says "audit", asks for a security audit/check, or asks if the app is safe to launch. ` +
        `First list the project's marker files (${DETECT_FILES}) and the dependency names from package.json / pubspec.yaml, then call this tool. ` +
        "It returns the checklist to run locally on the code. Read-only: never modify files.",
      inputSchema: auditInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      const profile = detectProfile(args.project_files, args.dependency_names);
      if (!profile) {
        return text(
          `No mobile app found from these files. ${BRAND} audits React Native/Expo, Flutter, native Android and native iOS projects. ` +
            "Make sure you are at the project root and included files like package.json, pubspec.yaml, AndroidManifest.xml, build.gradle, Info.plist or Podfile, then call `audit` again."
        );
      }
      const planned = planRules(profile);
      const session: AuditSession = {
        id: newId("aud_"),
        createdAt: new Date().toISOString(),
        appName: args.app_name?.trim() || "Your app",
        appDescription: args.app_description?.trim(),
        profile,
        ruleIds: planned.map((p) => p.rule.id),
        agent: args.agent?.trim(),
        rulesetVersion: RULESET_VERSION,
      };
      await kv.setJSON(sessionKey(session.id), session, TTL.audit);

      const header = [
        `${BRAND} audit started.`,
        `Detected stack: ${profile.label}`,
        args.app_description ? `App: ${args.app_description}` : "",
        "",
        agentInstructions(session.id, planned.length),
      ]
        .filter((l) => l !== "")
        .join("\n");
      return text(header + "\n" + renderChecklist(planned));
    }
  );

  server.registerTool(
    "submit_findings",
    {
      title: `${BRAND}: submit audit results`,
      description:
        "Submit results for checks from an `audit` checklist (one category at a time is best). " +
        "Returns which checks are still open, or — once every check has a result — the audit summary and report link to show the user.",
      inputSchema: submitInput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      const session = await kv.getJSON<AuditSession>(sessionKey(args.audit_id));
      if (!session) return errorText(`Unknown or expired audit_id "${args.audit_id}". Call \`audit\` to start a new audit.`);

      const inPlan = new Set(session.ruleIds);
      const problems: string[] = [];
      let saved = 0;

      for (const r of args.results) {
        if (!inPlan.has(r.rule_id)) {
          problems.push(`${r.rule_id}: not part of this audit's checklist.`);
          continue;
        }
        if (r.status === "fail" && !(r.evidence && r.evidence.length)) {
          problems.push(`${r.rule_id}: a fail needs evidence (file, line, snippet). Resubmit it with evidence.`);
          continue;
        }
        if (r.status === "unable_to_check" && !r.note) {
          problems.push(`${r.rule_id}: unable_to_check needs a note saying why. Resubmit it with a note.`);
          continue;
        }
        const clean: CheckResult = {
          rule_id: r.rule_id,
          status: r.status,
          note: r.note?.slice(0, 600),
          evidence: r.evidence?.slice(0, 10).map((e) => ({
            file: e.file.replace(/^\.?\//, "").slice(0, 300),
            line: e.line,
            snippet: cleanSnippet(e.snippet),
          })),
        };
        await kv.hset(resultsKey(session.id), r.rule_id, JSON.stringify(clean), TTL.audit);
        saved++;
      }

      if (args.dependencies?.length) {
        for (const d of args.dependencies) {
          await kv.hset(depsKey(session.id), `${d.ecosystem}:${d.name}`, JSON.stringify(d), TTL.audit);
        }
        const depRule = session.ruleIds.find((id) => getRule(id)?.serverEvaluated);
        if (depRule) {
          await kv.hset(resultsKey(session.id), depRule, JSON.stringify({ rule_id: depRule, status: "pass" }), TTL.audit);
        }
      }

      const results = await loadResults(session.id);
      const { open, text: openText } = remainingByCategory(session, new Set(Object.keys(results)));
      const problemText = problems.length ? `\n\nNot saved:\n- ${problems.join("\n- ")}` : "";

      if (open.length) {
        return text(
          `Saved ${saved} result${saved === 1 ? "" : "s"}. ${open.length} of ${session.ruleIds.length} checks still open:\n${openText}${problemText}\n\nContinue with the next category, then call submit_findings again.`
        );
      }

      // All checks answered: generate the report exactly once.
      const newReportId = newId();
      const won = await kv.setNX(reportLockKey(session.id), newReportId, TTL.report);
      const reportId = won ? newReportId : (await kv.get(reportLockKey(session.id)))!;

      let report = won ? null : await kv.getJSON<ReturnType<typeof buildReport>>(reportKey(reportId));
      if (!report) {
        const dep = await scanDependencies(await loadDeps(session.id));
        report = buildReport(reportId, session, results, dep);
        await kv.setJSON(reportKey(reportId), report, TTL.report);
      }

      const url = reportUrl(reportId);
      return text(
        `${chatSummary(report, url)}${problemText}\n\n---\nShow the summary above to the user exactly as written, including the link. This audit is read-only: don't change any code as part of it.`
      );
    }
  );
}
