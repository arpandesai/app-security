import { BRAND } from "./config";
import { sendEmail } from "./email";

/**
 * Tells the MobileFirst team about a lead or a booking click: any webhook (Slack incoming webhook,
 * Zapier, Make) via LEAD_WEBHOOK_URL and/or an email to LEAD_NOTIFY_EMAIL. Never throws.
 */
export async function notifyTeam(summary: string, subject: string, payload: Record<string, unknown>) {
  const jobs: Promise<unknown>[] = [];
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    jobs.push(
      fetch(hook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: summary, ...payload }),
        signal: AbortSignal.timeout(3000),
      })
    );
  }
  if (process.env.LEAD_NOTIFY_EMAIL) {
    jobs.push(sendEmail(process.env.LEAD_NOTIFY_EMAIL, `[${BRAND}] ${subject}`, `<p>${escapeHtml(summary)}</p>`));
  }
  await Promise.allSettled(jobs);
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
