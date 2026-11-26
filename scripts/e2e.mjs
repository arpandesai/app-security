// End-to-end test: plays the role of the coding agent against a running server.
// Usage: MFS_URL=http://localhost:3000 node scripts/e2e.mjs
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import assert from "node:assert/strict";

const BASE = process.env.MFS_URL || "http://localhost:3000";
const FIXTURE = new URL("../test-fixtures/payflow-expo/", import.meta.url).pathname;
const WEB_FIXTURE = new URL("../test-fixtures/linkboard-next/", import.meta.url).pathname;
const SERVER_FIXTURE = new URL("../test-fixtures/payflow-api/", import.meta.url).pathname;
const MARKERS = /^(package\.json|app\.json|app\.config\.(js|ts)|next\.config\.(js|mjs|ts)|vite\.config\.(js|mjs|ts)|pubspec\.yaml|AndroidManifest\.xml|build\.gradle(\.kts)?|Info\.plist|Podfile|Package\.swift|google-services\.json|GoogleService-Info\.plist|firebase\.json|firestore\.rules|config\.toml)$/;

function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "Pods", "build", ".git", ".next"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "migrations" || name.endsWith(".xcodeproj")) out.push(relative(root, p));
      walk(p, root, out);
    } else if (MARKERS.test(name)) out.push(relative(root, p));
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
const webPkg = JSON.parse(readFileSync(join(WEB_FIXTURE, "package.json"), "utf8"));
const serverPkg = JSON.parse(readFileSync(join(SERVER_FIXTURE, "package.json"), "utf8"));

// Ground truth for the server fixture (the PayFlow app's Express server, in its own project).
const SERVER_TRUTH = {
  "MFS-SECRETS-04": { status: "fail", evidence: [ev(".env", 3, "OPENAI_API_KEY=sk-proj-TESTONLYserverabcdefghijklmnopqrstuv0123")] },
  "MFS-BACKEND-04": { status: "fail", evidence: [ev("src/routes/users.js", 11, 'const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);')] },
  "MFS-BACKEND-09": { status: "fail", evidence: [ev("src/index.js", 7, "app.use(cors({ origin: true, credentials: true }));")] },
  "MFS-BACKEND-10": { status: "fail", evidence: [ev("src/index.js", 13, "const page = await require(\"axios\").get(req.query.url);")] },
  "MFS-BACKEND-11": { status: "fail", evidence: [ev("src/routes/users.js", 16, "const user = await db.users.update(req.params.id, req.body);")] },
  "MFS-BACKEND-12": { status: "fail", evidence: [ev("src/routes/users.js", 7, "res.json(rows[0]);")] },
  "MFS-AUTH-07": { status: "fail", evidence: [ev("src/auth.js", 5, "req.user = jwt.decode(token);")] },
  "MFS-AUTH-08": { status: "fail", evidence: [ev("src/routes/users.js", 5, 'router.post("/login", async (req, res) => {')] },
  "MFS-CODE-08": { status: "fail", evidence: [ev("src/routes/users.js", 6, "db.query(\"SELECT * FROM users WHERE email = '\" + req.body.email + \"'\")")] },
  "MFS-CODE-09": { status: "fail", evidence: [ev("src/routes/files.js", 4, 'const upload = multer({ dest: "public/uploads" });')] },
  "MFS-RESILIENCE-01": { status: "fail", evidence: [ev("src/index.js", 18, "res.status(500).json({ error: err.message, stack: err.stack });")] },
  "MFS-AUTH-05": { status: "not_applicable", note: "Bearer tokens only." },
  "MFS-AUTH-06": { status: "not_applicable", note: "Bearer tokens only." },
  "MFS-PLATFORM-05": { status: "not_applicable", note: "JSON API." },
  "MFS-BACKEND-05": { status: "not_applicable" },
  "MFS-AI-01": { status: "not_applicable" },
  "MFS-AI-02": { status: "not_applicable" },
  "MFS-AI-03": { status: "not_applicable" },
};

