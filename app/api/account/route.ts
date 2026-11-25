import { currentAccount } from "@/lib/auth";
import { updateProfile } from "@/lib/accounts";

const back = (req: Request, query: string) =>
  new Response(null, { status: 303, headers: { location: new URL(`/dashboard/account?${query}`, req.url).toString() } });

/** Saves the signed-in customer's name and company from the Account page form. */
export async function POST(req: Request) {
  // Same-site form posts only (the session cookie is SameSite=Lax; this is a second check).
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== (req.headers.get("x-forwarded-host") || req.headers.get("host"))) {
    return new Response("Forbidden", { status: 403 });
  }
  const account = await currentAccount();
  if (!account) return new Response(null, { status: 303, headers: { location: new URL("/login", req.url).toString() } });

  const form = await req.formData().catch(() => null);
  const name = String(form?.get("name") ?? "").trim();
  const company = String(form?.get("company") ?? "").trim();
  if (name.length > 80 || company.length > 120) return back(req, "error=1");

  await updateProfile(account.id, { name, company });
  return back(req, "saved=1");
}
