# MobileFirst Secure

A hosted MCP server that runs a security audit of a mobile app's **source code**, through the coding agent the founder already uses. The user types `audit`, their agent checks the code on their machine against the MobileFirst Secure rule engine, and the server turns the findings into a scored, founder-readable report with a private link.

- **Endpoint:** a personal URL per customer, `https://app-security.mobilefirst.in/mcp/<token>` (Streamable HTTP). Customers get it by entering name, company (optional) and email on the landing page.
- **Stacks:** React Native (incl. Expo), Flutter, native Android, native iOS. Supabase and Firebase backends are detected automatically.
- **Scope:** audit only. The audit never changes the user's code.

## How an audit runs

```
User types "audit" in Claude Code / Claude app / Codex / ChatGPT desktop / Cursor / VS Code
        │
        ▼
1. Agent lists marker files (package.json, pubspec.yaml, AndroidManifest.xml, Info.plist…)
   and dependency names  ──►  audit
2. Server detects the stack and returns the checklist for it (up to 46 checks):
   where to look, what to search for, what counts as fail or pass
3. Agent checks the code locally, one category at a time  ──►  submit_findings
   (status + file:line + snippet per check; the server rejects incomplete or evidence-less fails)
4. When every check has an answer, the server:
   masks any live secrets in snippets, checks dependencies against OSV.dev
   and the npm / pub.dev registries,
   scores, picks a verdict, saves the report
5. Agent shows the summary in chat: verdict, score, top 3 issues, report link
6. Report page: full findings with fix guidance, plus "Get these fixed by MobileFirst"
   and "Email me the report" email capture (your leads)
```

The codebase never leaves the user's machine. Only rule results, file paths, short evidence snippets (with secrets masked) and the dependency list are sent.

**Verdict:** any critical issue makes the verdict "Not safe to launch". If the worst issue is high, it's "Fix before launch". Otherwise it's "Safe to launch".
**Score:** the severity-weighted share of applicable checks passed. It's capped at 39 when there's a critical issue and at 74 when there's a high one.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (framework: Next.js, no build settings needed).
2. **Storage:** in the Vercel project, go to Storage → Marketplace → **Upstash for Redis** → Connect. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. Without it, the server falls back to in-memory storage, which only works for local development.
3. **Domain:** add `app-security.mobilefirst.in` under Settings → Domains, then create the CNAME record Vercel shows you at your DNS provider.
4. Set the environment variables below and redeploy.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Yes (prod) | Upstash Redis, added by the Marketplace integration. Prefixed names (`<PREFIX>_KV_REST_API_URL`) and `UPSTASH_REDIS_REST_URL`/`_TOKEN` also work. Without Redis on Vercel, audits are refused with a clear message: parallel requests hit different server instances, so in-memory storage loses audits. |
| `PUBLIC_BASE_URL` | No | Defaults to `https://app-security.mobilefirst.in`. Used to build report links. |
| `LEAD_WEBHOOK_URL` | Recommended | Every lead is POSTed here as JSON with a `text` field, so a Slack incoming webhook works as is. Zapier and Make work too. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Yes (prod) | Sends sign-in codes and the "Email me the report" email through Resend. `EMAIL_FROM` must use your verified Resend domain, e.g. `MobileFirst Secure <secure@mobilefirst.in>`. Without these, nobody can sign up or sign in. |
| `LEAD_NOTIFY_EMAIL` | No | Also email every lead to this address (needs Resend). |
| `REPORT_TTL_DAYS` | No | How long report links stay live. Default: 90. |
| `ADMIN_PASSWORD` | Yes (prod) | Password for `/admin` (HTTP basic auth, any username). Without it, the admin page returns 404. |
| `SUPPORT_EMAIL` | Recommended | Shown to customers whose URL has been switched off. |

All leads are also stored in the Redis list `leads`, which you can read in the Upstash console.

Check the deployment at `/api/health`: `{"ok":true,"storage":"redis"}` means audits are being stored correctly. A 503 with `"storage":"memory"` means Redis isn't connected.

## Accounts

The smallest setup that gives every customer a dashboard and gives MobileFirst control:

1. **Sign up** on the landing page: name, company (optional), email. A 6-digit code is emailed through Resend. The account is created only after the code is entered, so every account is a verified inbox. Signing up again with an existing email just signs that person in.
2. **Sign in** at `/login`: email, then a code. Codes expire after 10 minutes, allow 5 attempts, work once, and can be re-sent every 30 seconds. A session cookie (HttpOnly, 30 days) keeps the customer signed in.
3. **Dashboard** at `/dashboard`: the customer's personal MCP URL with setup steps for Claude Code, Claude, Codex, ChatGPT, Cursor and VS Code, plus every audit they've run with verdict, score and report link.
4. **Personal MCP URL**, `/mcp/<token>`. The token in the URL identifies the customer, so it works in every client, including ChatGPT and the Claude app, which can't send custom auth headers. Audits started through it are saved to the account.
5. The shared URL `/mcp` still connects, but `audit` replies with a link to sign up. Unknown or switched-off URLs get a clear message too.
6. **Admin** at `/admin` (password: `ADMIN_PASSWORD`): every customer with company, email, signup date, audit count and last audit, a view of each customer's audits, and **Switch off / Turn on** for their URL. Switching off takes effect on the next request.

