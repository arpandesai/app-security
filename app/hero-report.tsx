// The landing page hero visual: the report a founder gets after typing audit, for an example app.
// Plain-English findings with the exact file and line. One load sequence: the card rises, the score
// dial sweeps to 28, the verdict lands, then the three findings. Still for people who prefer less motion.

const SCORE = 28;
const R = 46;
const C = 2 * Math.PI * R;

const COUNTS = [
  { k: "critical", label: "Critical", n: 4 },
  { k: "high", label: "High", n: 8 },
  { k: "medium", label: "Medium", n: 11 },
  { k: "low", label: "Low", n: 3 },
] as const;
const TOTAL = COUNTS.reduce((s, c) => s + c.n, 0);

const FINDINGS = [
  { sev: "critical", title: "Secret keys shipped in the app", why: "Anyone can copy them from the download.", at: ".env:3" },
  { sev: "critical", title: "Database open to anyone", why: "No row-level security on users or payments.", at: "0001_init.sql:2" },
  { sev: "high", title: "Paid plan unlocked for free", why: "The app trusts its own isPro flag.", at: "purchases.ts:41" },
] as const;

export function HeroReport() {
  return (
    <figure className="hr" aria-label="Example security report for an app called PayFlow: not safe to launch, score 28 out of 100, 4 critical issues.">
      <div className="hr-cmd" aria-hidden="true">
        <span className="hr-prompt">›</span> audit<span className="hr-caret" />
      </div>

      <div className="hr-card" aria-hidden="true">
        <header className="hr-head">
          <div className="hr-app">
            <span className="hr-icon">P</span>
            <span>
              <b>PayFlow</b>
              <small>React Native app with Supabase</small>
            </span>
          </div>
          <span className="hr-verdict">Not safe to launch</span>
        </header>

        <div className="hr-score">
          <div className="hr-dial">
            <svg viewBox="0 0 120 120" width="120" height="120">
              <circle className="hr-track" cx="60" cy="60" r={R} />
              <circle
                className="hr-arc"
                cx="60"
                cy="60"
                r={R}
                strokeDasharray={`${C} ${C}`}
                style={{ "--off": `${C * (1 - SCORE / 100)}`, "--c": `${C}` } as React.CSSProperties}
              />
            </svg>
            <span className="hr-num">
              {SCORE}
              <small>/100</small>
            </span>
          </div>
          <div className="hr-counts">
            <div className="hr-bar">
              {COUNTS.map((c) => (
                <span key={c.k} className={`s-${c.k}`} style={{ flexGrow: c.n }} />
              ))}
            </div>
            <ul>
              {COUNTS.map((c) => (
                <li key={c.k}>
                  <i className={`s-${c.k}`} />
                  <b>{c.n}</b> {c.label}
                </li>
              ))}
            </ul>
            <p className="hr-total">{TOTAL} issues across 45 checks</p>
          </div>
        </div>

        <div className="hr-list">
          <p className="hr-list-h">Fix these first</p>
          <ol>
            {FINDINGS.map((f, i) => (
              <li key={f.title} style={{ animationDelay: `${1.7 + i * 0.22}s` }}>
                <span className={`hr-sev s-${f.sev}`}>{f.sev === "critical" ? "Critical" : "High"}</span>
                <span className="hr-f">
                  <b>{f.title}</b>
                  <small>{f.why}</small>
                </span>
                <code>{f.at}</code>
              </li>
            ))}
          </ol>
        </div>

        <footer className="hr-foot">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Ready in 4 minutes. Your code never left your machine.
        </footer>
      </div>
    </figure>
  );
}
