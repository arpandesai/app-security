import { createMcpHandler } from "mcp-handler";
import { registerMobileFirstSecure, SERVER_INSTRUCTIONS } from "@/lib/mcp";
import { BRAND, SERVER_VERSION } from "@/lib/config";

// Endpoint: https://app-security.mobilefirst.in/mcp
const handler = createMcpHandler(registerMobileFirstSecure, {
  serverInfo: { name: BRAND, version: SERVER_VERSION },
  instructions: SERVER_INSTRUCTIONS,
});

export const maxDuration = 60;
export { handler as GET, handler as POST, handler as DELETE };