Tokens are 192-bit random values looked up through a SHA-256 index; codes and sessions are stored hashed too. Report links stay unguessable and shareable, so founders can forward them to their developer.

## Connect a coding agent

Customers copy setup steps with their personal URL from their dashboard. The pattern, with `<URL>` = `https://app-security.mobilefirst.in/mcp/<token>`:

| Agent | Setup |
|---|---|
| Claude Code | `claude mcp add --transport http mobilefirst-secure <URL>` |
| Claude app (desktop, web) | Customize → Connectors → Add custom connector → paste the URL, no authentication. On Team and Enterprise plans an Owner adds it under Organization settings → Connectors (Add → Custom → Web), then members connect. Free plans allow one custom connector. Claude needs the code too: add the project folder in the desktop app (+ → Add folder) or connect the GitHub repo. |
| Codex (CLI, IDE extension) | `codex mcp add mobilefirst-secure --url <URL>` |
| ChatGPT | In the ChatGPT desktop app: Settings → MCP servers → Add server → Streamable HTTP → paste the URL, no authentication. ChatGPT chat on the web can't see a local codebase, so the desktop app (through Codex) is the path for code audits. |
| Cursor | `.cursor/mcp.json`: `{"mcpServers":{"mobilefirst-secure":{"url":"<URL>"}}}` |
| VS Code (Copilot) | `.vscode/mcp.json`: `{"servers":{"mobilefirst-secure":{"type":"http","url":"<URL>"}}}` |
| Others | Any MCP client that supports Streamable HTTP. |

In clients that show MCP prompts as slash commands, the `audit` prompt also appears. In Claude Code it's `/mcp__mobilefirst-secure__audit`. Typing plain "audit" works everywhere, because the server's instructions tell the agent to start the audit.

## Rule catalog (46 rules in 11 areas, version 2026.11.2)

Each rule maps to OWASP MASVS v2.1 and MASWE IDs (taken from the OWASP MASWE repository) plus CWE, and to the other public standards it covers: OWASP Mobile Top 10 2024, ASVS 5.0, API Security Top 10 2023, LLM Top 10 2025 and the Agentic Top 10 2026. Rules only run when they apply to the detected stack. For example, Firebase rules are skipped for a Supabase app.

Every rule has a level:

- **Launch** (23): every app, before it goes live.
- **Scale** (17): once real users and money depend on it.
- **Trust** (6): only apps handling money, health or identity data. The agent answers `not_applicable` for other apps.

| Area | Rules (severity, level) |
|---|---|
| Exposed Secrets | Secret keys shipped in the app (critical, Launch); AI provider called directly from the app (high, Launch); Signing keys or cloud credentials committed to the repo (medium, Scale); AI tool config files committed with tokens (high, Launch) |
| Backend Exposure | Supabase admin key inside the app (critical, Launch); Supabase tables open without row-level security (critical, Launch); Firebase database or storage open to everyone (critical, Launch); Server doesn't verify ownership or permissions (critical, Launch); Purchases unlocked without server verification (medium, Scale); No rate limits or spend caps on paid services (high, Launch) |
| Data Storage | Login tokens or personal data stored unencrypted (high, Launch); Sensitive files saved where other apps can read them (high, Launch); Sensitive data leaking into logs or URLs (medium, Scale); Private app data copied into device backups (medium, Trust); Local database not encrypted (medium, Trust) |
| Network Security | Unencrypted HTTP connections (high, Launch); Certificate checks switched off (critical, Launch); No certificate pinning for high-value traffic (low, Trust) |
| Authentication | Biometric lock can be bypassed (high, Launch); Insecure login flow or OAuth secret in the app (high, Launch); Logout leaves the session alive (medium, Scale); No re-check before sensitive account changes (low, Trust) |
| Cryptography | Encryption keys hardcoded in the code (high, Launch); Weak cryptography (medium, Scale) |
| Platform Interaction | Android components open to other apps (high, Launch); Deep links trigger actions without checks (high, Launch); WebView exposes app functions to web content (high, Launch); Sensitive data exposed on screen (medium, Scale) |
| AI Features | AI output used without safety checks (high, Launch); AI can be steered by content it reads (high, Scale); AI acts beyond the user's permissions (high, Scale) |
| Code Health | Libraries with known vulnerabilities (OSV severity, Launch); Outdated platform targets (medium, Scale); Test leftovers in the release app (high, Launch); Untrusted input reaches queries or code execution (medium, Scale); Code loaded after install isn't verified (medium, Scale); No way to force updates or switch features off remotely (medium, Scale); Fake, look-alike or unpinned packages (high, Launch) |
| Privacy | Permissions requested but not needed (medium, Scale); Apple privacy manifest missing or incomplete (medium, Scale); Tracking without user consent (medium, Scale); Personal data sent to analytics or crash tools (medium, Scale); No in-app account deletion (medium, Scale) |
| Tamper Resistance | Debug features enabled in release builds (high, Launch); App code ships readable (low, Trust); No protection against tampered apps or devices (low, Trust) |

