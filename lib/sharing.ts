import type { Report } from "./types";
import { EMAIL_RE, ownsReport, type Account, type AccountReport } from "./accounts";
import { kv, TTL } from "./store";
import { BASE_URL, BRAND } from "./config";
import { sendEmail } from "./email";

/**
 * Reports are private. The account that ran the audit (the owner) can invite reviewers by email.
 * A reviewer signs in with that email (a code, no password; an account is created on first sign-in)
 * and can then read the report. The owner can remove a reviewer at any time.
 *
 * racl:<reportId>   hash  email -> Reviewer        expires with the report
 * shared:<email>    hash  reportId -> SharedReport  what a reviewer sees in their panel
 */
export const MAX_REVIEWERS = 25;

export interface Reviewer {
  email: string;
  invitedBy: string; // account id
  at: string;
}

export interface SharedReport extends AccountReport {
  sharedBy: string; // the owner's name, or email when they haven't set one
  sharedByCompany?: string;
  sharedAt: string;
}

export type ReportRole = "owner" | "reviewer";

const aclKey = (reportId: string) => `racl:${reportId}`;
const sharedKey = (email: string) => `shared:${email}`;
const FOREVER = 0;
const norm = (email: string) => email.trim().toLowerCase();

/** Seconds until the report expires, so its access list never outlives it. */
const remaining = (r: Report) => Math.max(60, Math.floor(TTL.report - (Date.now() - new Date(r.createdAt).getTime()) / 1000));

/** What this signed-in account may do with the report: read it as owner or reviewer, or nothing. */
export async function roleFor(account: Account, reportId: string): Promise<ReportRole | null> {
  if (await ownsReport(account.id, reportId)) return "owner";
  if (await kv.hget(aclKey(reportId), norm(account.email))) return "reviewer";
  return null;
}

export async function listReviewers(reportId: string): Promise<Reviewer[]> {
  const raw = await kv.hgetall(aclKey(reportId));
  return Object.values(raw)
    .map((v) => JSON.parse(v) as Reviewer)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function listSharedWithMe(email: string): Promise<SharedReport[]> {
  const raw = await kv.hgetall(sharedKey(norm(email)));
  return Object.values(raw)
    .map((v) => JSON.parse(v) as SharedReport)
    .sort((a, b) => b.sharedAt.localeCompare(a.sharedAt));
}

type InviteResult = { ok: true; emailed: boolean; already: boolean } | { ok: false; error: string };

export async function inviteReviewer(owner: Account, report: Report, rawEmail: string): Promise<InviteResult> {
  const email = norm(rawEmail);
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Enter a valid email address." };
  if (email === norm(owner.email)) return { ok: false, error: "That's your own email. You can already open this report." };

  const reviewers = await listReviewers(report.id);
  if (reviewers.some((r) => r.email === email)) return { ok: true, emailed: false, already: true };
  if (reviewers.length >= MAX_REVIEWERS) return { ok: false, error: `A report can have up to ${MAX_REVIEWERS} reviewers. Remove one first.` };

  const now = new Date().toISOString();
  const reviewer: Reviewer = { email, invitedBy: owner.id, at: now };
  await kv.hset(aclKey(report.id), email, JSON.stringify(reviewer), remaining(report));
  const shared: SharedReport = {
    reportId: report.id,
    appName: report.appName,
    stack: report.stack,
    createdAt: report.createdAt,
    verdict: report.verdict,
    score: report.score,
    grade: report.grade,
    counts: report.counts,
    agent: report.agent,
    sharedBy: owner.name || owner.email,
    sharedByCompany: owner.company,
    sharedAt: now,
  };
  await kv.hset(sharedKey(email), report.id, JSON.stringify(shared), FOREVER);

  const emailed = await sendInvite(owner, report, email).catch(() => false);
  return { ok: true, emailed, already: false };
}

export async function removeReviewer(reportId: string, rawEmail: string) {
  const email = norm(rawEmail);
  await kv.hdel(aclKey(reportId), email);
  await kv.hdel(sharedKey(email), reportId);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

function sendInvite(owner: Account, report: Report, email: string) {
  const who = oneLine(owner.name || owner.email);
  const from = owner.company ? `${who} (${oneLine(owner.company)})` : who;
  const link = `${BASE_URL}/r/${report.id}`;
  return sendEmail(
    email,
    `${who} shared a security report with you`,
    `<p>${esc(from)} invited you to review the ${BRAND} security report for <b>${esc(report.appName)}</b>.</p>
     <p><a href="${link}">Open the report</a></p>
     <p>Sign in with this email address (${esc(email)}) to open it. We'll email you a 6-digit code; there's no password.</p>
     <p style="color:#6b7486;font-size:13px">${BRAND} · A MobileFirst product</p>`,
    `${from} invited you to review the ${BRAND} security report for ${report.appName}.\n\nOpen the report: ${link}\n\nSign in with this email address (${email}) to open it. We'll email you a 6-digit code; there's no password.`
  );
}
