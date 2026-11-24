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

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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
      return ((await r.hgetall<Record<string, string>>(key)) as Record<string, string>) || {};
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

export const TTL = {
  audit: 60 * 60 * 48, // 2 days to finish an audit
  report: 60 * 60 * 24 * Number(process.env.REPORT_TTL_DAYS || 90),
};
