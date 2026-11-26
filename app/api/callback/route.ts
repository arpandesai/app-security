import { currentAccount } from "@/lib/auth";
import { kv } from "@/lib/store";
import { BRAND, bookHref } from "@/lib/config";
import { sendEmail } from "@/lib/email";
import { notifyTeam } from "@/lib/notify";
import { clientLabel, getActivity } from "@/lib/activity";
import { CALL_WITHIN, SUPPORT_CALL_EMAIL, cleanPhone, supportStatus } from "@/lib/support";
import { AGENT_TOOLS } from "@/app/agent-tools";

// "Need help setting up?": a signed-in customer asks an engineer to call them. Emails the team with
// everything needed before dialling, and posts to the team webhook when one is set.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== (req.headers.get("x-forwarded-host") || req.headers.get("host"))) {
    return Response.json({ error: "Bad origin." }, { status: 403 });
  }
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });

  let body: { name?: unknown; phone?: unknown; tool?: unknown; tz?: unknown; page?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send your name and phone number." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" ? cleanPhone(body.phone) : null;
  if (!name) return Response.json({ error: "Add your name." }, { status: 400 });
  if (!phone) return Response.json({ error: "Add a phone number with its country code, like +1 415 555 0100." }, { status: 400 });
  const tool = AGENT_TOOLS.find((t) => t.id === body.tool)?.name;
  const tz = typeof body.tz === "string" ? body.tz.slice(0, 60) : "";
  const page = typeof body.page === "string" && body.page.startsWith("/") ? body.page.slice(0, 80) : "";

  const status = supportStatus();
  // One request per two minutes, three per hour.
  if (!(await kv.setNX(`cb:${account.id}:cool`, "1", 120))) return Response.json({ ok: true, already: true, ...status });
  let slot = false;
  for (const i of [1, 2, 3]) if ((slot = await kv.setNX(`cb:${account.id}:${i}`, "1", 3600))) break;
  if (!slot) {
    return Response.json(
      { error: "You've asked for a few calls already. Book a time instead and we'll call you then.", book: bookHref("setup") },
      { status: 429 }
    );
  }

  const a = await getActivity(account.id).catch(() => null);
  const connected = a?.connection ? `Yes, from ${clientLabel(a.connection.client)} (${a.connection.at})` : "Not yet";
  const audit = a?.audit ? `${a.audit.appName}: ${a.audit.answered} of ${a.audit.total} checks${a.audit.reportId ? ", report ready" : ""}` : "None yet";
  let theirTime = "";
  try {
    if (tz) theirTime = new Date().toLocaleString("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" });
  } catch {}
  const request = {
    name,
    phone,
    email: account.email,
    company: account.company || "",
    tool: tool || "",
    connected,
    audit,
    page,
    tz,
    live: status.live,
    at: new Date().toISOString(),
  };
  await kv.rpush("callback_requests", JSON.stringify({ accountId: account.id, ...request }));

  const subject = `${status.live ? "Call now" : "Call back"}: ${name} needs setup help`;
  const digits = phone.replace(/^\+/, "");
  const rows: [string, string][] = [
    ["Name", esc(name)],
    ["Phone", `<a href="tel:${esc(phone)}">${esc(phone)}</a>${phone.startsWith("+") ? ` &nbsp; <a href="https://wa.me/${digits}">WhatsApp</a>` : " (no country code)"}`],
    ["Email", esc(account.email)],
    ["Company", esc(account.company || "")],
    ["AI tool", esc(tool || "Not picked")],
    ["Agent connected", esc(connected)],
    ["Audit", esc(audit)],
    ["Their time", esc(theirTime ? `${theirTime} (${tz})` : tz || "Unknown")],
    ["Asked from", esc(page || "Panel")],
  ];
  const html =
    `<p style="font:600 16px sans-serif">${status.live ? `Call within ${CALL_WITHIN}: we promised it on the page.` : "Outside support hours: call at the next opening."}</p>` +
    `<table cellpadding="6" style="font:14px sans-serif;border-collapse:collapse">${rows
      .map(([k, v]) => `<tr><td style="color:#667085">${k}</td><td>${v}</td></tr>`)
      .join("")}</table>`;
  const text = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${account.email}`,
    `Company: ${account.company || ""}`,
    `AI tool: ${tool || "Not picked"}`,
    `Agent connected: ${connected}`,
    `Audit: ${audit}`,
    `Their time: ${theirTime ? `${theirTime} (${tz})` : tz || "Unknown"}`,
    `Asked from: ${page || "Panel"}`,
  ].join("\n");
  const [sent] = await Promise.all([
    sendEmail(SUPPORT_CALL_EMAIL, `[${BRAND}] ${subject}`, html, `${subject}\n\n${text}`),
    notifyTeam(`${subject}. ${phone}, ${account.email}. Tool: ${tool || "not picked"}. Connected: ${connected}.`, subject, request),
  ]);
  if (!sent && !process.env.LEAD_WEBHOOK_URL) {
    return Response.json({ error: "We couldn't send your request. Book a time instead.", book: bookHref("setup") }, { status: 502 });
  }
  return Response.json({ ok: true, ...status });
}