// Ground truth for the web fixture (Next.js with Supabase).
const WEB_TRUTH = {
  "MFS-SECRETS-01": { status: "fail", evidence: [ev(".env", 3, "NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-TESTONLYwebabcdefghijklmnopqrstuvwxyz0123")] },
  "MFS-SECRETS-02": { status: "fail", evidence: [ev("lib/ai.ts", 4, "new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, dangerouslyAllowBrowser: true })")] },
  "MFS-BACKEND-02": { status: "fail", evidence: [ev("supabase/migrations/0001_init.sql", 1, "create table public.posts ( — no enable row level security")] },
  "MFS-BACKEND-04": { status: "fail", evidence: [ev("app/api/posts/[id]/route.ts", 5, 'await supabase.from("posts").delete().eq("id", id);')] },
  "MFS-BACKEND-10": { status: "fail", evidence: [ev("app/api/preview/route.ts", 3, "const page = await fetch(url);"), ev("next.config.mjs", 4, 'images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },')] },
  "MFS-PLATFORM-05": { status: "fail", evidence: [ev("app/components/Post.tsx", 7, "<div dangerouslySetInnerHTML={{ __html: post.body_html }} />")] },
  "MFS-PLATFORM-06": { status: "fail", evidence: [ev("next.config.mjs", 2, "const nextConfig = { — no headers()")] },
  "MFS-PLATFORM-07": { status: "fail", evidence: [ev("app/auth/callback/route.ts", 5, "return NextResponse.redirect(next);")] },
  "MFS-RESILIENCE-02": { status: "not_applicable", note: "Link-sharing site; no money, health or identity data." },
  "MFS-AI-02": { status: "not_applicable" },
  "MFS-AI-03": { status: "not_applicable" },
};

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
const dashFetch = (c = cookie, path = "/dashboard") => fetch(`${BASE}${path}`, { headers: c ? { cookie: c } : {}, redirect: "manual" });
const page = async (path, c = cookie) => (await dashFetch(c, path)).text();
const dash0 = await page("/dashboard");
assert.match(dash0, /Get your first report/);
assert.match(dash0, /go\/book\?from=onboarding/);
const setup0 = await page("/dashboard/setup");
const token = setup0.match(/\/mcp\/(mfs_[A-Za-z0-9_-]{32})/)[1];
assert.match(setup0, /Need help setting up\?/);
assert.match(setup0, /go\/book\?from=setup/);
for (const path of ["/dashboard/audits", "/dashboard/setup", "/dashboard/account", "/dashboard/reports/AAAAAAAAAAAAAAAAAAAAAA"]) {
  assert.equal((await dashFetch(null, path)).status, 307, `${path} needs a session`);
}
assert.equal((await dashFetch(null)).status, 307, "dashboard needs a session");
assert.equal((await post("/api/auth/start", { mode: "login", email: "nobody@example.com" })).status, 404);
assert.equal((await post("/api/auth/start", { mode: "signup", email: "not-an-email" })).status, 400);
// The landing page sends email only: that must work end to end too.
const solo = `solo+${Date.now()}@example.com`;
assert.equal((await post("/api/auth/start", { mode: "signup", email: solo })).status, 200);
const soloRes = await post("/api/auth/verify", { email: solo, code: await codeFor(solo) });
assert.equal(soloRes.status, 200);
const soloCookie = soloRes.headers.get("set-cookie").split(";")[0];
assert.match(await page("/dashboard", soloCookie), /Welcome/);
assert.match(await page("/dashboard/setup", soloCookie), /\/mcp\/mfs_/);
assert.equal((await post("/api/auth/start", { mode: "signup", name: "Bot", email: "bot@example.com", website: "spam" })).status, 400);
ok("sign-up by emailed code (with or without name); wrong, reused and throttled codes rejected; panel pages need a session");

