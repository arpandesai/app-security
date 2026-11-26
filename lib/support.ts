/** Live setup help: where call requests go. SUPPORT_CALL_EMAIL defaults to nishant@mobilefirst.in. */
export const SUPPORT_CALL_EMAIL = process.env.SUPPORT_CALL_EMAIL || "nishant@mobilefirst.in";

/** Phone numbers as people type them: keep a leading +, drop spaces, dashes, dots and brackets. */
export function cleanPhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s\-.()]/g, "");
  return /^\+?\d{7,15}$/.test(s) ? s : null;
}
