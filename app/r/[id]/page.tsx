import type { Metadata } from "next";
import type { Finding, Report } from "@/lib/types";
import { kv } from "@/lib/store";
import { reportKey } from "@/lib/mcp";
import { categoryName } from "@/lib/rules";
import { BRAND, SLOGAN } from "@/lib/config";
import { LeadForm, PrintExpander } from "./lead-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Security report — ${BRAND}`,
  robots: { index: false, follow: false },
};

const verdictClass = (v: Report["verdict"]) =>
  v === "Not safe to launch" ? "v-bad" : v === "Fix before launch" ? "v-warn" : "v-ok";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

function Refs({ f }: { f: Finding }) {
  const parts = [...(f.refs.masvs || []), ...(f.refs.maswe || []), ...(f.refs.cwe || [])];
  if (!parts.length) return <span>MobileFirst rule {f.ruleId}</span>;
  return (
    <span>
      {f.ruleId} · {parts.join(" · ")}
    </span>
  );
}

function FindingCard({ f, open }: { f: Finding; open?: boolean }) {
  const sev = f.status === "unable_to_check" ? "review" : f.severity;
  return (
    <details className="f" open={open}>
      <summary>
        <span className={`pill s-${sev}`}>{f.status === "unable_to_check" ? "review" : f.severity}</span>
        <span className="t">{f.title}</span>
        <span className="c">{categoryName(f.category)}</span>
      </summary>
      <div className="fb">
        <h4>Why it matters</h4>
        <p>{f.founder}</p>
        {f.note ? (
          <>
            <h4>Auditor note</h4>
            <p>{f.note}</p>
          </>
        ) : null}
        {f.evidence.length ? (
          <>
            <h4>Where</h4>
            {f.evidence.map((e, i) => (
              <div className="ev" key={i}>
                <div className="path">
                  {e.file}
                  {e.line ? `:${e.line}` : ""}
                </div>
                {e.snippet ? <pre>{e.snippet}</pre> : null}
              </div>
            ))}
          </>
        ) : null}
        <h4>How to fix</h4>
        <p>{f.fix}</p>
        <h4>Reference</h4>
        <p className="refs">
          <Refs f={f} />
        </p>
      </div>
    </details>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = /^[A-Za-z0-9_-]{16,40}$/.test(id) ? await kv.getJSON<Report>(reportKey(id)) : null;

  if (!report) {
    return (
      <main className="wrap">
        <div className="top">
          <a className="logo" href="/">
            MobileFirst <span>Secure</span>
          </a>
        </div>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Report not found</h1>
          <p className="muted">This report link has expired or doesn't exist. Run the audit again from your coding agent to get a fresh report.</p>
        </div>
      </main>
    );
  }

  const r = report;
  const issues = r.findings.length;

  return (
    <main className="wrap">
      <PrintExpander />
      <div className="top">
        <a className="logo" href="/">
          MobileFirst <span>Secure</span>
        </a>
        <span className="muted">{fmtDate(r.createdAt)}</span>
      </div>

      <section className="card hero">
        <div className="muted">Security audit</div>
        <h1>{r.appName}</h1>
        <div className="muted">
          {r.stack}
          {r.agent ? ` · Audited with ${r.agent}` : ""}
        </div>
        <div className="row">
          <div className="score">
            {r.score}
            <small>/100 · {r.grade}</small>
          </div>
          <div>
            <span className={`verdict ${verdictClass(r.verdict)}`}>{r.verdict}</span>
            <div className="counts" style={{ marginTop: 10 }}>
              <span className="pill s-critical">{r.counts.critical} critical</span>
              <span className="pill s-high">{r.counts.high} high</span>
              <span className="pill s-medium">{r.counts.medium} medium</span>
              <span className="pill s-low">{r.counts.low} low</span>
              {r.needsReview.length ? <span className="pill s-review">{r.needsReview.length} to review</span> : null}
            </div>
          </div>
        </div>
        {issues ? (
          <div className="cta-row noprint">
            <a className="btn" href="#fix">
              Get these fixed by MobileFirst
            </a>
            <a className="btn ghost" href="#email">
              Email me the report
            </a>
          </div>
        ) : null}
      </section>

      {issues ? (
        <>
          <h2>What to fix first</h2>
          <section className="card top3">
            {r.findings.slice(0, 3).map((f, i) => (
              <div className="item" key={f.ruleId}>
                <div className="n">{i + 1}</div>
                <div>
                  <b>
                    <span className={`pill s-${f.severity}`} style={{ marginRight: 8 }}>
                      {f.severity}
                    </span>
                    {f.title}
                  </b>
                  <p>{f.founder}</p>
                </div>
              </div>
            ))}
          </section>

          <h2>All findings ({issues})</h2>
          {r.findings.map((f, i) => (
            <FindingCard f={f} key={f.ruleId} open={i === 0} />
          ))}
        </>
      ) : (
        <section className="card">
          <b className="ok">No issues found.</b> Your app passed every applicable check in this audit.
        </section>
      )}

      {r.needsReview.length ? (
        <>
          <h2>Needs review ({r.needsReview.length})</h2>
          <p className="muted" style={{ marginTop: -6 }}>
            These couldn't be confirmed from the code in your repository, usually because the setting lives in a dashboard.
          </p>
          {r.needsReview.map((f) => (
            <FindingCard f={f} key={f.ruleId} />
          ))}
        </>
      ) : null}

      <h2>Passed checks ({r.passed.length})</h2>
      <details className="f">
        <summary>
          <span className="t">Show passed checks</span>
          <span className="c">{r.notApplicable.length} not applicable</span>
        </summary>
        <div className="fb">
          <ul className="plain">
            {r.passed.map((p) => (
              <li key={p.ruleId}>
                <span className="ok">✓</span>
                <span style={{ flex: 1 }}>{p.title}</span>
                <span className="muted">{categoryName(p.category)}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <section className="card noprint" id="fix" style={{ marginTop: 32 }}>
        <h2 style={{ marginTop: 0 }}>Get these fixed by MobileFirst</h2>
        <p className="muted" style={{ margin: 0 }}>
          Our engineers fix the issues in this report in your codebase, then re-run the audit to prove it.
        </p>
        <LeadForm reportId={r.id} intent="fix" button="Get these fixed" />
      </section>

      <section className="card noprint" id="email">
        <h2 style={{ marginTop: 0 }}>Email me the report</h2>
        <p className="muted" style={{ margin: 0 }}>Get a copy to share with your developer or team.</p>
        <LeadForm reportId={r.id} intent="report" button="Email me the report" />
      </section>

      <footer className="foot">
        <p>
          <b>How this audit works.</b> Your coding agent checked the app's source code on your machine against {r.checksRun} {BRAND} rules.
          Only the findings were sent to MobileFirst, never your codebase. Rules map to OWASP MASVS v2.1 and MASWE; dependency checks use the OSV
          vulnerability database.
        </p>
        <p>
          An automated audit finds common, high-impact issues. It isn't a penetration test and can't guarantee an app is free of vulnerabilities.
        </p>
        <p>OWASP MASVS and MASWE are licensed under CC BY-SA 4.0.</p>
        <p style={{ marginTop: 14 }}>
          {BRAND} · A MobileFirst product · {SLOGAN}
        </p>
      </footer>
    </main>
  );
}
