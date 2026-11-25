import { setDisabled } from "@/lib/accounts";

// Protected by HTTP basic auth in middleware.ts (ADMIN_PASSWORD).
export async function POST(req: Request) {
  const form = await req.formData();
  const id = String(form.get("id") || "");
  const action = String(form.get("action") || "");
  if (!id || (action !== "disable" && action !== "enable")) return Response.json({ error: "Invalid request" }, { status: 400 });
  const account = await setDisabled(id, action === "disable");
  if (!account) return Response.json({ error: "Account not found" }, { status: 404 });
  if ((req.headers.get("accept") || "").includes("application/json")) return Response.json({ id, disabled: account.disabled });
  return Response.redirect(new URL("/admin", req.url), 303);
}
