import type { Report } from "@/lib/types";
import { currentAccount } from "@/lib/auth";
import { kv } from "@/lib/store";
import { reportKey } from "@/lib/mcp";
import { inviteReviewer, removeReviewer, roleFor } from "@/lib/sharing";

const ID = /^[A-Za-z0-9_-]{16,40}$/;

/** Invite or remove a reviewer. Only the report's owner can; everyone else gets a 404. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== (req.headers.get("x-forwarded-host") || req.headers.get("host"))) {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const account = await currentAccount();
  if (!account) return new Response(null, { status: 303, headers: { location: new URL(`/r/${ID.test(id) ? id : ""}`, req.url).toString() } });
  if (!ID.test(id) || account.disabled || (await roleFor(account, id)) !== "owner") return new Response("Not found", { status: 404 });
  const report = await kv.getJSON<Report>(reportKey(id));
  if (!report) return new Response("Not found", { status: 404 });

  const form = await req.formData().catch(() => null);
  const action = String(form?.get("action") || "");
  const email = String(form?.get("email") || "").trim().toLowerCase();
  const back = (q: Record<string, string>) =>
    new Response(null, {
      status: 303,
      headers: { location: new URL(`/dashboard/reports/${id}?${new URLSearchParams(q)}#share`, req.url).toString() },
    });

  if (action === "remove") {
    await removeReviewer(id, email);
    return back({ removed: email });
  }
  if (action !== "invite") return back({ error: "Unknown action." });

  const res = await inviteReviewer(account, report, email);
  if (!res.ok) return back({ error: res.error });
  return back({ invited: email, ...(res.emailed ? { emailed: "1" } : {}), ...(res.already ? { already: "1" } : {}) });
}
