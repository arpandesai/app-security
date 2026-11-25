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
  "MFS-SECRETS-05": { status: "not_applicable", note: "No AI tool config files in the repo." },
  "MFS-SECRETS-04": { status: "fail", evidence: [ev(".env", 1, ".env with live secrets is committed; no .gitignore in repo")] },
  "MFS-BACKEND-01": { status: "fail", evidence: [ev("src/lib/supabase.ts", 5, "process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!")], note: "JWT payload role is service_role." },
  "MFS-BACKEND-02": { status: "fail", evidence: [ev("supabase/migrations/0001_init.sql", 2, "create table transactions (...) -- RLS never enabled"), ev("supabase/migrations/0001_init.sql", 5, 'create policy "profiles readable" on profiles for select using (true);')] },
  "MFS-BACKEND-04": { status: "fail", evidence: [ev("src/screens/Admin.tsx", 4, 'if (user.role === "admin") {')], note: "Admin list is gated only in the app; with RLS using(true) any user can read all profiles." },
  "MFS-BACKEND-05": { status: "not_applicable" },
  "MFS-BACKEND-08": { status: "fail", evidence: [ev("src/lib/ai.ts", 6, 'const res = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: text }] });')], note: "OpenAI is called straight from the app with no per-user limit." },
  "MFS-STORAGE-01": { status: "fail", evidence: [ev("src/lib/auth.ts", 9, 'await AsyncStorage.setItem("access_token", data.session!.access_token);\nawait AsyncStorage.setItem("refresh_token", data.session!.refresh_token);')] },
  "MFS-STORAGE-02": { status: "not_applicable" },
  "MFS-STORAGE-03": { status: "fail", evidence: [ev("src/lib/auth.ts", 8, 'console.log("login ok", data.session);')] },
  "MFS-STORAGE-05": { status: "not_applicable" },
  "MFS-STORAGE-04": { status: "fail", evidence: [ev("app.json", 6, '"android": { ... } // allowBackup not set (Expo default true)')] },
  "MFS-NETWORK-01": { status: "fail", evidence: [ev("src/lib/api.ts", 3, 'axios.create({ baseURL: "http://api.payflow-demo.com/v1" })'), ev("app.json", 13, '"NSAppTransportSecurity": { "NSAllowsArbitraryLoads": true }')] },
  "MFS-NETWORK-02": { status: "pass" },
  "MFS-NETWORK-03": { status: "fail", evidence: [ev("src/lib/api.ts", 3, "API client with no pinning; payments app")] },
  "MFS-AUTH-01": { status: "not_applicable" },
  "MFS-AUTH-02": { status: "pass" },
  "MFS-AUTH-03": { status: "fail", evidence: [ev("src/lib/auth.ts", 14, 'export async function logout() {\n  router.replace("/login");\n}')] },
  "MFS-AUTH-04": { status: "fail", evidence: [ev("src/lib/api.ts", 5, 'export const sendMoney = (to, amount) => api.post("/transfers", { to, amount });')] },
  "MFS-CRYPTO-01": { status: "not_applicable" },
  "MFS-CRYPTO-02": { status: "fail", evidence: [ev("src/lib/auth.ts", 19, "return Math.random().toString(36).slice(2, 8).toUpperCase();")] },
  "MFS-PLATFORM-01": { status: "pass", note: "Expo-managed; no custom exported components declared." },
  "MFS-PLATFORM-02": { status: "fail", evidence: [ev("src/screens/Help.tsx", 6, "const { url } = useLocalSearchParams<{ url: string }>();")], note: "payflow://help?url=… opens any URL inside the app." },
  "MFS-PLATFORM-03": { status: "fail", evidence: [ev("src/screens/Help.tsx", 10, 'originWhitelist={["*"]}\nonMessage={(e) => { ... if (msg.type === "pay") sendMoney(msg.to, msg.amount); }}')] },
  "MFS-PLATFORM-04": { status: "fail", evidence: [ev("src/screens/Login.tsx", 4, '<TextInput placeholder="Password" value={props.value} onChangeText={props.onChangeText} />')] },
  "MFS-AI-01": { status: "pass", note: "AI reply is shown as plain text." },
  "MFS-AI-02": { status: "not_applicable" },
  "MFS-AI-03": { status: "not_applicable" },
  "MFS-CODE-07": { status: "fail", evidence: [ev("package.json", 1, "No lockfile committed (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lock)")] },
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

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const post = (path, body) =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

// Sign up with an emailed code: name, company, email → code → session cookie → dashboard with the personal MCP URL.
const MAIL = process.env.MAIL_URL || "http://localhost:8787"; // Resend stand-in in scripts/mock-osv.mjs
const codeFor = async (to) => (await (await fetch(`${MAIL}/_mail?to=${encodeURIComponent(to)}`)).json()).subject.match(/^(\d{6})/)[1];
const email = `founder+${Date.now()}@example.com`;
let r = await post("/api/auth/start", { mode: "signup", name: "Priya Founder", company: "PayFlow Inc", email });
assert.equal(r.status, 200, await r.clone().text());
assert.equal((await post("/api/auth/start", { mode: "signup", name: "Priya Founder", email })).status, 429, "resend within 30s is throttled");
const code = await codeFor(email);
assert.equal((await post("/api/auth/verify", { email, code: code === "000000" ? "111111" : "000000" })).status, 400);
r = await post("/api/auth/verify", { email, code });
assert.equal(r.status, 200);
const cookie = r.headers.get("set-cookie").split(";")[0];
assert.match(r.headers.get("set-cookie"), /HttpOnly/);
assert.equal((await post("/api/auth/verify", { email, code })).status, 400, "a code works once");
const dashFetch = (c = cookie) => fetch(`${BASE}/dashboard`, { headers: c ? { cookie: c } : {}, redirect: "manual" });
const dash0 = await (await dashFetch()).text();
const token = dash0.match(/\/mcp\/(mfs_[A-Za-z0-9_-]{32})/)[1];
assert.equal((await dashFetch(null)).status, 307, "dashboard needs a session");
assert.equal((await post("/api/auth/start", { mode: "login", email: "nobody@example.com" })).status, 404);
assert.equal((await post("/api/auth/start", { mode: "signup", name: "", email: "x@example.com" })).status, 400);
assert.equal((await post("/api/auth/start", { mode: "signup", name: "Bot", email: "bot@example.com", website: "spam" })).status, 400);
ok("sign-up by emailed code; wrong, reused and throttled codes rejected; dashboard needs a session");

