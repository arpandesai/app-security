import type { Category, PlatformKind, Rule } from "../types";
import { SECRETS_RULES, BACKEND_RULES } from "./secrets";
import { STORAGE_RULES, CRYPTO_RULES, AUTH_RULES } from "./data";
import { NETWORK_RULES, PLATFORM_RULES } from "./platform";
import { CODE_RULES, RESILIENCE_RULES, PRIVACY_RULES } from "./code";
import { AI_RULES } from "./ai";
import { WEB_SUPPORT, WEB_RULES } from "./web";
import { SERVER_SUPPORT, SERVER_SIDE_RULES } from "./server";
import { META } from "./meta";

export const RULESET_VERSION = "2026.11.4";

/** Category order = the order the agent works through them. Names never contain "and" or "&". */
export const CATEGORIES: { id: Category; name: string }[] = [
  { id: "SECRETS", name: "Exposed Secrets" },
  { id: "BACKEND", name: "Backend Exposure" },
  { id: "STORAGE", name: "Data Storage" },
  { id: "NETWORK", name: "Network Security" },
  { id: "AUTH", name: "Authentication" },
  { id: "CRYPTO", name: "Cryptography" },
  { id: "PLATFORM", name: "Platform Interaction" },
  { id: "AI", name: "AI Features" },
  { id: "CODE", name: "Code Health" },
  { id: "PRIVACY", name: "Privacy" },
  { id: "RESILIENCE", name: "Tamper Resistance" },
];

export const categoryName = (c: Category) => CATEGORIES.find((x) => x.id === c)?.name ?? c;

export const ALL_RULES: Rule[] = [
  ...SECRETS_RULES,
  ...BACKEND_RULES,
  ...STORAGE_RULES,
  ...NETWORK_RULES,
  ...AUTH_RULES,
  ...CRYPTO_RULES,
  ...PLATFORM_RULES,
  ...AI_RULES,
  ...CODE_RULES,
  ...PRIVACY_RULES,
  ...RESILIENCE_RULES,
  ...WEB_RULES,
  ...SERVER_SIDE_RULES,
];

// Platforms: web-only rules say so themselves; shared rules gain web variants and wording; everything else is mobile only.
for (const r of ALL_RULES) {
  const w = WEB_SUPPORT[r.id];
  if (w) {
    if (w.mobileOnlyAny) r.variants = r.variants.map((v) => (v.target === "any" ? { ...v, target: "mobile" as const } : v));
    r.variants = [...r.variants, ...(w.variants || [])];
    if (w.web) r.web = w.web;
    r.platforms = ["mobile", "web"];
  } else if (!r.platforms) {
    r.platforms = ["mobile"];
  }
  // Node.js servers: checks that apply to server code gain server variants and wording.
  const s = SERVER_SUPPORT[r.id];
  if (s) {
    r.variants = [...r.variants, ...(s.variants || [])];
    if (s.server && Object.keys(s.server).length) r.server = s.server;
    if (!r.platforms.includes("server")) r.platforms = [...r.platforms, "server"];
  }
}

// Attach level + standards crosswalk; trust-level rules only apply to high-value apps.
for (const r of ALL_RULES) {
  const m = META[r.id];
  if (!m) throw new Error(`Rule ${r.id} has no entry in rules/meta.ts`);
  r.level = m.level;
  r.standards = m.standards;
  r.highValueOnly = m.level === "trust";
}

export const LEVEL_NAMES = { launch: "Launch", scale: "Scale", trust: "Trust" } as const;

const BY_ID = new Map(ALL_RULES.map((r) => [r.id, r]));
export const getRule = (id: string) => BY_ID.get(id);

// Guard against accidental duplicates or banned words in titles.
for (const r of ALL_RULES) {
  for (const t of [r.title, r.web?.title, r.server?.title]) {
    if (t && /\band\b|&/i.test(t)) throw new Error(`Rule title must not contain "and"/"&": ${r.id}`);
  }
}
for (const id of Object.keys(WEB_SUPPORT)) if (!BY_ID.has(id)) throw new Error(`rules/web.ts lists unknown rule ${id}`);
for (const id of Object.keys(SERVER_SUPPORT)) if (!BY_ID.has(id)) throw new Error(`rules/server.ts lists unknown rule ${id}`);

/** Which standards belong to which platform. Everything else (ASVS, API, LLM, Agentic) applies to both. */
const MOBILE_STANDARD = /^Mobile Top 10/;
const WEB_STANDARD = /^Top 10 2025/;

/**
 * A rule as the audited project should see it.
 * Wording: a web app (with or without its own server) gets web wording; a server on its own gets server wording;
 * anything with a mobile app keeps the default wording.
 * Standards: mobile standards only when there's a mobile app, web standards only when there's web or server code.
 */
export function viewRule(rule: Rule, kinds: Record<PlatformKind, boolean>): Rule {
  const text = kinds.mobile ? undefined : kinds.web ? rule.web : kinds.server ? rule.server : undefined;
  const standards = (rule.standards || []).filter(
    (s) => !(!kinds.mobile && MOBILE_STANDARD.test(s)) && !(!kinds.web && !kinds.server && WEB_STANDARD.test(s))
  );
  return { ...rule, ...(text || {}), standards };
}
if (BY_ID.size !== ALL_RULES.length) throw new Error("Duplicate rule IDs in catalog");
for (const id of Object.keys(META)) if (!BY_ID.has(id)) throw new Error(`rules/meta.ts lists unknown rule ${id}`);
