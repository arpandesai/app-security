// Email through Resend (https://resend.com). RESEND_API_URL is only overridden in tests.
const RESEND = process.env.RESEND_API_URL || "https://api.resend.com";

export const emailReady = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM; // e.g. "MobileFirst Secure <secure@mobilefirst.in>"
  if (!key || !from) return false;
  try {
    const res = await fetch(`${RESEND}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(text ? { text } : {}) }),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}
