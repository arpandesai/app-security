import { destroySession, SESSION_COOKIE, sessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const token = (req.headers.get("cookie") || "").match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (token) await destroySession(token);
  return new Response(null, { status: 303, headers: { location: "/", "set-cookie": sessionCookie("", req, 0) } });
}
