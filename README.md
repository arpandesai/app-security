# MobileFirst Secure

A hosted MCP server that runs a security audit of a mobile app's **source code**, through the coding agent the founder already uses. The user types `audit`, their agent checks the code on their machine against the MobileFirst Secure rule engine, and the server turns the findings into a scored, founder-readable report with a private link.

- **Endpoint:** `https://app-security.mobilefirst.in/mcp` (Streamable HTTP, no sign-in)
- **Stacks:** React Native (incl. Expo), Flutter, native Android, native iOS. Supabase and Firebase backends are detected automatically.
- **Scope:** audit only. The audit never changes the user's code.

## How an audit runs

```
User types "audit" in Claude Code / Claude app / Codex / ChatGPT desktop / Cursor / VS Code
        │
        ▼
1. Agent lists marker files (package.json, pubspec.yaml, AndroidManifest.xml, Info.plist…)
   and dependency names  ──►  audit
2. Server detects the stack and returns the checklist for it (~46 checks):
   where to look, what to search for, what counts as fail or pass
3. Agent checks the code locally, one category at a time  ──►  submit_findings
   (status + file:line + snippet per check; the server rejects incomplete or evidence-less fails)
4. When every check has an answer, the server:
   masks any live secrets in snippets, checks dependencies against OSV.dev,
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
| `RESEND_API_KEY`, `EMAIL_FROM` | Recommended | Sends the "Email me the report" email through Resend. Example: `EMAIL_FROM="MobileFirst Secure <secure@mobilefirst.in>"`. Without these, emails are saved as leads and the user can save a PDF instead. |
| `LEAD_NOTIFY_EMAIL` | No | Also email every lead to this address (needs Resend). |
| `REPORT_TTL_DAYS` | No | How long report links stay live. Default: 90. |

All leads are also stored in the Redis list `leads`, which you can read in the Upstash console.

Check the deployment at `/api/health`: `{"ok":true,"storage":"redis"}` means audits are being stored correctly. A 503 with `"storage":"memory"` means Redis isn't connected.

## Connect a coding agent

Each agent needs one setup step, then the user types `audit` in their project.

| Agent | Setup |
|---|---|
| Claude Code | `claude mcp add --transport http mobilefirst-secure https://app-security.mobilefirst.in/mcp` |
| Claude app (desktop, web) | Customize → Connectors → Add custom connector → paste the URL. On Team and Enterprise plans an Owner adds it under Organization settings → Connectors (Add → Custom → Web), then members connect. Free plans allow one custom connector. Claude needs the code too: add the project folder in the desktop app (+ → Add folder) or connect the GitHub repo. |
| Codex (CLI, IDE extension) | `codex mcp add mobilefirst-secure --url https://app-security.mobilefirst.in/mcp` |
| ChatGPT | In the ChatGPT desktop app: Settings → MCP servers → Add server → Streamable HTTP → paste the URL. ChatGPT chat on the web can't see a local codebase, so the desktop app (through Codex) is the path for code audits. |
| Cursor | `.cursor/mcp.json`: `{"mcpServers":{"mobilefirst-secure":{"url":"https://app-security.mobilefirst.in/mcp"}}}` |
| VS Code (Copilot) | `.vscode/mcp.json`: `{"servers":{"mobilefirst-secure":{"type":"http","url":"https://app-security.mobilefirst.in/mcp"}}}` |
| Others | Any MCP client that supports Streamable HTTP. |

In clients that show MCP prompts as slash commands, the `audit` prompt also appears. In Claude Code it's `/mcp__mobilefirst-secure__audit`. Typing plain "audit" works everywhere, because the server's instructions tell the agent to start the audit.

## Rule catalog (47 rules, version 2026.11.1)

Each rule maps to OWASP MASVS v2.1 and MASWE IDs (taken from the OWASP MASWE repository) plus CWE. Rules only run when they apply to the detected stack. For example, Firebase rules are skipped for a Supabase app.

