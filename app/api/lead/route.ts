import type { Report } from "@/lib/types";
import { kv } from "@/lib/store";
import { reportKey, reportUrl } from "@/lib/mcp";
import { BRAND } from "@/lib/config";
import { sendEmail } from "@/lib/email";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = String(body?.email || "").trim().toLowerCase();
  const intent = body?.intent === "fix" ? "fix" : "report";
  const reportId = String(body?.reportId || "");

  if (!EMAIL.test(email) || email.length > 200) return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  const report = await kv.getJSON<Report>(reportKey(reportId));
  if (!report) return Response.json({ error: "This report has expired." }, { status: 404 });

  const url = reportUrl(reportId);
  const lead = {
    email,
    intent,
    reportId,
    reportUrl: url,
    appName: report.appName,
    stack: report.stack,
    verdict: report.verdict,
    score: report.score,
    counts: report.counts,
    agent: report.agent,
    at: new Date().toISOString(),
  };
  await kv.rpush("leads", JSON.stringify(lead));

  // Internal notification: any webhook (Slack incoming webhook, Zapier, Make) and/or email.
  const summary = `${intent === "fix" ? "FIX REQUEST" : "Report emailed"}: ${email} · ${report.appName} · ${report.verdict} (${report.score}/100) · ${report.counts.critical}C/${report.counts.high}H/${report.counts.medium}M · ${url}`;
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: summary, ...lead }),
    }).catch(() => {});
  }
  if (process.env.LEAD_NOTIFY_EMAIL) {
    await sendEmail(process.env.LEAD_NOTIFY_EMAIL, `[${BRAND}] ${summary.split(" · ")[0]} — ${report.appName}`, `<p>${summary}</p>`).catch(() => false);
  }

  let emailed = false;
  if (intent === "report") {
    emailed = await sendEmail(
      email,
      `Your ${BRAND} report: ${report.appName}`,
      `<p>Here's the security audit report for <b>${report.appName}</b>.</p>
       <p><b>${report.verdict}</b> · Score ${report.score}/100</p>
       <p><a href="${url}">Open the full report</a></p>
       <p style="color:#6b7486;font-size:13px">${BRAND} · A MobileFirst product</p>`
    ).catch(() => false);
  }

  return Response.json({ ok: true, emailed });
}
