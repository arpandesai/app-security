"""Builds the Framework page (public/framework.html) and its image (public/framework.png) from the live ruleset.

Run from the repo root: npm run framework
The page is served at /framework. The image needs Python Playwright (pip install playwright) and a Chromium;
set CHROME_PATH to use an installed Chrome. Without Playwright, only the page is rebuilt.
"""
import base64, collections, html, json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
D = json.loads(subprocess.run([os.path.join(ROOT, "node_modules/.bin/tsx"), os.path.join(HERE, "dump.ts")],
                              cwd=ROOT, check=True, capture_output=True, text=True).stdout)
OUT = os.path.join(ROOT, "public/framework.html")
IMG = os.path.join(ROOT, "public/framework.png")
IMG_HTML = os.path.join(HERE, ".image.html")

e = lambda s: html.escape(str(s), quote=True)


def prose(s):
    """Escape, then turn `code` spans into <code>."""
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", e(s))


def split_globs(g):
    return [x.strip() for x in re.split(r",(?![^{]*\})", g) if x.strip()]


# ---------- framework structure (matches the published framework image) ----------
LAYERS = [
    ("01", "Keys", "What attackers grab first",
     "Credentials and backend controls that give direct access to data, money or infrastructure.",
     [("SECRETS", "Secret keys, AI keys, signing keys, AI tool configs, values exposed to the browser"),
      ("BACKEND", "Supabase admin key, row-level security, Firebase rules, server-side permissions, purchases, limits on paid APIs, CORS, server-side requests, mass assignment, private fields")]),
    ("02", "Data", "Stored, sent, encrypted",
     "How user data is kept on the device or in the browser, protected in transit and encrypted.",
     [("STORAGE", "Tokens at rest, browser storage, shared files, logs, backups, local databases"),
      ("NETWORK", "Plain HTTP, certificate checks, pinning"),
      ("CRYPTO", "Hardcoded keys, weak ciphers, hashing, random values")]),
    ("03", "Access", "Who gets in, what they reach",
     "Identity, the app's surface to other apps, sites and the browser, and AI features acting for the user.",
     [("AUTH", "Biometric bypass, login flow, login tokens, brute force, logout, confirming sensitive changes, session cookies, CSRF"),
      ("PLATFORM", "Exported components, deep links, WebViews, sensitive data on screen, unsafe HTML, security headers, open redirects"),
      ("AI", "Unsafe AI output, prompt injection, AI acting beyond the user's permissions")]),
    ("04", "Release", "What ships to users",
     "The supply chain, store and privacy obligations, and what an attacker can learn from the shipped app or site.",
     [("CODE", "Vulnerable libraries, fake packages, SDK targets, test leftovers, injection, file uploads, remote switches"),
      ("PRIVACY", "Permissions, Apple privacy manifest, tracking consent, third-party sharing, account deletion"),
      ("RESILIENCE", "Debug builds, readable code, source maps, device attestation")]),
]
LEVELS = [
    ("launch", "Launch", "Every app, before it goes live",
     "Applies to every app. Issues at this level are what attackers find first; fix before release."),
    ("scale", "Scale", "Once real users depend on it",
     "Applies to every app. Hardening, privacy and store obligations that matter as usage and scrutiny grow."),
    ("trust", "Trust", "Apps handling money, health or identity data",
     "Applies only when the app handles money, health or identity data. The agent judges this from the code and the app description and answers not_applicable otherwise."),
]
TARGET_NAMES = {"any": "All stacks", "mobile": "Mobile stacks", "react-native": "React Native", "expo": "Expo", "flutter": "Flutter",
                "android": "Android", "ios": "iOS", "web": "Web stacks", "nextjs": "Next.js", "react-web": "React (Vite, CRA)", "server": "Node.js servers",
                "firebase": "Firebase", "supabase": "Supabase"}
PLATFORM_NAMES = {"mobile": "Mobile", "web": "Web", "server": "Server"}
SEV = ["critical", "high", "medium", "low"]
WEIGHT = {"critical": 25, "high": 12, "medium": 5, "low": 2}

cats = {c["id"]: c for c in D["categories"]}
rules = [r for c in D["categories"] for r in c["rules"]]
sev_total = collections.Counter(r["severity"] for r in rules)
lvl_total = collections.Counter(r["level"] for r in rules)
n_variants = sum(len(r["variants"]) for r in rules)
n_web_variants = sum(1 for r in rules for v in r["variants"] if v["target"] == "web")
on = lambda r, k: k in r["platforms"]
n_mobile = sum(1 for r in rules if on(r, "mobile"))
n_web = sum(1 for r in rules if on(r, "web"))
n_server = sum(1 for r in rules if on(r, "server"))
n_all = sum(1 for r in rules if len(r["platforms"]) == 3)
n_mobile_only = sum(1 for r in rules if r["platforms"] == ["mobile"])
SC = {x["name"]: x["checks"] for x in D["stackCounts"]}

# standards coverage, computed from the catalog
fam = collections.defaultdict(set)
masvs, maswe, cwe = set(), set(), set()
for r in rules:
    for s in r["standards"]:
        fam[s.split(":")[0]].add(s)
    masvs.update(r["refs"].get("masvs", []))
    maswe.update(r["refs"].get("maswe", []))
    cwe.update(r["refs"].get("cwe", []))


