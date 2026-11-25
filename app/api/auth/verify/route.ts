import { createSession, sessionCookie, verifyOtp } from "@/lib/auth";

// Step 2: check the code, create the account on first sign-up, start a session.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = String(body?.email || "").trim().toLowerCase();
  const code = String(body?.code || "").replace(/\D/g, "");
  if (!email || code.length !== 6) return Response.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });

  const res = await verifyOtp(email, code);
  if ("error" in res) return Response.json({ error: res.error }, { status: res.status });
  const token = await createSession(res.account.id);
  // Only same-site paths, so a crafted link can't send people elsewhere after sign-in.
  const next = String(body?.next || "");
  const redirect = /^\/(?![\/\\])[\w\-./?=&%#]*$/.test(next) ? next : "/dashboard";
  return new Response(JSON.stringify({ ok: true, redirect }), {
    headers: { "content-type": "application/json", "set-cookie": sessionCookie(token, req) },
  });
}
