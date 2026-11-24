// Minimal OSV API mock for local tests (the real API is https://api.osv.dev).
import http from "node:http";

const VULNS = {
  "axios@0.21.0": ["GHSA-cph5-m8f7-6c5x", "GHSA-4w2v-q235-vp99"],
};
const DETAILS = {
  "GHSA-cph5-m8f7-6c5x": { id: "GHSA-cph5-m8f7-6c5x", aliases: ["CVE-2021-3749"], summary: "Inefficient regular expression complexity in axios", database_specific: { severity: "HIGH" } },
  "GHSA-4w2v-q235-vp99": { id: "GHSA-4w2v-q235-vp99", aliases: ["CVE-2020-28168"], summary: "Server-Side Request Forgery in axios", database_specific: { severity: "MODERATE" } },
};

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
      const m = req.url.match(/^\/v1\/vulns\/(.+)$/);
      if (m && DETAILS[decodeURIComponent(m[1])]) return res.end(JSON.stringify(DETAILS[decodeURIComponent(m[1])]));
      res.statusCode = 404;
      res.end("{}");
    });
  })
  .listen(Number(process.env.PORT || 8787), () => console.log("mock OSV on", process.env.PORT || 8787));
