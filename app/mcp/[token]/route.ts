import { createMcpHandler } from "mcp-handler";
import { registerMobileFirstSecure, SERVER_INSTRUCTIONS } from "@/lib/mcp";
import { resolveAccess } from "@/lib/accounts";
import { BRAND, SERVER_VERSION } from "@/lib/config";

// Personal endpoint: https://app-security.mobilefirst.in/mcp/<token>
// The token in the URL identifies the customer, so it works in every MCP client,
// including ChatGPT and the Claude app, which can't send custom auth headers.
async function handle(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const access = await resolveAccess((await params).token);
  const handler = createMcpHandler((server) => registerMobileFirstSecure(server, access), {
    serverInfo: { name: BRAND, version: SERVER_VERSION },
    instructions: SERVER_INSTRUCTIONS,
  });
  return handler(req);
}

export const maxDuration = 60;
export { handle as GET, handle as POST, handle as DELETE };
