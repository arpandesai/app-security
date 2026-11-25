import type { Dependency, RegistryFlag } from "./types";

// Public package registries, no keys needed. Overridable for tests.
const NPM_REGISTRY = process.env.NPM_REGISTRY_URL || "https://registry.npmjs.org";
const NPM_DOWNLOADS = process.env.NPM_DOWNLOADS_URL || "https://api.npmjs.org/downloads";
const PUB_API = process.env.PUB_API_URL || "https://pub.dev";

/** Weekly npm / monthly pub.dev downloads below these look suspicious for a direct dependency. */
const NPM_MIN_WEEKLY = 50;
const PUB_MIN_MONTHLY = 100;
const MAX_PACKAGES = 250;
const CONCURRENCY = 12;

/** Flutter SDK packages are listed in pubspec.yaml but don't live on pub.dev. */
const PUB_SDK = new Set(["flutter", "flutter_test", "flutter_localizations", "flutter_driver", "flutter_web_plugins", "integration_test"]);

export interface RegistryScan {
  status: "done" | "skipped" | "unavailable";
  flags: RegistryFlag[];
}

/** Versions that don't come from the public registry: local paths, workspaces, git, URLs, aliases. */
const nonRegistry = (v: string) => /^(workspace:|file:|link:|portal:|git|github:|https?:|npm:|path:|sdk)/i.test(v.trim());

type Outcome = RegistryFlag | null | "error";

async function getJson(url: string, ms: number): Promise<{ status: number; body: any }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    return { status: res.status, body: res.ok ? await res.json().catch(() => null) : null };
  } finally {
    clearTimeout(t);
  }
}

async function checkNpm(d: Dependency): Promise<Outcome> {
  const name = d.name.startsWith("@") ? "@" + encodeURIComponent(d.name.slice(1)) : encodeURIComponent(d.name);
  // /latest returns one small manifest; 404 means the package doesn't exist (or was unpublished).
  const meta = await getJson(`${NPM_REGISTRY}/${name}/latest`, 5000);
  if (meta.status === 404) return { ecosystem: d.ecosystem, package: d.name, version: d.version, reason: "not_found" };
  if (meta.status !== 200) return "error";
  const dl = await getJson(`${NPM_DOWNLOADS}/point/last-week/${d.name}`, 5000).catch(() => null);
  const downloads = dl?.status === 200 ? Number(dl.body?.downloads) : NaN;
  if (Number.isFinite(downloads) && downloads < NPM_MIN_WEEKLY) {
    return { ecosystem: d.ecosystem, package: d.name, version: d.version, reason: "low_downloads", downloads };
  }
  return null;
}

async function checkPub(d: Dependency): Promise<Outcome> {
  const pkg = `${PUB_API}/api/packages/${encodeURIComponent(d.name)}`;
  // The score endpoint is small; only fall back to package metadata when it doesn't answer.
  const score = await getJson(`${pkg}/score`, 5000);
  if (score.status !== 200) {
    const meta = await getJson(pkg, 5000);
    if (meta.status === 404) return { ecosystem: d.ecosystem, package: d.name, version: d.version, reason: "not_found" };
    return meta.status === 200 ? null : "error";
  }
  const downloads = Number(score.body?.downloadCount30Days);
  if (Number.isFinite(downloads) && downloads < PUB_MIN_MONTHLY) {
    return { ecosystem: d.ecosystem, package: d.name, version: d.version, reason: "low_downloads", downloads };
  }
  return null;
}

/**
 * Checks direct dependencies against npm and pub.dev: packages that don't exist there
 * (often names invented by AI coding tools, or typos that attackers register) and packages
 * almost nobody downloads. Private packages from your own registry also show as not found.
 */
export async function checkRegistries(deps: Dependency[] | undefined): Promise<RegistryScan> {
  const list = (deps || [])
    .filter((d) => (d.ecosystem === "npm" || d.ecosystem === "Pub") && d.name && !nonRegistry(d.version || ""))
    .filter((d) => !(d.ecosystem === "Pub" && PUB_SDK.has(d.name)))
    .slice(0, MAX_PACKAGES);
  if (!list.length) return { status: "skipped", flags: [] };

  const outcomes: Outcome[] = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      try {
        outcomes[i] = list[i].ecosystem === "npm" ? await checkNpm(list[i]) : await checkPub(list[i]);
      } catch {
        outcomes[i] = "error";
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, worker));

  const errors = outcomes.filter((o) => o === "error").length;
  // If most lookups failed, the registry was unreachable: don't guess.
  if (errors > list.length / 2) return { status: "unavailable", flags: [] };
  const flags = outcomes.filter((o): o is RegistryFlag => !!o && o !== "error");
  flags.sort((a, b) => (a.reason === b.reason ? a.package.localeCompare(b.package) : a.reason === "not_found" ? -1 : 1));
  return { status: "done", flags };
}
