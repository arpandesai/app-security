import { randomBytes } from "node:crypto";

export const BRAND = "MobileFirst Secure";
export const SLOGAN = "Your app's performance is our responsibility";
export const BASE_URL = (process.env.PUBLIC_BASE_URL || "https://app-security.mobilefirst.in").replace(/\/$/, "");
export const MCP_URL = `${BASE_URL}/mcp`;
export const personalMcpUrl = (token: string) => `${MCP_URL}/${token}`;
/** Shown to customers whose URL has been switched off. */
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "";
export const SERVER_VERSION = "1.0.0";

/** Unguessable IDs (128 bits) so report links can't be enumerated. */
export const newId = (prefix = "") => prefix + randomBytes(16).toString("base64url");
