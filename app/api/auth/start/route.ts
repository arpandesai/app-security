import { EMAIL_RE, getAccountByEmail } from "@/lib/accounts";
import { startOtp } from "@/lib/auth";
import { emailReady } from "@/lib/email";
import { storageReady, STORAGE_NOT_READY } from "@/lib/store";

// Step 1 of sign-up or sign-in: email a 6-digit code.
// Sign-up sends email (name and company are optional); sign-in sends email only.
export async function POST(req: Request) {
  if (!storageReady) return Response.json({ error: STORAGE_NOT_READY }, { status: 503 });
  if (!emailReady()) return Response.json({ error: "Sign-in emails aren't set up yet. Please try again later." }, { status: 503 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body?.website) return Response.json({ error: "Invalid request" }, { status: 400 }); // honeypot

  const email = String(body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return Response.json({ error: "Please enter a valid email." }, { status: 400 });

  const signup = body?.mode === "signup";
  let details: { name: string; company?: string } | undefined;
  if (signup) {
    const name = String(body?.name || "").trim();
    const company = String(body?.company || "").trim();
    if (name.length > 100) return Response.json({ error: "Name is too long." }, { status: 400 });
    if (company.length > 120) return Response.json({ error: "Company name is too long." }, { status: 400 });
    details = { name, company: company || undefined };
  }

  const existing = await getAccountByEmail(email);
  if (!signup && !existing) return Response.json({ error: "There's no account for this email. Get your MCP URL first." }, { status: 404 });

  // Signing up with an email that already has an account just signs them in.
  const res = await startOtp(email, existing ? undefined : details);
  if ("error" in res) return Response.json({ error: res.error }, { status: res.status });
  return Response.json({ ok: true, existing: !!existing });
}