Two checks get help from the server. MFS-CODE-01 sends dependencies to OSV.dev for known vulnerabilities. MFS-CODE-07 adds a public registry lookup (npm, pub.dev) to the agent's lockfile result: packages that don't exist (often invented by AI coding tools) or that almost nobody downloads get flagged.

Rules live in `lib/rules/`. To add one, add an object to the right file and give it a level and standards in `lib/rules/meta.ts`. The catalog refuses to load if a rule ID is duplicated, a rule has no meta entry, or a title contains "and" or "&". Platform thresholds (Android target SDK 36, which Google Play has required since 31 Aug 2026; min SDK 24; iOS 15) are in `lib/rules/globs.ts`. Update them each year.

## Local development

```bash
npm install
npm run dev                      # http://localhost:3000, MCP at /mcp
```

To run the end-to-end test, which plays the coding agent against an insecure Expo + Supabase sample app in `test-fixtures/`:

```bash
node scripts/mock-osv.mjs &           # local stand-in for api.osv.dev, npm, pub.dev and Resend
npm run build
PUBLIC_BASE_URL=http://localhost:3000 ADMIN_PASSWORD=test OSV_API_URL=http://localhost:8787 \
  NPM_REGISTRY_URL=http://localhost:8787/npm NPM_DOWNLOADS_URL=http://localhost:8787/downloads \
  PUB_API_URL=http://localhost:8787/pub npx next start &
MFS_URL=http://localhost:3000 ADMIN_PASSWORD=test npm run test:e2e
```

To test the Redis code path too, run `node scripts/mock-upstash.mjs &` (a local stand-in for the Upstash REST API) and start the server with `KV_REST_API_URL=http://localhost:8788 KV_REST_API_TOKEN=test`. Run this whenever `lib/store.ts` changes.

The test covers: sign-up by emailed code (wrong, reused and throttled codes, invalid and bot sign-ups), sessions and sign-out, the shared and unknown URLs pointing users to sign up, tool and prompt discovery, stack detection, rejection of invalid submissions, category-by-category submission, server-side secret masking, dependency CVEs, the registry check for invented packages, the report page, lead capture, the dashboard, the admin page (password, customer list, switching a URL off and on), parallel submissions, and the fallback when OSV is unreachable.

## Project layout

```
app/mcp/route.ts        Shared MCP endpoint: asks users to get their personal URL
app/mcp/[token]/        Personal MCP endpoint (mcp-handler, MCP SDK v2)
app/dashboard/          Customer dashboard (signed in): MCP URL setup + audit list
app/login/              Sign in by emailed code
app/api/auth/           Send code, verify code, sign out
app/admin/              Admin: customers, their audits, switch URLs off and on
middleware.ts           Basic auth for /admin
app/r/[id]/             Report page with lead forms
app/api/lead/route.ts   Lead capture, webhook, Resend email
app/page.tsx            Minimal landing page with the sign-up form
lib/rules/              Rule catalog; meta.ts holds levels and standards
lib/detect.ts           Stack detection
lib/checklist.ts        Checklist + agent instructions
lib/mcp.ts              audit / submit_findings tools, audit prompt
lib/report.ts           Scoring, verdict, chat summary
lib/osv.ts              Dependency vulnerability lookup (OSV.dev, free)
lib/registry.ts         Invented or rarely used package lookup (npm, pub.dev, free)
lib/mask.ts             Secret masking for evidence snippets
lib/accounts.ts         Accounts, tokens, per-account audit list
lib/auth.ts             Email codes and sessions
lib/email.ts            Resend
lib/store.ts            Upstash Redis (or in-memory for dev)
```

## Deferred for later

- **Report link privacy:** links are unguessable (128-bit random IDs) and expire after `REPORT_TTL_DAYS`. Owner-only access is not built yet.
- **Regenerating a leaked URL** from the dashboard.
- **Abuse limits:** any URL can be switched off from `/admin`, and codes are throttled to one per email every 30 seconds, but there are no per-account audit limits or per-IP limits yet. Vercel's Firewall rate-limit rules are the quickest option for `/api/auth/start` when needed.
- **Re-audit comparison**, for the ongoing protection tier.
