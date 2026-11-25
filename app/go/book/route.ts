import type { Report } from "@/lib/types";
import { BOOK_SOURCES, BOOKING_URL, type BookSource } from "@/lib/config";
import { currentAccount } from "@/lib/auth";
import { kv } from "@/lib/store";
import { reportKey } from "@/lib/mcp";
import { notifyTeam } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Logs a booking click (source, report, signed-in customer) and redirects to the booking page. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const raw = params.get("from") || "";
  const from = (BOOK_SOURCES as readonly string[]).includes(raw) ? (raw as BookSource) : "other";
  const r = params.get("r") || "";
  const reportId = /^[A-Za-z0-9_-]{16,40}$/.test(r) ? r : undefined;

  try {
    const [account, report] = await Promise.all([
      currentAccount().catch(() => null),
      reportId ? kv.getJSON<Report>(reportKey(reportId)) : Promise.resolve(null),
    ]);
    const click = {
      from,
      reportId: report ? reportId : undefined,
      appName: report?.appName,
      verdict: report?.verdict,
      score: report?.score,
      email: account?.email,
      company: account?.company,
      at: new Date().toISOString(),
    };
    await kv.rpush("booking_clicks", JSON.stringify(click));
    const who = account ? account.email : "Someone (not signed in)";
    const what = report ? `${report.appName}, ${report.verdict} (${report.score}/100)` : "no report";
    await notifyTeam(`Booking page opened: ${who}, from ${from}, ${what}`, `Booking page opened: ${who}`, click);
  } catch {
    // Logging must never block the booking.
  }

  return new Response(null, {
    status: 302,
    headers: { location: BOOKING_URL, "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
