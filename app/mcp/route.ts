import { createMcpHandler } from "mcp-handler";
import { registerMobileFirstSecure, SERVER_INSTRUCTIONS } from "@/lib/mcp";
import { BRAND, SERVER_VERSION } from "@/lib/config";

// Shared endpoint: https://app-security.mobilefirst.in/mcp
// It stays connectable, but `audit` asks the user to get their personal URL (/mcp/<token>).
const handler = createMcpHandler((server) => registerMobileFirstSecure(server, { status: "missing" }), {
  serverInfo: { name: BRAND, version: SERVER_VERSION },
  instructions: SERVER_INSTRUCTIONS,
});

export const maxDuration = 60;
export { handler as GET, handler as POST, handler as DELETE };
