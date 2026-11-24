import { usingMemoryStore, storageReady } from "@/lib/store";
import { RULESET_VERSION } from "@/lib/rules";
import { SERVER_VERSION } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Public health check: shows whether audits can be stored. Never exposes credentials. */
export function GET() {
  return Response.json(
    { ok: storageReady, storage: usingMemoryStore ? "memory" : "redis", version: SERVER_VERSION, ruleset: RULESET_VERSION },
    { status: storageReady ? 200 : 503 }
  );
}
