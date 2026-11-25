import { currentAccount } from "@/lib/auth";
import { clientLabel, getActivity } from "@/lib/activity";

// Live status for the "Run a new audit" guide. Signed-in customers only, their own activity only.
export async function GET() {
  const account = await currentAccount();
  if (!account) return Response.json({ error: "Sign in first." }, { status: 401 });
  const a = await getActivity(account.id);
  return Response.json(
    { ...a, connection: a.connection ? { ...a.connection, label: clientLabel(a.connection.client) } : null },
    { headers: { "cache-control": "no-store" } }
  );
}
