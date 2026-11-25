import type { Category, Rule } from "../types";
import { SECRETS_RULES, BACKEND_RULES } from "./secrets";
import { STORAGE_RULES, CRYPTO_RULES, AUTH_RULES } from "./data";
import { NETWORK_RULES, PLATFORM_RULES } from "./platform";
import { CODE_RULES, RESILIENCE_RULES, PRIVACY_RULES } from "./code";
import { AI_RULES } from "./ai";
import { META } from "./meta";

export const RULESET_VERSION = "2026.11.2";

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
];

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
  if (/\band\b|&/i.test(r.title)) throw new Error(`Rule title must not contain "and"/"&": ${r.id}`);
}
if (BY_ID.size !== ALL_RULES.length) throw new Error("Duplicate rule IDs in catalog");
for (const id of Object.keys(META)) if (!BY_ID.has(id)) throw new Error(`rules/meta.ts lists unknown rule ${id}`);
