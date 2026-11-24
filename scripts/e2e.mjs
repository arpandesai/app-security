// End-to-end test: plays the role of the coding agent against a running server.
// Usage: MFS_URL=http://localhost:3000 node scripts/e2e.mjs
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import assert from "node:assert/strict";

const BASE = process.env.MFS_URL || "http://localhost:3000";
const FIXTURE = new URL("../test-fixtures/payflow-expo/", import.meta.url).pathname;
const MARKERS = /^(package\.json|app\.json|app\.config\.(js|ts)|pubspec\.yaml|AndroidManifest\.xml|build\.gradle(\.kts)?|Info\.plist|Podfile|Package\.swift|google-services\.json|GoogleService-Info\.plist|firebase\.json|firestore\.rules|config\.toml)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "Pods", "build", ".git"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "migrations" || name.endsWith(".xcodeproj")) out.push(relative(FIXTURE, p));
      walk(p, out);
    } else if (MARKERS.test(name)) out.push(relative(FIXTURE, p));
  }
  return out;
}

const textOf = (r) => r.content.map((c) => c.text).join("\n");
const ok = (msg) => console.log("  ✓", msg);

// Ground truth for the fixture: what an auditing agent finds reading the code.
const ev = (file, line, snippet) => ({ file, line, snippet });
const TRUTH = {
  "MFS-SECRETS-01": { status: "fail", evidence: [ev(".env", 3, "EXPO_PUBLIC_OPENAI_KEY=sk-proj-TESTONLYabcdefghijklmnopqrstuvwxyz0123456789"), ev(".env", 2, "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbG…(service_role JWT)")] },
  "MFS-SECRETS-02": { status: "fail", evidence: [ev("src/lib/ai.ts", 3, "const openai = new OpenAI({ apiKey: process.env.EXPO_PUBLIC_OPENAI_KEY, dangerouslyAllowBrowser: true });")] },
  "MFS-SECRETS-03": { status: "fail", evidence: [ev(".env", 2, "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbG••••6789"), ev(".env", 3, "EXPO_PUBLIC_OPENAI_KEY=sk-pro••••6789")] },
  "MFS-SECRETS-04": { status: "fail", evidence: [ev(".env", 1, ".env with live secrets is committed; no .gitignore in repo")] },
  "MFS-BACKEND-01": { status: "fail", evidence: [ev("src/lib/supabase.ts", 5, "process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!")], note: "JWT payload role is service_role." },
  "MFS-BACKEND-02": { status: "fail", evidence: [ev("supabase/migrations/0001_init.sql", 2, "create table transactions (...) -- RLS never enabled"), ev("supabase/migrations/0001_init.sql", 5, 'create policy "profiles readable" on profiles for select using (true);')] },
  "MFS-BACKEND-04": { status: "fail", evidence: [ev("src/screens/Admin.tsx", 4, 'if (user.role === "admin") {')], note: "Admin list is gated only in the app; with RLS using(true) any user can read all profiles." },
  "MFS-BACKEND-05": { status: "not_applicable" },
  "MFS-STORAGE-01": { status: "fail", evidence: [ev("src/lib/auth.ts", 9, 'await AsyncStorage.setItem("access_token", data.session!.access_token);\nawait AsyncStorage.setItem("refresh_token", data.session!.refresh_token);')] },
  "MFS-STORAGE-02": { status: "not_applicable" },
  "MFS-STORAGE-03": { status: "fail", evidence: [ev("src/lib/auth.ts", 8, 'console.log("login ok", data.session);')] },
  "MFS-STORAGE-04": { status: "fail", evidence: [ev("app.json", 6, '"android": { ... } // allowBackup not set (Expo default true)')] },
  "MFS-NETWORK-01": { status: "fail", evidence: [ev("src/lib/api.ts", 3, 'axios.create({ baseURL: "http://api.payflow-demo.com/v1" })'), ev("app.json", 13, '"NSAppTransportSecurity": { "NSAllowsArbitraryLoads": true }')] },
  "MFS-NETWORK-02": { status: "pass" },
  "MFS-NETWORK-03": { status: "fail", evidence: [ev("src/lib/api.ts", 3, "API client with no pinning; payments app")] },
  "MFS-NETWORK-04": { status: "pass" },
  "MFS-AUTH-01": { status: "not_applicable" },
  "MFS-AUTH-02": { status: "pass" },
  "MFS-AUTH-03": { status: "fail", evidence: [ev("src/lib/auth.ts", 14, 'export async function logout() {\n  router.replace("/login");\n}')] },
  "MFS-AUTH-04": { status: "fail", evidence: [ev("src/lib/api.ts", 5, 'export const sendMoney = (to, amount) => api.post("/transfers", { to, amount });')] },
  "MFS-CRYPTO-01": { status: "not_applicable" },
  "MFS-CRYPTO-02": { status: "not_applicable" },
  "MFS-CRYPTO-03": { status: "not_applicable" },
  "MFS-CRYPTO-04": { status: "fail", evidence: [ev("src/lib/auth.ts", 19, "return Math.random().toString(36).slice(2, 8).toUpperCase();")] },
  "MFS-PLATFORM-01": { status: "pass", note: "Expo-managed; no custom exported components declared." },
  "MFS-PLATFORM-02": { status: "fail", evidence: [ev("src/screens/Help.tsx", 6, "const { url } = useLocalSearchParams<{ url: string }>();")], note: "payflow://help?url=… opens any URL inside the app." },
  "MFS-PLATFORM-03": { status: "fail", evidence: [ev("src/screens/Help.tsx", 10, 'originWhitelist={["*"]}\nonMessage={(e) => { ... if (msg.type === "pay") sendMoney(msg.to, msg.amount); }}')] },
  "MFS-PLATFORM-04": { status: "fail", evidence: [ev("src/screens/Login.tsx", 4, '<TextInput placeholder="Password" value={props.value} onChangeText={props.onChangeText} />')] },
  "MFS-PLATFORM-05": { status: "pass", note: "No screens with card numbers or statements found." },
  "MFS-PLATFORM-06": { status: "not_applicable" },
  "MFS-PLATFORM-07": { status: "not_applicable" },
  "MFS-PLATFORM-08": { status: "not_applicable" },
  "MFS-CODE-02": { status: "fail", evidence: [ev("package.json", 7, '"expo": "~52.0.0"')], note: "Expo SDK 52 targets Android API 34 by default." },
  "MFS-CODE-03": { status: "pass" },
  "MFS-CODE-04": { status: "pass" },
  "MFS-CODE-05": { status: "pass" },
  "MFS-CODE-06": { status: "fail", evidence: [ev("package.json", 5, "No minimum-version or in-app update mechanism found")] },
  "MFS-PRIVACY-01": { status: "fail", evidence: [ev("app.json", 8, '"permissions": ["READ_CONTACTS", "ACCESS_BACKGROUND_LOCATION", "CAMERA"]')], note: "Contacts and background location are never used in code." },
  "MFS-PRIVACY-02": { status: "fail", evidence: [ev("app.json", 10, '"ios": { ... } // no privacyManifests')] },
  "MFS-PRIVACY-03": { status: "not_applicable" },
  "MFS-PRIVACY-04": { status: "pass" },
  "MFS-PRIVACY-05": { status: "fail", evidence: [ev("src/lib/auth.ts", 5, "export async function login(...) — accounts exist, no delete-account flow")] },
  "MFS-RESILIENCE-01": { status: "pass" },
  "MFS-RESILIENCE-02": { status: "pass" },
  "MFS-RESILIENCE-03": { status: "fail", evidence: [ev("package.json", 5, "No App Check / Play Integrity / App Attest dependency")] },
};