def sev_line(rs):
    c = collections.Counter(r["severity"] for r in rs)
    return " ".join(f'<span class="dot d-{s}"></span>{c[s]} {s}' for s in SEV if c[s])


def plat_line(rs):
    m = sum(1 for r in rs if on(r, "mobile"))
    w = sum(1 for r in rs if on(r, "web"))
    sv = sum(1 for r in rs if on(r, "server"))
    return f"{m} mobile, {w} web, {sv} server"


def pill(cls, text):
    return f'<span class="pill {cls}">{e(text)}</span>'


def fonts():
    A = os.path.join(ROOT, "node_modules/@fontsource/")
    J = A + "jetbrains-mono/files/"
    files = [("Inter", 400, A + "inter/files/inter-latin-400-normal.woff2"),
             ("Inter", 500, A + "inter/files/inter-latin-500-normal.woff2"),
             ("Inter", 600, A + "inter/files/inter-latin-600-normal.woff2"),
             ("Space Grotesk", 500, A + "space-grotesk/files/space-grotesk-latin-500-normal.woff2"),
             ("Space Grotesk", 600, A + "space-grotesk/files/space-grotesk-latin-600-normal.woff2"),
             ("Space Grotesk", 700, A + "space-grotesk/files/space-grotesk-latin-700-normal.woff2"),
             ("JetBrains Mono", 400, J + "jetbrains-mono-latin-400-normal.woff2"),
             ("JetBrains Mono", 500, J + "jetbrains-mono-latin-500-normal.woff2")]
    out = []
    for fam_, w, p in files:
        b64 = base64.b64encode(open(p, "rb").read()).decode()
        out.append(f'@font-face{{font-family:"{fam_}";font-style:normal;font-weight:{w};font-display:swap;'
                   f'src:url(data:font/woff2;base64,{b64}) format("woff2")}}')
    return "\n".join(out)


# ---------- framework map ----------
def framework_map():
    lv = "".join(
        f'<div class="lv lv-{k}"><div class="lv-n">{lvl_total[k]}</div><div><b>{name} level</b><span>{e(sub)}</span></div></div>'
        for k, name, sub, _ in LEVELS)
    rows = []
    for num, name, sub, _, areas in LAYERS:
        cards = []
        for cid, scope in areas:
            c = cats[cid]
            new = ' <span class="new">New</span>' if cid == "AI" else ""
            cards.append(
                f'<a class="area" href="#{cid.lower()}"><div class="area-h"><b>{e(c["name"])}{new}</b>'
                f'<span>{len(c["rules"])} checks</span></div><p>{e(scope)}</p>'
                f'<div class="plat">{plat_line(c["rules"])}</div>'
                f'<div class="sevs">{sev_line(c["rules"])}</div></a>')
        rows.append(f'<div class="layer"><div class="layer-l"><span class="layer-n">{num}</span>'
                    f'<b>{name}</b><span>{e(sub)}</span></div><div class="layer-a n{len(areas)}">{"".join(cards)}</div></div>')
    chips = lambda xs: "".join(f'<span class="chip">{e(x)}</span>' for x in xs)
    stds = chips(["OWASP MASVS v2.1", "MASWE", "CWE", "Top 10 2025", "Mobile Top 10 2024", "ASVS 5.0", "API Security Top 10 2023",
                  "LLM Top 10 2025", "Agentic Top 10 2026"])
    return f'''<div class="map">
  <div class="map-levels">{lv}</div>
  <div class="map-layers">{"".join(rows)}</div>
  <div class="map-foot">
    <div><b>Mobile, {n_mobile} checks</b><div class="chips">{chips(["React Native", "Expo", "Flutter", "Android", "iOS"])}</div></div>
    <div><b>Web, {n_web} checks</b><div class="chips">{chips(["Next.js", "React (Vite)", "React (CRA)"])}</div></div>
    <div><b>Extra checks for</b><div class="chips">{chips(["Firebase", "Supabase"])}</div></div>
    <div class="mf-std"><b>Maps to</b><div class="chips">{stds}</div></div>
  </div>
</div>'''


