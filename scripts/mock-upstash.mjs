// Minimal Upstash Redis REST API mock for local tests of the Redis code path.
// Mirrors Upstash behaviour that matters here: HGETALL returns a flat array, and
// string results are base64-encoded when the client sends "Upstash-Encoding: base64".
import http from "node:http";

const db = new Map(); // key -> { v: string | Map | string[], exp: number }
const now = () => Date.now();
const get = (k) => {
  const e = db.get(k);
  if (e && e.exp && e.exp < now()) { db.delete(k); return undefined; }
  return e;
};

function run([cmd, ...a]) {
  switch (String(cmd).toUpperCase()) {
    case "GET": { const e = get(a[0]); return e && typeof e.v === "string" ? e.v : null; }
    case "SET": {
      const [k, v, ...opts] = a; const o = opts.map((x) => String(x).toUpperCase());
      if (o.includes("NX") && get(k)) return null;
      const exIdx = o.indexOf("EX");
      db.set(k, { v: String(v), exp: exIdx >= 0 ? now() + Number(opts[exIdx + 1]) * 1000 : 0 });
      return "OK";
    }
    case "HSET": {
      const [k, ...fv] = a; const e = get(k) ?? { v: new Map(), exp: 0 }; let added = 0;
      for (let i = 0; i < fv.length; i += 2) { if (!e.v.has(String(fv[i]))) added++; e.v.set(String(fv[i]), String(fv[i + 1])); }
      db.set(k, e); return added;
    }
    case "HGET": { const e = get(a[0]); return e ? (e.v.get(String(a[1])) ?? null) : null; }
    case "HDEL": { const e = get(a[0]); if (!e) return 0; let n = 0; for (const f of a.slice(1)) if (e.v.delete(String(f))) n++; return n; }
    case "HGETALL": { const e = get(a[0]); return e ? [...e.v].flat() : []; }
    case "EXPIRE": { const e = get(a[0]); if (!e) return 0; e.exp = now() + Number(a[1]) * 1000; return 1; }
    case "DEL": { let n = 0; for (const k of a) if (db.delete(k)) n++; return n; }
    case "RPUSH": { const [k, ...vals] = a; const e = get(k) ?? { v: [], exp: 0 }; e.v.push(...vals.map(String)); db.set(k, e); return e.v.length; }
    case "LRANGE": { const e = get(a[0]); if (!e) return []; const s = Number(a[1]), t = Number(a[2]); return e.v.slice(s, t === -1 ? undefined : t + 1); }
    default: throw new Error(`unsupported command ${cmd}`);
  }
}

const enc = (x, b64) => (!b64 ? x : typeof x === "string" ? Buffer.from(x).toString("base64") : Array.isArray(x) ? x.map((y) => enc(y, b64)) : x);

http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const b64 = String(req.headers["upstash-encoding"] || "").toLowerCase() === "base64";
    res.setHeader("content-type", "application/json");
    try {
      const parsed = JSON.parse(body || "[]");
      if (req.url.startsWith("/pipeline") || req.url.startsWith("/multi-exec")) {
        return res.end(JSON.stringify(parsed.map((c) => { try { return { result: enc(run(c), b64) }; } catch (e) { return { error: e.message }; } })));
      }
      res.end(JSON.stringify({ result: enc(run(parsed), b64) }));
    } catch (e) {
      res.statusCode = 400; res.end(JSON.stringify({ error: e.message }));
    }
  });
}).listen(Number(process.env.PORT || 8788), () => console.log("mock Upstash on", process.env.PORT || 8788));
