import { Redis } from "@upstash/redis";

/**
 * Tiny storage layer. Uses Upstash Redis (Vercel Marketplace) when configured,
 * otherwise an in-memory store that only works for local development.
 */
interface KV {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown, ttlSec: number): Promise<void>;
  setNX(key: string, value: string, ttlSec: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  hset(key: string, field: string, value: string, ttlSec: number): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
  rpush(key: string, value: string): Promise<void>;
}

/**
 * Find Upstash REST credentials. Vercel's Marketplace integration names them KV_REST_API_URL/TOKEN,
 * or <PREFIX>_KV_REST_API_URL/TOKEN when a custom prefix is chosen; Upstash's own docs use
 * UPSTASH_REDIS_REST_URL/TOKEN. Accept all of them.
 */
function findRedisEnv(): { url?: string; token?: string } {
  const env = process.env;
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return { url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN };
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
    return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
  for (const [k, v] of Object.entries(env)) {
    const m = k.match(/^(.*)(KV_REST_API_URL|REDIS_REST_URL)$/);
    if (!m || !v) continue;
    const tok = env[`${m[1]}${m[2].replace(/URL$/, "TOKEN")}`];
    if (tok) return { url: v, token: tok };
  }
  return {};
}

const { url, token } = findRedisEnv();

function upstash(): KV {
  const r = new Redis({ url: url!, token: token!, automaticDeserialization: false });
  return {
    async getJSON(key) {
      const v = await r.get<string>(key);
      return v ? JSON.parse(v) : null;
    },
    async setJSON(key, value, ttl) {
      await r.set(key, JSON.stringify(value), { ex: ttl });
    },
    async setNX(key, value, ttl) {
      return (await r.set(key, value, { ex: ttl, nx: true })) === "OK";
    },
    async get(key) {
      return (await r.get<string>(key)) ?? null;
    },
    async hset(key, field, value, ttl) {
      await r.hset(key, { [field]: value });
      await r.expire(key, ttl);
    },
    async hgetall(key) {
      // With automaticDeserialization off, Upstash returns HGETALL as a flat [field, value, ...] array.
      const raw = (await r.hgetall(key)) as unknown;
      if (!raw) return {};
      if (Array.isArray(raw)) {
        const out: Record<string, string> = {};
        for (let i = 0; i + 1 < raw.length; i += 2) out[String(raw[i])] = String(raw[i + 1]);
        return out;
      }
      return raw as Record<string, string>;
    },
    async rpush(key, value) {
      await r.rpush(key, value);
    },
  };
}

type Entry = { v: any; exp: number };
const g = globalThis as unknown as { __mfsMem?: Map<string, Entry> };
const mem = (g.__mfsMem ??= new Map<string, Entry>());
const live = (k: string) => {
  const e = mem.get(k);
  if (!e) return undefined;
  if (e.exp && e.exp < Date.now()) {
    mem.delete(k);
    return undefined;
  }
  return e;
};

function memory(): KV {
  return {
    async getJSON(key) {
      const e = live(key);
      return e ? JSON.parse(e.v) : null;
    },
    async setJSON(key, value, ttl) {
      mem.set(key, { v: JSON.stringify(value), exp: Date.now() + ttl * 1000 });
    },
    async setNX(key, value, ttl) {
      if (live(key)) return false;
      mem.set(key, { v: value, exp: Date.now() + ttl * 1000 });
      return true;
    },
    async get(key) {
      return live(key)?.v ?? null;
    },
    async hset(key, field, value, ttl) {
      const e = live(key) ?? { v: {}, exp: 0 };
      e.v[field] = value;
      e.exp = Date.now() + ttl * 1000;
      mem.set(key, e);
    },
    async hgetall(key) {
      return { ...(live(key)?.v ?? {}) };
    },
    async rpush(key, value) {
      const e = live(key) ?? { v: [], exp: 0 };
      e.v.push(value);
      mem.set(key, e);
    },
  };
}

export const kv: KV = url && token ? upstash() : memory();
export const usingMemoryStore = !(url && token);

/**
 * The in-memory store is per server instance. On Vercel, parallel requests land on different
 * instances, so audits and reports get lost. Refuse to run there instead of failing silently.
 */
export const storageReady = !usingMemoryStore || !process.env.VERCEL;
export const STORAGE_NOT_READY =
  "MobileFirst Secure can't save audits right now because its server storage isn't configured. Please try again later. " +
  "(Operator: connect Upstash Redis to the Vercel project and redeploy.)";
if (!storageReady) console.error("[mobilefirst-secure] No Redis configured on Vercel: audits are disabled until Upstash is connected.");

export const TTL = {
  audit: 60 * 60 * 48, // 2 days to finish an audit
  report: 60 * 60 * 24 * Number(process.env.REPORT_TTL_DAYS || 90),
};