// The shared URL still connects, but asks for a personal URL instead of starting an audit.
const anon = new Client({ name: "e2e-anon", version: "1.0.0" });
await anon.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`)));
const anonOut = (await anon.callTool({ name: "audit", arguments: { project_files: ["package.json"] } })).content[0].text;
assert.match(anonOut, /personal MCP URL/);
assert.match(anonOut, /Book a call with MobileFirst: \S+\/go\/book\?from=mcp-setup/);
await anon.close();
const bad = new Client({ name: "e2e-bad", version: "1.0.0" });
await bad.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp/mfs_${"x".repeat(32)}`)));
assert.match((await bad.callTool({ name: "audit", arguments: { project_files: ["package.json"] } })).content[0].text, /isn't recognised/);
await bad.close();
ok("shared URL and unknown URLs point users to sign up");

const MCP = `${BASE}/mcp/${token}`;
const client = new Client({ name: "e2e-agent", version: "1.0.0" });
const activity = async (c = cookie) => (await fetch(`${BASE}/api/activity`, { headers: c ? { cookie: c } : {} }));
assert.equal((await activity("")).status, 401, "live activity needs a session");
await client.connect(new StreamableHTTPClientTransport(new URL(MCP)));
const conn = (await (await activity()).json()).connection;
assert.equal(conn?.client, "e2e-agent", "the guide sees the agent connect with the personal URL");
ok("guide: agent connection detected from the MCP initialize");
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
assert.match(none, /No supported app found/);
ok("unsupported project handled");

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
assert.ok(final.includes(`/go/book?from=chat&r=${reportId}`), "chat summary offers a call to get it fixed");
assert.ok(final.includes("type audit there too"), "a mobile app without server code suggests auditing its server project");
const live = (await (await activity()).json()).audit;
assert.equal(live.appName, "PayFlow");
assert.equal(live.total, 45);
assert.equal(live.answered, 45);
assert.equal(live.reportId, reportId, "the guide shows the finished report");
const guide = await page("/dashboard/new-audit");
assert.match(guide, /Run a new audit/);
for (const tool of ["Claude Code", "Codex", "ChatGPT", "Claude", "Cursor", "VS Code"]) assert.ok(guide.includes(tool), `guide lists ${tool}`);
assert.ok(guide.includes(`/mcp/${token}`), "guide steps carry the personal MCP URL");
assert.ok(guide.includes("/go/book?from=new-audit"), "stuck on a step books a call");
assert.ok((await page("/dashboard/audits")).includes('href="/dashboard/new-audit"'), "Audits page has Run a new audit");
assert.ok((await page("/dashboard")).includes('href="/dashboard/new-audit"'), "Overview has Run a new audit");
ok("guide: audit progress and report ready; Run a new audit on Overview and Audits");

// Need help setting up? Request a call: signed-in only, validated, emailed to the team with context.
const callback = (body, c = cookie) =>
  fetch(`${BASE}/api/callback`, { method: "POST", headers: { "content-type": "application/json", ...(c ? { cookie: c } : {}) }, body: JSON.stringify(body) });
assert.equal((await callback({ name: "Priya", phone: "+14155550100" }, "")).status, 401, "call requests need a session");
assert.equal((await callback({ name: "Priya", phone: "call me" })).status, 400, "phone numbers are validated");
assert.equal((await callback({ name: "", phone: "+14155550100" })).status, 400, "a name is required");
const cb = await callback({ name: "Priya Shah", phone: "+1 (415) 555-0100", tool: "vscode", tz: "America/New_York", page: "/dashboard/new-audit" });
assert.equal(cb.status, 200);
assert.equal((await cb.json()).ok, true);
const callMail = await (await fetch(`${MAIL}/_mail?to=nishant@mobilefirst.in`)).json();
assert.match(callMail.subject, /Call now: Priya Shah needs setup help/);
for (const bit of ["+14155550100", "wa.me/14155550100", "VS Code", "PayFlow", "e2e-agent", "America/New_York"]) assert.ok(callMail.html.includes(bit), `call email includes ${bit}`);
assert.equal((await (await callback({ name: "Priya Shah", phone: "+14155550100" })).json()).already, true, "a second request within two minutes isn't sent again");
for (const path of ["/dashboard/new-audit", "/dashboard/setup"]) {
  const html = await page(path);
  assert.ok(html.includes("Need help setting up?") && html.includes("Request a call"), `${path} offers a call`);
  assert.ok(html.includes("Live now") && html.includes("Request a call and our engineer will call you soon."), `${path}: Live now, call soon`);
}
ok("call requests: validated, emailed to nishant@mobilefirst.in with tool, connection and audit");

// Idempotent: a repeat submit returns the same report
const again = textOf(await client.callTool({ name: "submit_findings", arguments: { audit_id: auditId, results: [] } }));
assert.ok(again.includes(url));
ok("repeat submit returns same report link");

// The report link is private: signed out, it shows a sign-in form and nothing about the report.
const gate = await (await fetch(`${BASE}/r/${reportId}`)).text();
assert.match(gate, /This security report is private/);
assert.ok(!gate.includes("PayFlow") && !gate.includes("Not safe to launch"), "signed-out visitors learn nothing about the report");
const ownerLink = await fetch(`${BASE}/r/${reportId}`, { headers: { cookie }, redirect: "manual" });
assert.equal(ownerLink.status, 307);
assert.ok(ownerLink.headers.get("location").endsWith(`/dashboard/reports/${reportId}`), "the owner goes straight to the report in the panel");
ok("report link is private: signed-out gate shows nothing, owner lands in the panel");

const html = await page(`/dashboard/reports/${reportId}`);
assert.match(html, /Not safe to launch/);
assert.ok(!html.includes("TESTONLYabcdefghij"), "live secret must be masked");
assert.match(html, /sk-pro••••/);
writeFileSync("/tmp/mfs-report.html", html);
ok("report page renders; secret masked server-side");
assert.match(html, /react-native-secure-storage-pro@1\.0\.2/);
assert.match(html, /Not found on the public registry/);
assert.match(html, /Mobile Top 10 2024: M1 Improper Credential Usage/);
assert.ok(!/Top 10 2025: A0/.test(html), "a mobile-only report doesn't list web standards");
assert.match(html, /Launch level/);
ok("registry check flags the invented package; standards shown");
assert.ok(html.includes(`/go/book?from=report&amp;r=${reportId}`), "report header: Get it fixed");
assert.ok(html.includes(`/go/book?from=finding&amp;r=${reportId}`), "each finding: Get this fixed");
assert.ok(html.includes(`/go/book?from=report-end&amp;r=${reportId}`), "end of report: Book a call");
const BOOKING = "https://calendar.google.com/calendar/u/0/appointments/schedules/";
const book = await fetch(`${BASE}/go/book?from=finding&r=${reportId}`, { headers: { cookie }, redirect: "manual" });
assert.equal(book.status, 302);
assert.ok(book.headers.get("location").startsWith(BOOKING), "redirects to the booking page");
const bookOdd = await fetch(`${BASE}/go/book?from=<script>&r=../../etc`, { redirect: "manual" });
assert.equal(bookOdd.status, 302, "unknown sources and bad report IDs still reach the booking page");
ok("every fix action books a call: header, each finding, end of report, chat; /go/book logs and redirects");

// A web app (Next.js with Supabase): web-only checks in, mobile-only checks out, web wording in the report.
const webStart = textOf(
  await client.callTool({
    name: "audit",
    arguments: {
      project_files: walk(WEB_FIXTURE),
      dependency_names: Object.keys(webPkg.dependencies),
      app_name: "Linkboard",
      app_description: "Link-sharing site",
      agent: "Codex",
    },
  })
);
const webId = webStart.match(/Audit ID: (\S+)/)[1];
const webRules = [...webStart.matchAll(/^### (MFS-[A-Z]+-\d+)/gm)].map((m) => m[1]);
assert.match(webStart, /Detected stack: Next\.js · Web · Supabase/);
assert.equal(webRules.length, 41);
for (const id of ["MFS-PLATFORM-05", "MFS-PLATFORM-06", "MFS-PLATFORM-07", "MFS-AUTH-05", "MFS-AUTH-06", "MFS-AUTH-07", "MFS-AUTH-08", "MFS-BACKEND-09", "MFS-BACKEND-10", "MFS-BACKEND-11", "MFS-BACKEND-12", "MFS-CODE-08", "MFS-CODE-09", "MFS-BACKEND-01", "MFS-BACKEND-02"])
  assert.ok(webRules.includes(id), `${id} runs on a web app`);
for (const id of ["MFS-STORAGE-02", "MFS-NETWORK-03", "MFS-PLATFORM-01", "MFS-PLATFORM-04", "MFS-CODE-06", "MFS-PRIVACY-05", "MFS-RESILIENCE-03", "MFS-BACKEND-03"])
  assert.ok(!webRules.includes(id), `${id} doesn't run on a Next.js app with Supabase`);
assert.match(webStart, /### MFS-SECRETS-01 · critical · Secret keys exposed to the browser/);
assert.ok(!/\.dart|Info\.plist|\.gradle|\{kt,java\}|pubspec|Podfile|Pods/.test(webStart), "no mobile file types or folders in a web checklist");
const webWording = webStart.split("\n").filter((l) => /^(### |Check: |Fail if: |Pass if: )/.test(l)).join("\n");
assert.ok(!/Keychain|Keystore|__DEV__|kDebugMode|release app|WebView/.test(webWording), "no mobile wording in a web checklist");
ok(`web app: ${webRules.length} checks, 8 web-only checks in, mobile-only checks out, web wording, no mobile globs`);

let webFinal = "";
for (const id of webRules) {
  if (id === "MFS-CODE-01") continue;
  const args = { audit_id: webId, results: [{ rule_id: id, ...(WEB_TRUTH[id] || { status: "pass" }) }] };
  if (id === "MFS-CODE-07") args.dependencies = Object.entries(webPkg.dependencies).map(([name, version]) => ({ ecosystem: "npm", name, version }));
  const out = textOf(await client.callTool({ name: "submit_findings", arguments: args }));
  if (out.includes("Full report")) webFinal = out;
}
if (!webFinal) webFinal = textOf(await client.callTool({ name: "submit_findings", arguments: { audit_id: webId, results: [] } }));
assert.match(webFinal, /Not safe to launch/);
assert.match(webFinal, /Secret keys exposed to the browser/);
const webReportId = webFinal.match(/Full report with fix guidance: \S+\/r\/(\S+)/)[1];
const webHtml = await page(`/dashboard/reports/${webReportId}`);
writeFileSync("/tmp/mfs-web-report.html", webHtml);
assert.match(webHtml, /Next\.js · Web · Supabase/);
assert.match(webHtml, /Secret keys exposed to the browser/);
assert.match(webHtml, /Unsafe HTML rendering/);
assert.match(webHtml, /Top 10 2025: A05 Injection/);
assert.ok(!webHtml.includes("Mobile Top 10"), "a web-only report doesn't list mobile standards");
assert.ok(!webHtml.includes("TESTONLYwebabcdefghij"), "live secret must be masked");
assert.ok(!webFinal.includes("type audit there too"), "a Next.js app carries its own server code: no server suggestion");
ok(`web report: ${webFinal.match(/Score (\d+)/)[1]}/100, web titles, web standards only, secret masked`);

// The app's Node.js server, in its own project: server checks only, server wording, grouped under the app.
const srvStart = textOf(
  await client.callTool({
    name: "audit",
    arguments: {
      project_files: walk(SERVER_FIXTURE),
      dependency_names: Object.keys(serverPkg.dependencies),
      app_name: "PayFlow API",
      app_description: "API for the PayFlow app",
      agent: "Claude Code",
    },
  })
);
const srvId = srvStart.match(/Audit ID: (\S+)/)[1];
const srvRules = [...srvStart.matchAll(/^### (MFS-[A-Z]+-\d+)/gm)].map((m) => m[1]);
assert.match(srvStart, /Detected stack: Node\.js \(Express\) · Server/);
assert.equal(srvRules.length, 34);
for (const id of ["MFS-SECRETS-04", "MFS-BACKEND-04", "MFS-BACKEND-09", "MFS-BACKEND-10", "MFS-BACKEND-11", "MFS-BACKEND-12", "MFS-AUTH-07", "MFS-AUTH-08", "MFS-CODE-08", "MFS-CODE-09", "MFS-RESILIENCE-01"])
  assert.ok(srvRules.includes(id), `${id} runs on a Node.js server`);
for (const id of ["MFS-SECRETS-01", "MFS-SECRETS-02", "MFS-BACKEND-01", "MFS-STORAGE-01", "MFS-STORAGE-02", "MFS-PLATFORM-01", "MFS-RESILIENCE-02", "MFS-PRIVACY-03", "MFS-PRIVACY-05", "MFS-CODE-06"])
  assert.ok(!srvRules.includes(id), `${id} doesn't run on a server`);
assert.match(srvStart, /### MFS-SECRETS-04 · medium · Secrets committed to the repo/);
assert.ok(!/\.dart|Info\.plist|\.gradle|\{kt,java\}|pubspec|Podfile|Pods/.test(srvStart), "no mobile file types or folders in a server checklist");
ok(`server: ${srvRules.length} checks, server-side checks in, app-only checks out, server wording`);

let srvFinal = "";
for (const id of srvRules) {
  if (id === "MFS-CODE-01") continue;
  const args = { audit_id: srvId, results: [{ rule_id: id, ...(SERVER_TRUTH[id] || { status: "pass" }) }] };
  if (id === "MFS-CODE-07") args.dependencies = Object.entries(serverPkg.dependencies).map(([name, version]) => ({ ecosystem: "npm", name, version }));
  const out = textOf(await client.callTool({ name: "submit_findings", arguments: args }));
  if (out.includes("Full report")) srvFinal = out;
}
if (!srvFinal) srvFinal = textOf(await client.callTool({ name: "submit_findings", arguments: { audit_id: srvId, results: [] } }));
assert.match(srvFinal, /Not safe to launch/);
assert.ok(!srvFinal.includes("type audit there too"), "no server suggestion on a server audit");
const srvReportId = srvFinal.match(/Full report with fix guidance: \S+\/r\/(\S+)/)[1];
const srvHtml = await page(`/dashboard/reports/${srvReportId}`);
assert.match(srvHtml, /Node\.js \(Express\) · Server/);
assert.match(srvHtml, /Request data saved straight to the database/);
assert.match(srvHtml, /Login tokens not verified properly/);
assert.match(srvHtml, /Top 10 2025: A07 Authentication Failures/);
assert.ok(!srvHtml.includes("Mobile Top 10"), "a server report doesn't list mobile standards");
assert.ok(!srvHtml.includes("TESTONLYserverabcdefghij"), "live secret must be masked");
const overview = await page("/dashboard");
const payflowCard = overview.slice(overview.indexOf("<h3>PayFlow</h3>"), overview.indexOf("</article>", overview.indexOf("<h3>PayFlow</h3>")));
assert.ok(payflowCard.includes("<b>App</b>") && payflowCard.includes("<b>Server</b>"), "the server report sits under the PayFlow app card");
assert.ok(payflowCard.includes(`/dashboard/reports/${srvReportId}`), "the app card opens the server report");
assert.ok(!overview.includes("<h3>PayFlow API</h3>"), "no separate card for the server");
ok(`server report: ${srvFinal.match(/Score (\d+)/)[1]}/100, server wording, web standards, grouped under the PayFlow app`);

// Invite a reviewer: they get an email, sign up with that address, return to the report, and can read it.
const reviewers = (body, c = cookie, headers = {}) =>
  fetch(`${BASE}/api/reports/${reportId}/reviewers`, { method: "POST", headers: { cookie: c, ...headers }, body: new URLSearchParams(body), redirect: "manual" });
const dev = `dev+${Date.now()}@example.com`;
let inv = await reviewers({ action: "invite", email: dev.toUpperCase() });
assert.equal(inv.status, 303);
assert.match(inv.headers.get("location"), /invited=.*emailed=1/);
const invite = await (await fetch(`${MAIL}/_mail?to=${encodeURIComponent(dev)}`)).json();
assert.match(invite.subject, /shared a security report with you/);
assert.match(await page(`/dashboard/reports/${reportId}`), new RegExp(dev.replace(/[.+]/g, "\\$&")), "owner sees the reviewer");
assert.match((await reviewers({ action: "invite", email: "nope" })).headers.get("location"), /error=/);
assert.match((await reviewers({ action: "invite", email })).headers.get("location"), /error=/, "can't invite yourself");
assert.equal((await reviewers({ action: "invite", email: "x@example.com" }, cookie, { origin: "https://evil.example" })).status, 403);
assert.equal((await reviewers({ action: "invite", email: "x@example.com" }, soloCookie)).status, 404, "only the owner can invite");

// The invitee signs up from the report link and lands back on it.
assert.equal((await post("/api/auth/start", { mode: "signup", email: dev })).status, 200);
const devVerify = await post("/api/auth/verify", { email: dev, code: await codeFor(dev), next: `/r/${reportId}` });
assert.equal((await devVerify.clone().json()).redirect, `/r/${reportId}`, "sign-in returns to the report");
const devCookie = devVerify.headers.get("set-cookie").split(";")[0];
const devLink = await fetch(`${BASE}/r/${reportId}`, { headers: { cookie: devCookie }, redirect: "manual" });
assert.ok(devLink.headers.get("location").endsWith(`/dashboard/reports/${reportId}`));
const devView = await page(`/dashboard/reports/${reportId}`, devCookie);
assert.match(devView, /Shared with you by Priya Founder, PayFlow Inc/);
assert.match(devView, /Not safe to launch/);
assert.ok(!devView.includes(`/api/reports/${reportId}/reviewers`), "reviewers can't manage access");
assert.ok((await page("/dashboard", devCookie)).includes(`/dashboard/reports/${reportId}`), "Shared with you on the overview");
assert.match(await page("/dashboard/audits", devCookie), /Shared with you/);
assert.equal((await reviewers({ action: "remove", email: email }, devCookie)).status, 404, "a reviewer can't change access");

// Someone signed in but not invited gets no access; a redirect after sign-in can't leave the site.
const soloLink = await (await fetch(`${BASE}/r/${reportId}`, { headers: { cookie: soloCookie } })).text();
assert.match(soloLink, /You don(&#x27;|')t have access to this report/);
assert.ok(!soloLink.includes("PayFlow"));
for (const next of ["//evil.example", "https://evil.example", "/\\evil.example"]) {
  const who = `n${Math.random().toString(36).slice(2)}@example.com`;
  await post("/api/auth/start", { mode: "signup", email: who });
  assert.equal((await (await post("/api/auth/verify", { email: who, code: await codeFor(who), next })).json()).redirect, "/dashboard", `blocks ${next}`);
}

// Removing the reviewer ends their access immediately.
inv = await reviewers({ action: "remove", email: dev });
assert.match(inv.headers.get("location"), /removed=/);
assert.match(await page(`/dashboard/reports/${reportId}`, devCookie), /Report not found/);
assert.ok(!(await page("/dashboard", devCookie)).includes(`/dashboard/reports/${reportId}`));
ok("reviewer invites: email sent, invitee signs up and returns to the report, owner-only control, removal ends access, no open redirect");

// The panel: overview card per app, audits list, owner-only report view, account edits.
const dash = await page("/dashboard");
assert.match(dash, /Hi Priya/);
assert.match(dash, /PayFlow/);
assert.ok(dash.includes(`/dashboard/reports/${reportId}`), "overview opens the report in the panel");
assert.ok(dash.includes(`/go/book?from=app&amp;r=${reportId}`), "app card: Get it fixed");
assert.ok((await page("/dashboard/audits")).includes(`/dashboard/reports/${reportId}`), "audits page lists the report");
const inPanel = await page(`/dashboard/reports/${reportId}`);
assert.match(inPanel, /Not safe to launch/);
assert.match(inPanel, /Invite reviewers/);
assert.ok(!inPanel.includes("TESTONLYabcdefghij"), "secret masked in the panel too");
assert.match(await page(`/dashboard/reports/${reportId}`, soloCookie), /Report not found/, "another account can't open it in the panel");
assert.ok((await page("/dashboard/setup")).includes(`/mcp/${token}`), "setup shows the personal MCP URL");
const save = (body, headers = {}) =>
  fetch(`${BASE}/api/account`, { method: "POST", headers: { cookie, ...headers }, body: new URLSearchParams(body), redirect: "manual" });
const saved = await save({ name: "Priya Shah", company: "PayFlow Labs" });
assert.equal(saved.status, 303);
assert.match(saved.headers.get("location"), /saved=1/);
const acct = await page("/dashboard/account");
assert.ok(acct.includes("Priya Shah") && acct.includes("PayFlow Labs") && acct.includes(email));
assert.match((await save({ name: "x".repeat(81) })).headers.get("location"), /error=1/);
assert.equal((await save({ name: "Mallory" }, { origin: "https://evil.example" })).status, 403, "cross-site form posts are refused");
ok("panel: app card with Get it fixed, audits list, owner-only report view, setup, account edits");

if (ADMIN_PASSWORD) {
  const auth = { authorization: "Basic " + Buffer.from(`admin:${ADMIN_PASSWORD}`).toString("base64") };
  assert.equal((await fetch(`${BASE}/admin`)).status, 401);
  assert.equal((await fetch(`${BASE}/admin`, { headers: { authorization: "Basic " + Buffer.from("admin:wrong").toString("base64") } })).status, 401);
  const admin = await (await fetch(`${BASE}/admin`, { headers: auth })).text();
  assert.ok(admin.includes(email) && admin.includes("PayFlow Labs"));
  const toggle = (id, action) =>
    fetch(`${BASE}/api/admin/accounts`, { method: "POST", headers: { ...auth, accept: "application/json" }, body: new URLSearchParams({ id, action }) });
  // Find this customer's account ID from the row that holds their email.
  const row = admin.slice(admin.indexOf(email));
  const id = row.match(/name="id" value="(acc_[^"]+)"/)[1];
  assert.ok((await (await fetch(`${BASE}/admin/${id}`, { headers: auth })).text()).includes(`/admin/reports/${reportId}`), "admin can view the customer's audits");
  const adminReport = await (await fetch(`${BASE}/admin/reports/${reportId}`, { headers: auth })).text();
  assert.match(adminReport, /Not safe to launch/);
  assert.ok(adminReport.includes(email), "admin sees the report's owner");
  assert.equal((await fetch(`${BASE}/admin/reports/${reportId}`)).status, 401, "admin report view needs the password");
  assert.equal((await toggle(id, "disable")).status, 200);
  const off = textOf(await client.callTool({ name: "audit", arguments: { project_files: projectFiles } }));
  assert.match(off, /switched off/);
  const offDash = await page("/dashboard");
  assert.match(offDash, /Your account is switched off/);
  assert.match(offDash, /go\/book\?from=switched-off/);
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

// The Framework page is served at /framework, linked from the landing page, and matches the live ruleset.
const home = await (await fetch(`${BASE}/`)).text();
assert.ok(home.includes('href="/framework"'), "landing page links to the Framework page");
const fw = await fetch(`${BASE}/framework`);
assert.equal(fw.status, 200);
const fwHtml = await fw.text();
const { ruleset } = await (await fetch(`${BASE}/api/health`)).json();
assert.ok(fwHtml.includes(`version ${ruleset}`), `Framework page is out of date: rebuild it with npm run framework (ruleset ${ruleset})`);
assert.match(fwHtml, /src="\/framework\.png"/);
assert.equal((await fetch(`${BASE}/framework.png`)).headers.get("content-type"), "image/png");
ok("Framework page at /framework with its image, linked from the landing page");

const health = await (await fetch(`${BASE}/api/health`)).json();
assert.equal(health.ok, true);
ok(`health: storage=${health.storage}`);

const missing = await fetch(`${BASE}/r/AAAAAAAAAAAAAAAAAAAAAA`);
assert.match(await missing.text(), /This security report is private/, "unknown reports look the same as real ones");
assert.match(await page("/dashboard/reports/AAAAAAAAAAAAAAAAAAAAAA"), /Report not found/);
ok("unknown report: same gate signed out, not found in the panel");

const out = await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { cookie }, redirect: "manual" });
assert.equal(out.status, 303);
assert.equal((await dashFetch()).status, 307, "signed-out session no longer opens the dashboard");
ok("sign-out ends the session");

await client.close();
console.log("\nAll checks passed. Report:", url);