| Category | Rules |
|---|---|
| Exposed Secrets | Secret API keys shipped inside the app (critical); AI provider called directly from the app (high); Secrets in build-time environment variables (high); Signing keys or cloud credentials committed to the repo (medium) |
| Backend Exposure | Supabase admin key inside the app (critical); Supabase tables open without row-level security (critical); Firebase database or storage open to everyone (critical); Access checks done only inside the app (high); Purchases unlocked without server verification (medium) |
| Data Storage | Login tokens or personal data stored unencrypted (high); Sensitive files saved where other apps can read them (high); Sensitive data printed to logs (medium); Private app data copied into device backups (medium) |
| Network Security | Certificate checks switched off (critical); Unencrypted HTTP connections (high); Sensitive data placed in URLs (medium); No certificate pinning for high-value traffic (low) |
| Authentication | Biometric lock can be bypassed (high); Insecure login flow or OAuth secret in the app (high); Logout leaves the session alive (medium); No re-check before sensitive account changes (low) |
| Cryptography | Encryption keys hardcoded in the code (high); Weak or broken encryption (medium); Weak hashing for passwords or integrity checks (medium); Predictable random values used for security (medium) |
| Platform Interaction | Android components open to other apps (high); Deep links trigger actions without checks (high); WebView exposes app functions to web content (high); Password fields not masked (medium); Sensitive data copied to the clipboard (medium); Sensitive data shown in notifications (medium); Unsafe Android intents (medium); Sensitive screens can be captured (low) |
| Code Health | Libraries with known vulnerabilities (OSV, severity from the database); Outdated platform targets (medium); Test shortcuts or backdoors left in (medium); Untrusted input reaches queries or code execution (medium); Code downloaded at runtime without verification (medium); No way to force users onto a safe version (low) |
| Privacy | Permissions requested but not needed; Apple privacy manifest missing or incomplete; Tracking without user consent; Personal data sent to analytics or crash tools; No in-app account deletion (all medium) |
| Tamper Resistance | Debug features enabled in release builds (high); App code ships readable (low); No protection against tampered apps or devices (low) |

Rules live in `lib/rules/`. To add one, add an object to the right file. The catalog refuses to load if a rule ID is duplicated or a title contains "and" or "&". Platform thresholds (Android target SDK 36, which Google Play has required since 31 Aug 2026; min SDK 24; iOS 15) are in `lib/rules/globs.ts`. Update them each year.

## Local development

```bash
npm install
npm run dev                      # http://localhost:3000, MCP at /mcp
```

To run the end-to-end test, which plays the coding agent against an insecure Expo + Supabase sample app in `test-fixtures/`:

```bash
node scripts/mock-osv.mjs &                                   # local stand-in for api.osv.dev
PUBLIC_BASE_URL=http://localhost:3000 OSV_API_URL=http://localhost:8787 npm run build && npx next start &
MFS_URL=http://localhost:3000 npm run test:e2e
```

To test the Redis code path too, run `node scripts/mock-upstash.mjs &` (a local stand-in for the Upstash REST API) and start the server with `KV_REST_API_URL=http://localhost:8788 KV_REST_API_TOKEN=test`. Run this whenever `lib/store.ts` changes.

The test covers: tool and prompt discovery, stack detection, rejection of invalid submissions, category-by-category submission, server-side secret masking, dependency CVEs, the report page, lead capture, parallel submissions, and the fallback when OSV is unreachable.

## Project layout

```
app/mcp/route.ts        MCP endpoint (mcp-handler, MCP SDK v2)
app/r/[id]/             Report page with lead forms
app/api/lead/route.ts   Lead capture, webhook, Resend email
app/page.tsx            Minimal landing page with per-agent install
lib/rules/              Rule catalog
lib/detect.ts           Stack detection
lib/checklist.ts        Checklist + agent instructions
lib/mcp.ts              audit / submit_findings tools, audit prompt
lib/report.ts           Scoring, verdict, chat summary
lib/osv.ts              Dependency vulnerability lookup (OSV.dev, free)
lib/mask.ts             Secret masking for evidence snippets
lib/store.ts            Upstash Redis (or in-memory for dev)
```

## Deferred for later

- **Report link privacy:** links are already unguessable (128-bit random IDs) and expire after `REPORT_TTL_DAYS`. Owner-only access and manual revocation are not built yet.
- **Abuse limits:** there's no per-IP or per-connection rate limiting on `/mcp` or `/api/lead` yet. Vercel's Firewall rate-limit rules are the quickest option when needed.
- **Accounts, audit history and re-audit comparison**, for the ongoing protection tier.
