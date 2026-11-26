import { randomBytes } from "node:crypto";

export const BRAND = "MobileFirst Secure";
export const SLOGAN = "Your app's performance is our responsibility";
export const BASE_URL = (process.env.PUBLIC_BASE_URL || "https://app-security.mobilefirst.in").replace(/\/$/, "");
export const MCP_URL = `${BASE_URL}/mcp`;
export const personalMcpUrl = (token: string) => `${MCP_URL}/${token}`;
/** Optional contact address. Customers are pointed to a call instead (BOOKING_URL). */
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "";

/**
 * Every "get it fixed" and "need help" action opens this booking page. Links go through /go/book,
 * which records where the click came from (and which report) before redirecting here.
 */
export const BOOKING_URL =
  process.env.BOOKING_URL ||
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ2oXe8vi0lbyB7y6DTAPZTaWFPT9nNG4WUmOzhv46HcOBm5-4q4jOwfDBzjboLbSLyAakP9ntFP";

/** Where a booking click came from. Anything else is logged as "other". */
export const BOOK_SOURCES = [
  "report", // report header: Get it fixed
  "finding", // one finding: Get this fixed
  "report-end", // bottom of the report
  "new-audit", // Run a new audit guide: stuck on a step
  "home", // landing page: Found issues? Our engineers fix them
  "chat", // the summary the coding agent shows after an audit
  "app", // an app card in the panel
  "sidebar", // panel sidebar help card
  "onboarding", // panel before the first audit
  "setup", // panel setup page: help installing
  "mcp-setup", // agent message when the URL is missing or wrong
  "switched-off", // switched-off account
] as const;
export type BookSource = (typeof BOOK_SOURCES)[number];

/** Relative link for pages; pass absolute=true for text shown in the coding agent. */
export const bookHref = (from: BookSource, reportId?: string, absolute = false) =>
  `${absolute ? BASE_URL : ""}/go/book?from=${from}${reportId ? `&r=${encodeURIComponent(reportId)}` : ""}`;
export const SERVER_VERSION = "1.0.0";

/** Unguessable IDs (128 bits) so report links can't be enumerated. */
export const newId = (prefix = "") => prefix + randomBytes(16).toString("base64url");
