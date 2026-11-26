/**
 * Live setup help: when engineers are on hand to call back within minutes, and where requests go.
 *
 * SUPPORT_HOURS, e.g. "Mon-Sat 10:00-19:00 Asia/Kolkata" (days, 24h times, IANA time zone).
 * Outside these hours the panel doesn't promise a call within minutes; it says when the next call can happen.
 * SUPPORT_CALL_EMAIL gets every call request (default nishant@mobilefirst.in); LEAD_WEBHOOK_URL too, if set.
 */
export const SUPPORT_HOURS = process.env.SUPPORT_HOURS || "Mon-Sat 10:00-19:00 Asia/Kolkata";
export const SUPPORT_CALL_EMAIL = process.env.SUPPORT_CALL_EMAIL || "nishant@mobilefirst.in";
export const CALL_WITHIN = "2 minutes";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface Hours {
  days: Set<number>;
  start: number; // minutes after midnight
  end: number;
  tz: string;
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function parseHours(spec: string): Hours {
  const m = spec.trim().match(/^([A-Za-z,\-]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+(\S+)$/);
  if (!m) throw new Error(`SUPPORT_HOURS not understood: ${spec}`);
  const days = new Set<number>();
  for (const part of m[1].toLowerCase().split(",")) {
    const [a, b] = part.split("-").map((d) => DAY_NAMES.indexOf(d.slice(0, 3)));
    if (a < 0 || (b !== undefined && b < 0)) throw new Error(`SUPPORT_HOURS has an unknown day: ${spec}`);
    if (b === undefined) days.add(a);
    else for (let d = a; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === b) break;
    }
  }
  new Intl.DateTimeFormat("en-US", { timeZone: m[4] }); // throws on an unknown time zone
  return { days, start: toMin(m[2]), end: toMin(m[3]), tz: m[4] };
}

function partsIn(tz: string, at: Date) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const get = (t: string) => p.find((x) => x.type === t)?.value || "";
  return { day: DAY_NAMES.indexOf(get("weekday").toLowerCase().slice(0, 3)), min: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function isLive(h: Hours, at = new Date()): boolean {
  const { day, min } = partsIn(h.tz, at);
  return h.days.has(day) && min >= h.start && min < h.end;
}

/** The next time the support hours open, to the minute. */
export function nextOpening(h: Hours, from = new Date()): Date | null {
  const step = 15 * 60 * 1000;
  let t = Math.ceil(from.getTime() / step) * step;
  for (let i = 0; i < 8 * 24 * 4; i++, t += step) {
    if (isLive(h, new Date(t))) {
      // Walk back to the exact opening minute.
      let exact = t;
      while (exact - 60000 > from.getTime() && isLive(h, new Date(exact - 60000))) exact -= 60000;
      return new Date(exact);
    }
  }
  return null;
}

export function supportStatus(at = new Date()): { live: boolean; nextOpening: string | null } {
  const h = parseHours(SUPPORT_HOURS);
  const live = isLive(h, at);
  return { live, nextOpening: live ? null : nextOpening(h, at)?.toISOString() ?? null };
}

/** Phone numbers as people type them: keep a leading +, drop spaces, dashes, dots and brackets. */
export function cleanPhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s\-.()]/g, "");
  return /^\+?\d{7,15}$/.test(s) ? s : null;
}