const pkg = JSON.parse(readFileSync(join(FIXTURE, "package.json"), "utf8"));

const client = new Client({ name: "e2e-agent", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`)));
console.log("Connected to", `${BASE}/mcp`);

const tools = (await client.listTools()).tools.map((t) => t.name).sort();
assert.deepEqual(tools, ["audit", "submit_findings"]);
ok(`tools: ${tools.join(", ")}`);
const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
assert.ok(prompts.includes("audit"));
ok("prompt: audit");
assert.match(client.getInstructions() || "", /read-only security audit/);
ok("server instructions present");

// Unknown project → helpful message, no session
const none = textOf(await client.callTool({ name: "audit", arguments: { project_files: ["README.md"] } }));
assert.match(none, /No mobile app found/);
ok("non-mobile project handled");

const projectFiles = walk(FIXTURE);
const start = await client.callTool({
  name: "audit",
  arguments: {
    project_files: projectFiles,
    dependency_names: Object.keys(pkg.dependencies),
    app_name: "PayFlow",
    app_description: "Peer-to-peer payments app",
    agent: "Claude Code",
  },
});
const checklist = textOf(start);
writeFileSync("/tmp/mfs-checklist.md", checklist);
const auditId = checklist.match(/Audit ID: (\S+)/)[1];
const ruleIds = [...checklist.matchAll(/^### (MFS-[A-Z]+-\d+)/gm)].map((m) => m[1]);
assert.match(checklist, /Detected stack: React Native \(Expo\) · Android, iOS · Supabase/);
ok(`audit started ${auditId.slice(0, 10)}… — ${ruleIds.length} checks, ${checklist.length} chars (~${Math.round(checklist.length / 4)} tokens)`);
assert.ok(!ruleIds.includes("MFS-BACKEND-03"), "Firebase rules should not apply");
assert.ok(ruleIds.includes("MFS-BACKEND-01"));
ok("stack-specific plan (Supabase in, Firebase out)");

// Validation: bad submissions are rejected
const bad = textOf(
  await client.callTool({
    name: "submit_findings",
    arguments: {
      audit_id: auditId,
      results: [
        { rule_id: "MFS-STORAGE-01", status: "fail" },
        { rule_id: "MFS-FAKE-99", status: "pass" },
        { rule_id: "MFS-BACKEND-02", status: "unable_to_check" },
      ],
    },
  })
);
assert.match(bad, /Saved 0 results/);
assert.match(bad, /MFS-STORAGE-01: a fail needs evidence/);
assert.match(bad, /MFS-FAKE-99: not part of this audit/);
assert.match(bad, /MFS-BACKEND-02: unable_to_check needs a note/);
ok("invalid results rejected with reasons");

// Submit category by category, like an agent would
const byCat = new Map();
for (const id of ruleIds) {
  const cat = id.split("-")[1];
  byCat.set(cat, [...(byCat.get(cat) || []), id]);
}
let final = "";
for (const [cat, ids] of byCat) {
  const results = ids.filter((id) => id !== "MFS-CODE-01").map((id) => ({ rule_id: id, ...(TRUTH[id] || { status: "pass" }) }));
  const args = { audit_id: auditId, results };
  if (cat === "CODE") args.dependencies = Object.entries(pkg.dependencies).map(([name, v]) => ({ ecosystem: "npm", name, version: v.replace(/^[~^]/, "") }));
  const out = textOf(await client.callTool({ name: "submit_findings", arguments: args }));
  if (out.includes("still open")) ok(`${cat}: ${out.split("\n")[0]}`);
  else final = out;
}
assert.match(final, /Full report with fix guidance: (\S+)/);
console.log("\n--- What the user sees in chat ---\n" + final.split("\n---\n")[0] + "\n----------------------------------\n");

const url = final.match(/Full report with fix guidance: (\S+)/)[1];
const reportId = url.split("/r/")[1];

// Idempotent: a repeat submit returns the same report
const again = textOf(await client.callTool({ name: "submit_findings", arguments: { audit_id: auditId, results: [] } }));
assert.ok(again.includes(url));
ok("repeat submit returns same report link");

const html = await (await fetch(`${BASE}/r/${reportId}`)).text();
assert.match(html, /Not safe to launch/);
assert.ok(!html.includes("TESTONLYabcdefghij"), "live secret must be masked");
assert.match(html, /sk-pro••••/);
writeFileSync("/tmp/mfs-report.html", html);
ok("report page renders; secret masked server-side");

const lead = await fetch(`${BASE}/api/lead`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ reportId, email: "founder@example.com", intent: "fix" }),
});
assert.equal(lead.status, 200);
const badLead = await fetch(`${BASE}/api/lead`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ reportId, email: "nope", intent: "fix" }),
});
assert.equal(badLead.status, 400);
ok("lead capture works; bad email rejected");

// Parallel submissions (agents that check categories concurrently) must all land on the same audit
const p = textOf(
  await client.callTool({
    name: "audit",
    arguments: { project_files: projectFiles, dependency_names: Object.keys(pkg.dependencies), app_name: "Parallel", agent: "e2e" },
  })
);
const pId = p.match(/Audit ID: (\S+)/)[1];
const pRules = [...p.matchAll(/^### (MFS-[A-Z]+-\d+)/gm)].map((m) => m[1]);
const pGroups = new Map();
for (const id of pRules) pGroups.set(id.split("-")[1], [...(pGroups.get(id.split("-")[1]) || []), id]);
const pOuts = await Promise.all(
  [...pGroups].map(([cat, ids]) =>
    client.callTool({
      name: "submit_findings",
      arguments: {
        audit_id: pId,
        results: ids.filter((id) => id !== "MFS-CODE-01").map((id) => ({ rule_id: id, ...(TRUTH[id] || { status: "pass" }) })),
        ...(cat === "CODE" ? { dependencies: [{ ecosystem: "npm", name: "axios", version: "0.21.0" }] } : {}),
      },
    }).then(textOf)
  )
);
assert.ok(!pOuts.some((t) => t.startsWith("Unknown")), "no parallel call may lose the audit");
const pFinal = pOuts.find((t) => t.includes("Full report")) || textOf(await client.callTool({ name: "submit_findings", arguments: { audit_id: pId, results: [] } }));
assert.match(pFinal, /Full report with fix guidance/);
ok(`${pOuts.length} parallel submit_findings calls: all accepted, report generated`);

const health = await (await fetch(`${BASE}/api/health`)).json();
assert.equal(health.ok, true);
ok(`health: storage=${health.storage}`);

const missing = await fetch(`${BASE}/r/AAAAAAAAAAAAAAAAAAAAAA`);
assert.match(await missing.text(), /Report not found/);
ok("unknown report shows not-found page");

await client.close();
console.log("\nAll checks passed. Report:", url);
