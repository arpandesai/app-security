import { createHash, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { kv } from "./store";
import { createAccount, getAccount, getAccountByEmail, type Account } from "./accounts";
import { sendEmail } from "./email";
import { BRAND, SLOGAN } from "./config";

/**
 * Sign-in by one-time code. A 6-digit code is emailed (Resend); entering it starts a 30-day
 * session. New accounts are created only after the code is verified, so every account is a real inbox.
 */
const OTP_TTL = 10 * 60;
const RESEND_GAP = 30;
const MAX_TRIES = 5;
const SESSION_TTL = 30 * 24 * 60 * 60;
export const SESSION_COOKIE = "mfs_session";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const otpKey = (email: string) => `otp:${email}`;
const gapKey = (email: string) => `otp:gap:${email}`;
const sessKey = (token: string) => `sess:${sha(token)}`;

interface Pending {
  codeHash: string;
  tries: number;
  exp: number;
  signup?: { name: string; company?: string };
}

type Fail = { error: string; status: number };

export async function startOtp(email: string, signup?: { name: string; company?: string }): Promise<{ ok: true } | Fail> {
  if (!(await kv.setNX(gapKey(email), "1", RESEND_GAP))) {
    return { error: "We just sent a code. Wait 30 seconds before asking for another.", status: 429 };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const pending: Pending = { codeHash: sha(`${email}:${code}`), tries: 0, exp: Date.now() + OTP_TTL * 1000, signup };
  await kv.setJSON(otpKey(email), pending, OTP_TTL);

  const sent = await sendEmail(
    email,
    `${code} is your ${BRAND} code`,
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f1729;max-width:480px">
      <p style="font-weight:700;font-size:15px;margin:0 0 18px">MobileFirst <span style="color:#1a56db">Secure</span></p>
      <p style="margin:0 0 8px">Your sign-in code:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 16px">${code}</p>
      <p style="color:#3b4558;margin:0 0 24px">It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
      <p style="color:#6b7486;font-size:13px;margin:0">${BRAND} · A MobileFirst product · ${SLOGAN}</p>
    </div>`,
    `Your ${BRAND} sign-in code: ${code}\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`
  );
  if (!sent) {
    await kv.del(otpKey(email));
    await kv.del(gapKey(email));
    return { error: "We couldn't send the email. Please check the address and try again.", status: 502 };
  }
  return { ok: true };
}

export async function verifyOtp(email: string, code: string): Promise<{ account: Account } | Fail> {
  const p = await kv.getJSON<Pending>(otpKey(email));
  if (!p || p.exp < Date.now()) return { error: "This code has expired. Ask for a new one.", status: 400 };
  if (p.codeHash !== sha(`${email}:${code}`)) {
    p.tries += 1;
    if (p.tries >= MAX_TRIES) {
      await kv.del(otpKey(email));
      return { error: "Too many wrong attempts. Ask for a new code.", status: 400 };
    }
    await kv.setJSON(otpKey(email), p, Math.max(1, Math.ceil((p.exp - Date.now()) / 1000)));
    return { error: "That code isn't right. Check the email and try again.", status: 400 };
  }
  await kv.del(otpKey(email));

  let account = await getAccountByEmail(email);
  if (!account && p.signup) {
    const res = await createAccount({ ...p.signup, email });
    account = res.exists ? await getAccountByEmail(email) : res.account;
  }
  if (!account) return { error: "There's no account for this email yet.", status: 404 };
  return { account };
}

export async function createSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  await kv.setJSON(sessKey(token), { accountId }, SESSION_TTL);
  return token;
}

export async function destroySession(token: string) {
  await kv.del(sessKey(token));
}

export function sessionCookie(token: string, req: Request, maxAge = SESSION_TTL) {
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${https ? "; Secure" : ""}`;
}

/** The signed-in customer for this request, or null. */
export async function currentAccount(): Promise<Account | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await kv.getJSON<{ accountId: string }>(sessKey(token));
  return s ? getAccount(s.accountId) : null;
}
