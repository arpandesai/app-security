import { kv, TTL } from "./store";
import { reportLockKey, resultsKey } from "./audit-keys";
import { ownsReport } from "./accounts";

/**
 * Live activity for the "Run a new audit" guide: when the customer's coding agent last connected with their
 * personal URL, and the progress of their latest audit. Only what our own server sees; nothing about the user's code.
 */
export interface Connection {
  client: string;
  version?: string;
  at: string;
}
export interface CurrentAudit {
  auditId: string;
  appName: string;
  total: number;
  startedAt: string;
  /** Suggest auditing the app's server project too (the audited project has no server code of its own). */
  serverHint?: boolean;
}
export interface Activity {
  connection: Connection | null;
  audit: (CurrentAudit & { answered: number; reportId?: string }) | null;
}

const connKey = (accountId: string) => `conn:${accountId}`;
const currentKey = (accountId: string) => `aud_cur:${accountId}`;
const KEEP = 60 * 60 * 24 * 90;

/** The client name and version from an MCP initialize request, or null for any other request. */
export async function initializeClient(req: Request): Promise<{ name: string; version?: string } | null> {
  if (req.method !== "POST" || !(req.headers.get("content-type") || "").includes("json")) return null;
  try {
    const body = await req.json();
    const init = (Array.isArray(body) ? body : [body]).find((m) => m && m.method === "initialize");
    const info = init?.params?.clientInfo;
    if (!info || typeof info.name !== "string") return null;
    return { name: info.name.slice(0, 80), version: typeof info.version === "string" ? info.version.slice(0, 40) : undefined };
  } catch {
    return null;
  }
}

export async function recordConnection(accountId: string, client: { name: string; version?: string }) {
  const c: Connection = { client: client.name, version: client.version, at: new Date().toISOString() };
  await kv.setJSON(connKey(accountId), c, KEEP);
}

export async function recordAuditStart(accountId: string, a: CurrentAudit) {
  await kv.setJSON(currentKey(accountId), a, TTL.audit);
}

export async function getActivity(accountId: string): Promise<Activity> {
  const [connection, audit] = await Promise.all([
    kv.getJSON<Connection>(connKey(accountId)),
    kv.getJSON<CurrentAudit>(currentKey(accountId)),
  ]);
  if (!audit) return { connection, audit: null };
  const [results, lock] = await Promise.all([kv.hgetall(resultsKey(audit.auditId)), kv.get(reportLockKey(audit.auditId))]);
  // The lock is taken before the report is written; it's ready once it's in the account's list.
  const reportId = lock && (await ownsReport(accountId, lock)) ? lock : undefined;
  return { connection, audit: { ...audit, answered: Math.min(Object.keys(results).length, audit.total), reportId } };
}

/** Friendly name for an MCP client, from the name it reports. */
export function clientLabel(name: string): string {
  const rules: [RegExp, string][] = [
    [/claude[-_ ]?code/i, "Claude Code"],
    [/codex/i, "Codex"],
    [/chatgpt|openai/i, "ChatGPT"],
    [/cursor/i, "Cursor"],
    [/visual studio code|vscode|copilot/i, "VS Code"],
    [/windsurf|codeium/i, "Windsurf"],
    [/claude|anthropic/i, "Claude"],
  ];
  return rules.find(([re]) => re.test(name))?.[1] ?? name;
}