// The shared URL still connects, but asks for a personal URL instead of starting an audit.
const anon = new Client({ name: "e2e-anon", version: "1.0.0" });
await anon.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`)));
const anonOut = (await anon.callTool({ name: "audit", arguments: { project_files: ["package.json"] } })).content[0].text;
assert.match(anonOut, /personal MCP URL/);
await anon.close();
const bad = new Client({ name: "e2e-bad", version: "1.0.0" });
await bad.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp/mfs_${"x".repeat(32)}`)));
assert.match((await bad.callTool({ name: "audit", arguments: { project_files: ["package.json"] } })).content[0].text, /isn't recognised/);
await bad.close();
ok("shared URL and unknown URLs point users to sign up");

const MCP = `${BASE}/mcp/${token}`;
const client = new Client({ name: "e2e-agent", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(MCP)));
console.log("Connected to", MCP.replace(token, "mfs_…"));

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
assert.equal(ruleIds.length, 45);
assert.ok(ruleIds.includes("MFS-AI-01") && /## \d+\. AI Features/.test(checklist));
assert.ok(checklist.includes("`**/*.{js,jsx,ts,tsx,mjs,cjs}`"), "brace globs must not be split");
assert.match(checklist, /Applies only to apps handling money, health or identity data/);
ok("45 checks incl. AI Features; globs intact; trust-level checks marked");

// Validation: bad submissions are rejected
const rejected = textOf(
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
assert.match(rejected, /Saved 0 results/);
assert.match(rejected, /MFS-STORAGE-01: a fail needs evidence/);
assert.match(rejected, /MFS-FAKE-99: not part of this audit/);
assert.match(rejected, /MFS-BACKEND-02: unable_to_check needs a note/);
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
assert.match(html, /react-native-secure-storage-pro@1\.0\.2/);
assert.match(html, /Not found on the public registry/);
assert.match(html, /Mobile Top 10 2024: M1 Improper Credential Usage/);
assert.match(html, /Launch level/);
ok("registry check flags the invented package; standards shown");

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

// Dashboard lists the report; admin can see the customer and switch the URL off and on.
const dash = await (await dashFetch()).text();
assert.match(dash, /Hi Priya/);
assert.ok(dash.includes(`/r/${reportId}`), "dashboard links the report");
assert.ok(dash.includes(`/mcp/${token}`), "dashboard shows the personal MCP URL");
ok("dashboard shows the personal URL and the report");

if (ADMIN_PASSWORD) {
  const auth = { authorization: "Basic " + Buffer.from(`admin:${ADMIN_PASSWORD}`).toString("base64") };
  assert.equal((await fetch(`${BASE}/admin`)).status, 401);
  assert.equal((await fetch(`${BASE}/admin`, { headers: { authorization: "Basic " + Buffer.from("admin:wrong").toString("base64") } })).status, 401);
  const admin = await (await fetch(`${BASE}/admin`, { headers: auth })).text();
  assert.ok(admin.includes(email) && admin.includes("PayFlow Inc"));
  const toggle = (id, action) =>
    fetch(`${BASE}/api/admin/accounts`, { method: "POST", headers: { ...auth, accept: "application/json" }, body: new URLSearchParams({ id, action }) });
  // Find this customer's account ID from the row that holds their email.
  const row = admin.slice(admin.indexOf(email));
  const id = row.match(/name="id" value="(acc_[^"]+)"/)[1];
  assert.ok((await (await fetch(`${BASE}/admin/${id}`, { headers: auth })).text()).includes(`/r/${reportId}`), "admin can view the customer's audits");
  assert.equal((await toggle(id, "disable")).status, 200);
  const off = textOf(await client.callTool({ name: "audit", arguments: { project_files: projectFiles } }));
  assert.match(off, /switched off/);
  assert.match(await (await dashFetch()).text(), /Account switched off/);
  assert.equal((await toggle(id, "enable")).status, 200);
  assert.match(textOf(await client.callTool({ name: "audit", arguments: { project_files: projectFiles, dependency_names: Object.keys(pkg.dependencies) } })), /Audit ID/);
  ok("admin is password-protected, lists customers, switches a URL off and on");
} else {
  console.log("  - admin checks skipped (set ADMIN_PASSWORD to run them)");
}

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

const out = await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { cookie }, redirect: "manual" });
assert.equal(out.status, 303);
assert.equal((await dashFetch()).status, 307, "signed-out session no longer opens the dashboard");
ok("sign-out ends the session");

await client.close();
console.log("\nAll checks passed. Report:", url);
