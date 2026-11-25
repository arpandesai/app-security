import { createHash, randomBytes } from "node:crypto";
import type { Report, Verdict } from "./types";
import { kv } from "./store";

/**
 * Minimal accounts: name, company, email and one secret token. The token is the customer's
 * personal MCP URL (/mcp/<token>). Customers sign in to their dashboard with a one-time code
 * sent to their email (lib/auth.ts). MobileFirst can switch any account off from /admin.
 */
export interface Account {
  id: string;
  name: string;
  company?: string;
  email: string;
  token: string;
  createdAt: string;
  disabled?: boolean;
}

export interface AccountReport {
  reportId: string;
  appName: string;
  stack: string;
  createdAt: string;
  verdict: Verdict;
  score: number;
  grade: string;
  counts: Report["counts"];
  agent?: string;
}

/** Who is calling the MCP server, from the URL they connected with. */
export type Access =
  | { status: "ok"; account: Account }
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "disabled"; account: Account };

const FOREVER = 0;
const acctKey = (id: string) => `acct:${id}`;
const emailKey = (email: string) => `acct:email:${email}`;
const tokenKey = (token: string) => `acct:tok:${createHash("sha256").update(token).digest("hex")}`;
const reportsKey = (id: string) => `acct:${id}:reports`;
const INDEX = "accounts";

export const TOKEN_RE = /^mfs_[A-Za-z0-9_-]{32}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function createAccount(input: { name: string; company?: string; email: string }) {
  const email = input.email.trim().toLowerCase();
  const id = "acc_" + randomBytes(12).toString("base64url");
  // One account per email. setNX makes this safe even when two signups race.
  if (!(await kv.setNX(emailKey(email), id, FOREVER))) return { exists: true as const };
  const account: Account = {
    id,
    name: input.name.trim(),
    company: input.company?.trim() || undefined,
    email,
    token: "mfs_" + randomBytes(24).toString("base64url"),
    createdAt: new Date().toISOString(),
  };
  await kv.setJSON(acctKey(id), account, FOREVER);
  await kv.setNX(tokenKey(account.token), id, FOREVER);
  await kv.hset(INDEX, id, account.createdAt, FOREVER);
  return { exists: false as const, account };
}

export async function getAccount(id: string) {
  return kv.getJSON<Account>(acctKey(id));
}

export async function getAccountByEmail(email: string) {
  const id = await kv.get(emailKey(email.trim().toLowerCase()));
  return id ? getAccount(id) : null;
}

export async function getAccountByToken(token: string): Promise<Account | null> {
  if (!TOKEN_RE.test(token)) return null;
  const id = await kv.get(tokenKey(token));
  if (!id) return null;
  const account = await getAccount(id);
  // Guard against a stale index entry.
  return account && account.token === token ? account : null;
}

export async function resolveAccess(token: string | undefined): Promise<Access> {
  if (!token) return { status: "missing" };
  const account = await getAccountByToken(token);
  if (!account) return { status: "invalid" };
  return account.disabled ? { status: "disabled", account } : { status: "ok", account };
}

export async function setDisabled(id: string, disabled: boolean) {
  const account = await getAccount(id);
  if (!account) return null;
  account.disabled = disabled;
  await kv.setJSON(acctKey(id), account, FOREVER);
  return account;
}

export async function listAccounts(): Promise<Account[]> {
  const ids = Object.keys(await kv.hgetall(INDEX));
  const accounts = (await Promise.all(ids.map(getAccount))).filter((a): a is Account => !!a);
  return accounts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addAccountReport(accountId: string, r: Report) {
  const entry: AccountReport = {
    reportId: r.id,
    appName: r.appName,
    stack: r.stack,
    createdAt: r.createdAt,
    verdict: r.verdict,
    score: r.score,
    grade: r.grade,
    counts: r.counts,
    agent: r.agent,
  };
  await kv.hset(reportsKey(accountId), r.id, JSON.stringify(entry), FOREVER);
}

export async function listAccountReports(accountId: string): Promise<AccountReport[]> {
  const raw = await kv.hgetall(reportsKey(accountId));
  return Object.values(raw)
    .map((v) => (typeof v === "string" ? (JSON.parse(v) as AccountReport) : (v as AccountReport)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