# ---------- rule cards ----------
def variants_table(r):
    rows = []
    for v in r["variants"]:
        files = "".join(f"<code>{e(g)}</code>" for gl in v.get("lookIn", []) for g in split_globs(gl))
        pats = "".join(f"<code>{e(p)}</code>" for p in v.get("searchFor", []))
        hint = f'<div class="hint">{prose(v["hint"])}</div>' if v.get("hint") else ""
        rows.append(
            f'<tr><td><b>{e(TARGET_NAMES.get(v["target"], v["target"]))}</b><div class="muted">{e(v.get("scope", ""))}</div></td>'
            f'<td><div class="codes">{files or "<span class=muted>—</span>"}</div></td>'
            f'<td><div class="codes">{pats or "<span class=muted>Read the files above</span>"}{hint and ""}</div>{hint}</td></tr>')
    return ('<div class="tw"><table class="vt"><thead><tr><th>Stack</th><th>Files inspected</th><th>Search patterns</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


def refs(r):
    parts = []
    for key, label in (("masvs", "MASVS"), ("maswe", "MASWE"), ("cwe", "CWE")):
        vals = r["refs"].get(key, [])
        if vals:
            parts.append(f'<div><span class="rk">{label}</span>{" ".join(f"<code>{e(v)}</code>" for v in vals)}</div>')
    if r["standards"]:
        parts.append('<div><span class="rk">Crosswalk</span>' + "".join(f'<span class="std">{e(s)}</span>' for s in r["standards"]) + "</div>")
    return "".join(parts)


def flags(r):
    out = []
    if r["serverEvaluated"]:
        out.append("Evaluated on the server from OSV.dev vulnerability data, not by the agent's judgement.")
    if r["registryCheck"]:
        out.append("The server adds npm and pub.dev registry results: a package the registry doesn't know is flagged high; a rarely used one (npm under 50 weekly downloads, pub.dev under 100 monthly) medium.")
    if r["highValueOnly"]:
        out.append("Trust level: applies only to apps handling money, health or identity data.")
    return "".join(f'<p class="flag">{e(f)}</p>' for f in out)


PLAT_FIELDS = [("title", "Title"), ("check", "Inspect"), ("failIf", "Fails when"), ("passIf", "Passes when"),
              ("founder", "Impact"), ("fix", "Remediation")]


def platform_wording(r):
    out = []
    for key, heading, note in [
        ("web", "Wording on web projects", "Replaces the fields above when the project is a web app, with or without its own server."),
        ("server", "Wording on server projects", "Replaces the fields above when the project is a Node.js server on its own."),
    ]:
        w = r.get(key) or {}
        rows = "".join(f'<div class="rk">{label}</div><div>{prose(w[k])}</div>' for k, label in PLAT_FIELDS if w.get(k))
        if rows:
            out.append(f'<h5>{heading}</h5><p class="wnote">{note} A project with a mobile app keeps the default wording.</p>'
                       f'<div class="rgrid wgrid">{rows}</div>')
    return "".join(out)


def rule_card(r):
    tg = sorted({v["target"] for v in r["variants"]}, key=lambda t: list(TARGET_NAMES).index(t))
    tchips = "".join(f'<span class="chip sm">{e(TARGET_NAMES[t])}</span>' for t in tg)
    pchips = "".join(f'<span class="chip sm pl-{k}">{PLATFORM_NAMES[k]}</span>' for k in r["platforms"])
    pl = r["platforms"]
    only = (pill("only", PLATFORM_NAMES[pl[0]] + " only") if len(pl) == 1
            else pill("only", "Server side") if pl == ["web", "server"] else "")
    return f'''<details class="rule" id="{e(r["id"].lower())}" data-platforms="{" ".join(r["platforms"])}">
  <summary>
    <span class="rid">{e(r["id"])}</span>
    <span class="rt">{e(r["title"])}</span>
    <span class="rmeta">{only}{pill("s-" + r["severity"], r["severity"])}{pill("l-" + r["level"], r["level"].capitalize())}</span>
  </summary>
  <div class="rb">
    <div class="rgrid">
      <div class="rk">Platforms</div><div class="chips">{pchips}</div>
      <div class="rk">Stacks</div><div class="chips">{tchips}</div>
      <div class="rk">Inspect</div><div>{prose(r["check"])}</div>
      <div class="rk">Fails when</div><div>{prose(r["failIf"])}</div>
      <div class="rk">Passes when</div><div>{prose(r["passIf"])}</div>
      <div class="rk">Weight</div><div><code>{WEIGHT[r["severity"]]}</code> points in the score ({e(r["severity"])})</div>
    </div>
    {flags(r)}
    <h5>Where to look</h5>
    {variants_table(r)}
    <div class="rgrid">
      <div class="rk">Impact</div><div>{prose(r["founder"])}</div>
      <div class="rk">Remediation</div><div>{prose(r["fix"])}</div>
    </div>
    {platform_wording(r)}
    <div class="refs">{refs(r)}</div>
  </div>
</details>'''


def checks_section():
    out = []
    for num, name, sub, desc, areas in LAYERS:
        out.append(f'<div class="lh" id="layer-{name.lower()}"><span class="layer-n">{num}</span><div><h2>{name}</h2><p>{e(desc)}</p></div></div>')
        for cid, scope in areas:
            c = cats[cid]
            out.append(f'<section class="area-sec" id="{cid.lower()}"><div class="area-head"><h3>{e(c["name"])}</h3>'
                       f'<div class="sevs">{len(c["rules"])} checks ({plat_line(c["rules"])}): {sev_line(c["rules"])}</div></div>'
                       f'<p class="area-scope">{e(scope)}.</p>'
                       + "".join(rule_card(r) for r in c["rules"]) + "</section>")
    return "\n".join(out)


# ---------- parameters ----------
def layers_table():
    rows = "".join(
        f'<tr><td><span class="layer-n sm">{num}</span> {name}</td><td>{", ".join(e(cats[c]["name"]) for c, _ in areas)}</td>'
        f'<td class="d">{e(desc)}</td><td class="num">{sum(len(cats[c]["rules"]) for c, _ in areas)}</td></tr>'
        for num, name, sub, desc, areas in LAYERS)
    return f'<div class="tw"><table><thead><tr><th>Layer</th><th>Areas</th><th>Focus</th><th class="num">Checks</th></tr></thead><tbody>{rows}</tbody></table></div>'


def levels_table():
    rows = "".join(
        f'<tr><td>{pill("l-" + k, name)}</td><td class="num">{lvl_total[k]}</td><td>{e(sub)}</td><td class="d">{e(rule)}</td></tr>'
        for k, name, sub, rule in LEVELS)
    return f'<div class="tw"><table><thead><tr><th>Level</th><th class="num">Checks</th><th>Audience</th><th>Applicability</th></tr></thead><tbody>{rows}</tbody></table></div>'


SEV_DEF = {
    "critical": "Directly exposes user data, money, accounts or infrastructure, with a precondition any attacker can meet: having a copy of the app, opening the site, or sharing a public network.",
    "high": "A serious exposure that needs a more specific precondition: a malicious app on the device, a crafted link or post, a signed-in user visiting another site, a lost or rooted device, or a particular user action.",
    "medium": "Weakens a defence, exposes limited data, or breaks a privacy or store obligation.",
    "low": "Hardening that raises the cost of an attack without closing a direct exposure.",
}
SEV_EFFECT = {"critical": "Verdict: Not safe to launch; score capped at 39",
              "high": "Verdict: Fix before launch; score capped at 74",
              "medium": "Lowers the score", "low": "Lowers the score"}


def severity_table():
    rows = "".join(
        f'<tr><td>{pill("s-" + s, s)}</td><td class="num">{sev_total[s]}</td><td class="num">{WEIGHT[s]}</td>'
        f'<td class="d">{e(SEV_DEF[s])}</td><td class="d">{e(SEV_EFFECT[s])}</td></tr>' for s in SEV)
    return f'<div class="tw"><table><thead><tr><th>Severity</th><th class="num">Checks</th><th class="num">Weight</th><th>Definition</th><th>Effect</th></tr></thead><tbody>{rows}</tbody></table></div>'


ANATOMY = [
    ("id", "string", "<code>MFS-&lt;AREA&gt;-&lt;NN&gt;</code>. Stable across ruleset versions: retired IDs leave a gap instead of being reassigned."),
    ("area", "enum", "One of the 11 areas; the area fixes the layer."),
    ("severity", "enum", "critical, high, medium or low. Sets the weight and the verdict cap."),
    ("level", "enum", "launch, scale or trust. Trust checks apply only to apps handling money, health or identity data."),
    ("platforms", "list", "mobile, web, server. A check runs when it covers one of the project's platforms; a project with several runs the union."),
    ("check", "text", "What the auditor must verify, written so a coding agent can execute it on source code."),
    ("failIf", "text", "The exact condition for a fail. A fail must carry evidence: file, line and snippet."),
    ("passIf", "text", "The exact condition for a pass."),
    ("variants[]", "list", "One entry per stack target, each with its own scope, files and search patterns. Only variants matching the detected stack are run. On web-only projects, mobile file types are dropped from variants shared with mobile."),
    ("variants[].lookIn", "globs", "Files to inspect, relative to the repository root."),
    ("variants[].searchFor", "regex", "Patterns that locate candidate code quickly. A match is a lead to read, not a verdict on its own."),
    ("variants[].hint", "text", "Stack-specific guidance, including when to answer not_applicable or unable_to_check."),
    ("fix", "text", "Remediation for the developer, specific to the stack where possible."),
    ("web", "object", "Web wording for a check shared with mobile: title, check, failIf, passIf, impact and fix. Used when the project is a web app, with or without its own server; a project with a mobile app keeps the default wording."),
    ("server", "object", "Server wording, with the same fields. Used when the project is a Node.js server on its own."),
    ("refs", "lists", "OWASP MASVS v2.1 controls, MASWE weaknesses and CWE entries."),
    ("standards", "list", "Crosswalk to OWASP Top 10 2025, Mobile Top 10 2024, ASVS 5.0, API Security Top 10 2023, LLM Top 10 2025 and Agentic Top 10 2026. Web-only reports show web standards only; mobile-only reports show mobile standards only."),
    ("serverEvaluated", "flag", "The result comes from server-side data (OSV.dev), not the agent."),
    ("registryCheck", "flag", "The server adds public registry results (npm, pub.dev) to the agent's result."),
]


def anatomy_table():
    rows = "".join(f'<tr><td class="mono">{f}</td><td>{t}</td><td class="d">{d}</td></tr>' for f, t, d in ANATOMY)
    return f'<div class="tw"><table><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>{rows}</tbody></table></div>'


STATUSES = [
    ("fail", "Evidence required: file, line and a snippet of at most 3 lines, secrets masked. Counts against the score at the check's weight."),
    ("pass", "The pass condition holds. Counts toward the score at the check's weight."),
    ("not_applicable", "The check's subject isn't in the app, for example no WebView or no AI features, or a Trust check on an app without money, health or identity data. Excluded from the score."),
    ("unable_to_check", "The answer isn't in the repository, typically a dashboard setting. Requires a note; reported as Needs review and excluded from the score."),
]


def status_table():
    rows = "".join(f'<tr><td class="mono">{s}</td><td class="d">{e(d)}</td></tr>' for s, d in STATUSES)
    return f'<div class="tw"><table><thead><tr><th>Status</th><th>Rule</th></tr></thead><tbody>{rows}</tbody></table></div>'


def scope_table():
    T = D["thresholds"]
    rows = [
        ("Platforms", "<code>mobile</code> <code>web</code> <code>server</code>",
         f"{n_mobile} checks run on mobile apps, {n_web} on web apps and {n_server} on Node.js servers; {n_all} apply to all three and {n_mobile_only} are mobile only. Android and iOS make a project mobile; Next.js or React (Vite, Create React App) make it web; Express, NestJS, Fastify, Hono, Koa, hapi, AdonisJS or Restify make it a server. Expo's own web output counts as part of the mobile app, and Next.js route handlers as part of the web app."),
        ("Stack targets", " ".join(f"<code>{t}</code>" for t in TARGET_NAMES),
         "A variant runs when its target matches the detected stack. React Native and Flutter apps count as both Android and iOS. <code>any</code> runs on every stack, <code>mobile</code> on every mobile stack, <code>web</code> on every web stack."),
        ("Checks per mobile audit", f'<code>{SC["Native iOS"]}</code> – <code>{SC["Every mobile target"]}</code>',
         f'Native iOS {SC["Native iOS"]}, native Android {SC["Native Android"]}, React Native {SC["React Native"]}, Flutter with Firebase {SC["Flutter with Firebase"]}, Expo with Supabase {SC["Expo with Supabase"]}, every mobile target {SC["Every mobile target"]}.'),
        ("Checks per web audit", f'<code>{SC["React (Vite)"]}</code> – <code>{SC["Every web target"]}</code>',
         f'React with no backend {SC["React (Vite)"]}, Next.js with Supabase {SC["Next.js with Supabase"]}, React with Firebase {SC["React (Vite) with Firebase"]}, both backends {SC["Every web target"]}. A monorepo with Expo, Next.js and Supabase runs {SC["Expo and Next.js monorepo"]}.'),
        ("Checks per server audit", f'<code>{SC["Express server"]}</code> – <code>{SC["Every server target"]}</code>',
         f'Express {SC["Express server"]}, NestJS with Supabase {SC["NestJS server with Supabase"]}, with both backends {SC["Every server target"]}. An Expo app with its Express server and Supabase in one repository runs {SC["Expo app with an Express server"]}.'),
        ("Server code", "<code>src/</code> <code>routes/</code> <code>controllers/</code> <code>api/</code> <code>server/</code>",
         "The app's server is part of the app, whether it lives in the app's repository or its own. Run the audit in each project: a server audited on its own is reported under the same app. Firebase and Supabase get extra checks for security rules, row-level security and admin keys."),
        ("Excluded on mobile", " ".join(f"<code>{e(x)}</code>" for x in D["exclude"]["mobile"]),
         "Never searched: dependencies, generated code and build output."),
        ("Excluded on web", " ".join(f"<code>{e(x)}</code>" for x in D["exclude"]["web"]),
         "Never searched: dependencies, framework build output and deployment caches."),
        ("Excluded on server", " ".join(f"<code>{e(x)}</code>" for x in D["exclude"]["server"]),
         "Never searched: dependencies, build output, deployment caches, uploaded files and logs."),
        ("Android target SDK", f'<code>targetSdk ≥ {T["androidTargetSdk"]}</code>', "Below this, MFS-CODE-02 fails."),
        ("Android minimum SDK", f'<code>minSdk ≥ {T["androidMinSdk"]}</code>', "Below this, MFS-CODE-02 fails."),
        ("iOS deployment target", f'<code>iOS ≥ {T["iosMinDeployment"]}</code>', "Below this, MFS-CODE-02 fails."),
        ("Stack variants", f"<code>{n_variants}</code>", f"Per-stack definitions across the {len(rules)} checks, {n_web_variants} of them for web stacks."),
    ]
    body = "".join(f'<tr><td>{a}</td><td class="v">{b}</td><td class="d">{c}</td></tr>' for a, b, c in rows)
    return f'<div class="tw"><table><thead><tr><th>Parameter</th><th>Value</th><th>Detail</th></tr></thead><tbody>{body}</tbody></table></div>'


def standards_table():
    def codes(k, rx):
        out = []
        for v in sorted(fam.get(k, ()), key=lambda x: [int(n) if n.isdigit() else n for n in re.split(r"(\d+)", x)]):
            m = re.search(rx, v)
            out.append(m.group(1) if m else v.split(": ", 1)[-1])
        return ", ".join(out)
    agentic = ", ".join(r["id"] for r in rules if any(s.startswith("Agentic") for s in r["standards"]))
    rows = [
        ("OWASP MASVS v2.1", f"{len(masvs)} of 24 controls", "Every control in the standard is cited by at least one check."),
        ("OWASP MASWE", f"{len(maswe)} weaknesses", "Mobile Application Security Weakness Enumeration entries cited by the checks."),
        ("CWE", f"{len(cwe)} entries", "Common Weakness Enumeration IDs cited by the checks."),
        ("OWASP Top 10 2025", f"{len(fam.get('Top 10 2025', ()))} of 10", e(codes("Top 10 2025", r": (A\d+)")) + ". The web application list; shown on web reports."),
        ("OWASP Mobile Top 10 2024", f"{len(fam.get('Mobile Top 10 2024', ()))} of 10", e(codes("Mobile Top 10 2024", r": (M\d+)")) + ". Shown on mobile reports."),
        ("OWASP LLM Top 10 2025", f"{len(fam.get('LLM Top 10 2025', ()))} categories", e(codes("LLM Top 10 2025", r": (LLM\d+)"))),
        ("OWASP API Security Top 10 2023", f"{len(fam.get('API Top 10 2023', ()))} categories", e(codes("API Top 10 2023", r": (API\d+)"))),
        ("OWASP ASVS 5.0", f"{len(fam.get('ASVS 5.0', ()))} areas", e(codes("ASVS 5.0", r": (.+)$"))),
        ("OWASP Agentic Top 10 2026", "cited", f"By {e(agentic)}, where AI acts on the user's behalf."),
    ]
    body = "".join(f'<tr><td>{a}</td><td class="v">{b}</td><td class="d">{c}</td></tr>' for a, b, c in rows)
    return f'<div class="tw"><table><thead><tr><th>Standard</th><th>Coverage</th><th>Detail</th></tr></thead><tbody>{body}</tbody></table></div>'


def eval_flow():
    steps = [
        ("Detect", "Marker files and dependency names identify frameworks, platforms (mobile, web, server) and backends."),
        ("Plan", "Checks are selected by platform, then each check's variants by the detected stack."),
        ("Inspect", "The agent searches the listed files for the patterns, reads every match and applies the fail and pass conditions."),
        ("Verify", "The server rejects results without evidence, masks secrets and runs the dependency checks itself."),
        ("Score", "Severity-weighted score with verdict caps, grouped by level."),
    ]
    return '<ol class="flow">' + "".join(f'<li><b>{a}</b><span>{e(b)}</span></li>' for a, b in steps) + "</ol>"


def menu():
    area_links = "".join(
        f'<div><i>{num} {name}</i>' + "".join(f'<a href="#{cid.lower()}">{e(cats[cid]["name"])}</a>' for cid, _ in areas) + "</div>"
        for num, name, _, _, areas in LAYERS)
    return f'''<div class="menu-in">
  <div><b>MobileFirst Secure</b><a href="/">Get your free security report</a>
  <b>Framework</b><a href="#overview">Framework map</a><a href="#evaluation">Evaluation model</a><a href="#scoring">Scoring model</a>
  <b>Parameters</b><a href="#p-layers">Layers</a><a href="#p-levels">Levels</a><a href="#p-severity">Severity</a><a href="#p-anatomy">Check anatomy</a><a href="#p-status">Result statuses</a><a href="#p-scope">Scope</a><a href="#p-standards">Standards</a></div>
  <div><b>Checks by area</b><div class="menu-cols">{area_links}</div></div>
</div>'''


# ---------- shareable image (public/framework.png) ----------
def image_html():
    card = ("background:#172340;border:1px solid {b};border-radius:12px;padding:16px 18px;"
            "display:flex;flex-direction:column;gap:6px")
    def area(cid, scope):
        c = cats[cid]
        new = ('<span style="font-size:10px;font-weight:600;letter-spacing:.12em;color:#0f1729;background:#9db8ff;'
               'border-radius:999px;padding:2px 7px;margin-left:8px;vertical-align:2px">NEW</span>') if cid == "AI" else ""
        return (f'<div style="{card.format(b="#3b5bdb" if cid == "AI" else "#24324f")}">'
                f'<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">'
                f'<span style="font-family:\'Space Grotesk\';font-weight:600;font-size:16px">{e(c["name"])}{new}</span>'
                f'<span style="font-size:12px;font-weight:600;color:#9db8ff;white-space:nowrap">{len(c["rules"])} checks</span></div>'
                f'<span style="font-size:13px;line-height:18px;color:#b8c2d6">{e(scope)}</span></div>')
    levels = "".join(
        f'<div style="flex:1;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background:#131d36;border:1px solid #24324f">'
        f'<span style="font-family:\'Space Grotesk\';font-weight:700;font-size:22px;color:#9db8ff;min-width:28px">{lvl_total[k]}</span>'
        f'<span style="display:flex;flex-direction:column;gap:1px"><span style="font-size:12px;font-weight:600;letter-spacing:.14em">{name.upper()} LEVEL</span>'
        f'<span style="font-size:13px;color:#b8c2d6">{e(sub)}</span></span></div>' for k, name, sub, _ in LEVELS)
    cols = "".join(
        f'<div style="display:flex;flex-direction:column;gap:12px">'
        f'<div style="display:flex;flex-direction:column;gap:3px;padding-bottom:10px;border-bottom:1px solid #2a3858">'
        f'<span style="font-size:12px;font-weight:600;letter-spacing:.14em;color:#5b8cff">{num} · {name.upper()}</span>'
        f'<span style="font-size:15px;color:#dbe2ee">{e(sub)}</span></div>'
        + "".join(area(cid, scope) for cid, scope in areas) + "</div>"
        for num, name, sub, _, areas in LAYERS)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{fonts()}
body{{margin:0;background:#0f1729}}</style></head><body>
<div id="img" style="width:1270px;box-sizing:border-box;padding:40px 44px 36px;background:#0f1729;font-family:Inter,sans-serif;color:#fff">
<div style="display:flex;justify-content:space-between;align-items:center">
<div style="display:flex;align-items:center;gap:10px">
<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5b8cff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"></path><path d="M9 12l2 2 4-4"></path></svg>
<span style="font-family:'Space Grotesk';font-weight:700;font-size:20px;letter-spacing:-.01em">MobileFirst <span style="color:#5b8cff">Secure</span></span></div>
<span style="font-size:15px;color:#9aa6bd">app-security.mobilefirst.in/framework</span></div>
<h1 style="margin:34px 0 0;font-family:'Space Grotesk';font-weight:700;font-size:46px;line-height:1.08;letter-spacing:-.025em">The App Security Framework</h1>
<p style="margin:14px 0 0;font-size:18px;line-height:26px;color:#c4cde0">{len(rules)} checks across 11 areas, in three levels, for every part of your app: mobile, web and server. Your coding agent runs them on your code with one command: <span style="color:#fff;font-weight:600">audit</span>.</p>
<div style="display:flex;gap:12px;margin-top:26px">{levels}</div>
<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:start;margin-top:30px">{cols}</div>
<div style="margin-top:30px;padding-top:16px;border-top:1px solid #24324f;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-size:13px;line-height:20px;color:#9aa6bd">
<div><div style="color:#dbe2ee"><b style="font-weight:600">Mobile</b>, {n_mobile} checks: React Native, Expo, Flutter, Android, iOS &nbsp;&nbsp; <b style="font-weight:600">Web</b>, {n_web}: Next.js, React &nbsp;&nbsp; <b style="font-weight:600">Server</b>, {n_server}: Node.js</div>
<div>Mapped to OWASP Top 10, MASVS, Mobile Top 10, ASVS, API, LLM, Agentic Top 10</div></div>
<div style="white-space:nowrap">Runs in Claude Code, Claude, Codex, ChatGPT, Cursor</div></div>
</div></body></html>"""


def render_image():
    open(IMG_HTML, "w").write(image_html())
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright not installed: kept the existing public/framework.png")
        return
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None, args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1270, "height": 800}, device_scale_factor=2)
        pg.goto("file://" + IMG_HTML)
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(300)
        pg.locator("#img").screenshot(path=IMG)
        b.close()


def image_size():
    """CSS size of the 2x image, read from the PNG header."""
    with open(IMG, "rb") as f:
        head = f.read(24)
    return int.from_bytes(head[16:20], "big") // 2, int.from_bytes(head[20:24], "big") // 2


render_image()
IMG_W, IMG_H = image_size()

CSS = open(os.path.join(HERE, "style.css")).read()

page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MobileFirst Secure Framework</title>
<meta property="og:title" content="MobileFirst Secure Framework">
<meta property="og:image" content="https://app-security.mobilefirst.in/framework.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://app-security.mobilefirst.in/framework">
<meta name="description" content="The MobileFirst Secure Framework: {len(rules)} security checks for mobile apps, web apps and their servers across 11 areas, four layers and three levels, with per-stack inspection rules for React Native, Expo, Flutter, Android, iOS, Next.js, React and Node.js.">
<style>
{fonts()}
{CSS}
</style>
</head>
<body>
<header class="hd">
  <div class="hd-in">
    <a class="brand" href="/">MobileFirst <span>Secure</span><small>Framework</small></a>
    <button class="burger" id="burger" type="button" aria-label="Open contents" aria-expanded="false" aria-controls="menu">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
    </button>
  </div>
  <nav class="menu" id="menu" aria-label="Contents">{menu()}</nav>
</header>

<main id="top" class="wrap">
<section class="intro">
  <h1>MobileFirst Secure Framework</h1>
  <p class="lead">A security framework for apps built in the AI coding era: mobile, web and the servers behind them. {len(rules)} checks across 11 areas, grouped in four layers and three levels. Every check specifies what to inspect, where to look on each stack and the exact conditions for a pass or a fail, so every result carries evidence a developer can verify.</p>
  <dl class="spec">
    <div><dt>Version</dt><dd>{e(D["version"])}</dd></div>
    <div><dt>Checks</dt><dd>{len(rules)} in 11 areas</dd></div>
    <div><dt>Structure</dt><dd>4 layers, 3 levels</dd></div>
    <div><dt>Platforms</dt><dd>Mobile {n_mobile} checks, web {n_web}, server {n_server}</dd></div>
    <div><dt>Stacks</dt><dd>React Native, Expo, Flutter, Android, iOS, Next.js, React, Node.js</dd></div>
    <div><dt>Backends</dt><dd>Node.js servers, plus extra checks for Firebase, Supabase</dd></div>
  </dl>
  <figure class="hero-img" id="overview">
    <a href="/framework.png" aria-label="Open the framework image full size"><img src="/framework.png" width="{IMG_W}" height="{IMG_H}" alt="The MobileFirst Secure Framework: {len(rules)} checks in 11 areas, grouped in four layers (Keys, Data, Access, Release) and three levels (Launch, Scale, Trust), for mobile and web apps."></a>
    <figcaption>The framework at a glance. <a href="/framework.png" download="MobileFirst-Secure-Framework.png">Download the image</a></figcaption>
  </figure>
</section>

<section id="evaluation">
  <div class="text"><h2>Evaluation model</h2>
  <p>The framework is executed by the coding agent on the developer's machine against the source code, and verified by the MobileFirst Secure server. Source code never leaves the machine; only results, file locations and short masked snippets do.</p></div>
  {eval_flow()}
</section>

<section id="scoring">
  <div class="text"><h2>Scoring model</h2>
  <p>The score is the severity-weighted share of applicable checks that passed. Checks that don't apply, or couldn't be confirmed from the code, are excluded rather than counted as passes. The verdict then caps the score, so an app with a critical issue can never look fine.</p></div>
  <div class="formula">
    <div><span class="c">// weights per check, by severity</span></div>
    <div><span class="k">w</span>(critical) = 25 &nbsp; <span class="k">w</span>(high) = 12 &nbsp; <span class="k">w</span>(medium) = 5 &nbsp; <span class="k">w</span>(low) = 2</div>
    <div><span class="c">// applicable = failed + passed (not_applicable and unable_to_check excluded)</span></div>
    <div>score = round( 100 × ( 1 − Σ<span class="k">w</span>(failed) ÷ Σ<span class="k">w</span>(applicable) ) )</div>
    <div><span class="c">// verdict and cap</span></div>
    <div>any critical &nbsp;→ Not safe to launch &nbsp; score ≤ 39</div>
    <div>else any high → Fix before launch &nbsp;&nbsp; score ≤ 74</div>
    <div>otherwise &nbsp;&nbsp;&nbsp;→ Safe to launch</div>
    <div><span class="c">// grade</span></div>
    <div>A ≥ 90 &nbsp; B ≥ 75 &nbsp; C ≥ 60 &nbsp; D ≥ 40 &nbsp; F &lt; 40</div>
  </div>
</section>

<section id="parameters">
  <div class="text"><h2>Framework parameters</h2>
  <p>The definitions every check is built on.</p></div>
  <h3 id="p-layers">Layers</h3>{layers_table()}
  <h3 id="p-levels">Levels</h3>{levels_table()}
  <h3 id="p-severity">Severity</h3>{severity_table()}
  <h3 id="p-anatomy">Check anatomy</h3>
  <p class="text">Every check is a structured definition, not a prompt. The same fields drive the agent's checklist, the server's validation and the report.</p>
  {anatomy_table()}
  <h3 id="p-status">Result statuses</h3>{status_table()}
  <h3 id="p-scope">Scope</h3>{scope_table()}
  <h3 id="p-standards">Standards</h3>{standards_table()}
</section>

<section id="checks">
  <div class="checks-head">
    <div class="text"><h2>The {len(rules)} checks</h2>
    <p>Grouped by layer and area. Open a check for its full specification: what to inspect, the fail and pass conditions, the files and patterns for each stack, remediation and standards.</p></div>
    <div class="ctl">
      <div class="seg" role="group" aria-label="Show checks for">
        <button type="button" data-show="all" aria-pressed="true">All {len(rules)}</button><button type="button" data-show="mobile" aria-pressed="false">Mobile {n_mobile}</button><button type="button" data-show="web" aria-pressed="false">Web {n_web}</button><button type="button" data-show="server" aria-pressed="false">Server {n_server}</button>
      </div>
      <button class="btn ghost" id="toggle-all" type="button">Expand all checks</button>
    </div>
  </div>
  {checks_section()}
</section>

<footer class="foot">
  <p>MobileFirst Secure Framework, version {e(D["version"])}. A MobileFirst product. <a href="/">Get your free security report</a>.</p>
  <p>Runs in Claude Code, Codex, ChatGPT, Cursor, VS Code and the Claude app.</p>
  <p>OWASP MASVS and MASWE are licensed under CC BY-SA 4.0.</p>
</footer>
</main>

<script>
(function () {{
  var b = document.getElementById("burger"), m = document.getElementById("menu");
  function set(open) {{ m.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); b.setAttribute("aria-label", open ? "Close contents" : "Open contents"); }}
  b.addEventListener("click", function () {{ set(!m.classList.contains("open")); }});
  m.addEventListener("click", function (ev) {{ if (ev.target.tagName === "A") set(false); }});
  document.addEventListener("keydown", function (ev) {{ if (ev.key === "Escape" && m.classList.contains("open")) {{ set(false); b.focus(); }} }});
  document.addEventListener("click", function (ev) {{ if (m.classList.contains("open") && !m.contains(ev.target) && !b.contains(ev.target)) set(false); }});
  var t = document.getElementById("toggle-all"), all = document.querySelectorAll("details.rule");
  t.addEventListener("click", function () {{
    var open = t.getAttribute("data-open") !== "1";
    all.forEach(function (d) {{ d.open = open; }});
    t.setAttribute("data-open", open ? "1" : "0"); t.textContent = open ? "Collapse all checks" : "Expand all checks";
  }});
  var seg = document.querySelectorAll(".seg button");
  seg.forEach(function (btn) {{
    btn.addEventListener("click", function () {{
      var k = btn.getAttribute("data-show");
      seg.forEach(function (x) {{ x.setAttribute("aria-pressed", String(x === btn)); }});
      all.forEach(function (d) {{ d.hidden = k !== "all" && d.getAttribute("data-platforms").split(" ").indexOf(k) < 0; }});
      document.querySelectorAll(".area-sec").forEach(function (s) {{ s.hidden = !s.querySelector("details.rule:not([hidden])"); }});
    }});
  }});
  function openHash() {{ var h = location.hash.slice(1); var el = h && document.getElementById(h); if (el && el.tagName === "DETAILS") {{ if (el.hidden) seg[0].click(); el.open = true; }} }}
  window.addEventListener("hashchange", openHash); openHash();
  window.addEventListener("beforeprint", function () {{ all.forEach(function (d) {{ d.open = true; }}); }});
}})();
</script>
</body>
</html>'''

open(OUT, "w").write(page)
print("wrote public/framework.html", len(page) // 1024, "KB;", len(rules), "rules,", n_variants, "variants; image", IMG_W, "x", IMG_H)
print("standards", {k: len(v) for k, v in fam.items()}, "masvs", len(masvs), "maswe", len(maswe), "cwe", len(cwe))
