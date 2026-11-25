// Minimal OSV + package registry mock for local tests.
// Real services: https://api.osv.dev, https://registry.npmjs.org, https://api.npmjs.org/downloads, https://pub.dev.
// Run the server with OSV_API_URL=http://localhost:8787 NPM_REGISTRY_URL=http://localhost:8787/npm
//   NPM_DOWNLOADS_URL=http://localhost:8787/downloads PUB_API_URL=http://localhost:8787/pub
import http from "node:http";

const VULNS = {
  "axios@0.21.0": ["GHSA-cph5-m8f7-6c5x", "GHSA-4w2v-q235-vp99"],
};
const DETAILS = {
  "GHSA-cph5-m8f7-6c5x": { id: "GHSA-cph5-m8f7-6c5x", aliases: ["CVE-2021-3749"], summary: "Inefficient regular expression complexity in axios", database_specific: { severity: "HIGH" } },
  "GHSA-4w2v-q235-vp99": { id: "GHSA-4w2v-q235-vp99", aliases: ["CVE-2020-28168"], summary: "Server-Side Request Forgery in axios", database_specific: { severity: "MODERATE" } },
};

// Packages that don't exist on the public registries (e.g. names invented by AI tools).
const MISSING = new Set(["react-native-secure-storage-pro", "flutter_secure_vault_pro"]);
const LOW_DOWNLOADS = { "rn-payflow-utils": 7 };

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      if (req.method === "POST" && req.url === "/v1/querybatch") {
        const { queries } = JSON.parse(body);
        const results = queries.map((q) => {
          const ids = VULNS[`${q.package.name}@${q.version}`] || [];
          return ids.length ? { vulns: ids.map((id) => ({ id, modified: "2026-01-01T00:00:00Z" })) } : {};
        });
        return res.end(JSON.stringify({ results }));
      }
      const npm = req.url.match(/^\/npm\/(.+)\/latest$/);
      if (npm) {
        const name = decodeURIComponent(npm[1]);
        if (MISSING.has(name)) return (res.statusCode = 404), res.end('"version not found: latest"');
        return res.end(JSON.stringify({ name, version: "9.9.9" }));
      }
      const dl = req.url.match(/^\/downloads\/point\/last-week\/(.+)$/);
      if (dl) {
        const name = decodeURIComponent(dl[1]);
        return res.end(JSON.stringify({ package: name, downloads: LOW_DOWNLOADS[name] ?? 250000 }));
      }
      const pub = req.url.match(/^\/pub\/api\/packages\/([^/]+)(\/score)?$/);
      if (pub) {
        const name = decodeURIComponent(pub[1]);
        if (MISSING.has(name)) return (res.statusCode = 404), res.end('{"error":{"code":"NotFound"}}');
        return res.end(JSON.stringify(pub[2] ? { grantedPoints: 140, likeCount: 10, downloadCount30Days: LOW_DOWNLOADS[name] ?? 90000 } : { name }));
      }
      const m = req.url.match(/^\/v1\/vulns\/(.+)$/);
      if (m && DETAILS[decodeURIComponent(m[1])]) return res.end(JSON.stringify(DETAILS[decodeURIComponent(m[1])]));
      res.statusCode = 404;
      res.end("{}");
    });
  })
  .listen(Number(process.env.PORT || 8787), () => console.log("mock OSV + registries on", process.env.PORT || 8787));
