import type { Dependency, DependencyVuln, Severity } from "./types";

// Free, no-key vulnerability database: https://osv.dev
const OSV = process.env.OSV_API_URL || "https://api.osv.dev";
const SUPPORTED = new Set(["npm", "Pub", "Maven", "SwiftURL"]);
const MAX_DETAILS = 60;

export interface DepScan {
  status: "done" | "skipped" | "unavailable";
  vulns: DependencyVuln[];
}

const rank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const maxSev = (a: Severity, b: Severity) => (rank[a] >= rank[b] ? a : b);

function sevFrom(detail: any): Severity {
  const ds = String(detail?.database_specific?.severity || "").toUpperCase();
  if (ds === "CRITICAL") return "critical";
  if (ds === "HIGH") return "high";
  if (ds === "MODERATE" || ds === "MEDIUM") return "medium";
  if (ds === "LOW") return "low";
  return "medium";
}

async function fetchJson(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`OSV ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function scanDependencies(deps: Dependency[] | undefined): Promise<DepScan> {
  const list = (deps || []).filter((d) => SUPPORTED.has(d.ecosystem) && d.name && d.version).slice(0, 1000);
  if (!list.length) return { status: "skipped", vulns: [] };

  try {
    const batch = await fetchJson(
      `${OSV}/v1/querybatch`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          queries: list.map((d) => ({ package: { name: d.name, ecosystem: d.ecosystem }, version: d.version.replace(/^[\^~=v]/, "") })),
        }),
      },
      8000
    );

    const hits: { dep: Dependency; ids: string[] }[] = [];
    (batch.results || []).forEach((r: any, i: number) => {
      const ids = (r?.vulns || []).map((v: any) => v.id);
      if (ids.length) hits.push({ dep: list[i], ids });
    });
    if (!hits.length) return { status: "done", vulns: [] };

    const uniqueIds = [...new Set(hits.flatMap((h) => h.ids))].slice(0, MAX_DETAILS);
    const details = new Map<string, any>();
    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          details.set(id, await fetchJson(`${OSV}/v1/vulns/${encodeURIComponent(id)}`, {}, 6000));
        } catch {
          /* keep going with what we have */
        }
      })
    );

    const vulns: DependencyVuln[] = hits.map(({ dep, ids }) => {
      let severity: Severity = "low";
      let summary: string | undefined;
      const labels = new Set<string>();
      for (const id of ids) {
        const d = details.get(id);
        severity = maxSev(severity, d ? sevFrom(d) : "medium");
        summary ||= d?.summary;
        const cve = (d?.aliases || []).find((a: string) => a.startsWith("CVE-"));
        labels.add(cve || id);
      }
      return { package: dep.name, version: dep.version, ecosystem: dep.ecosystem, ids: [...labels].slice(0, 5), summary, severity };
    });
    vulns.sort((a, b) => rank[b.severity] - rank[a.severity]);
    return { status: "done", vulns };
  } catch {
    return { status: "unavailable", vulns: [] };
  }
}
