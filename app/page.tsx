import { BRAND, SLOGAN } from "@/lib/config";
import { AuthForm } from "./auth-form";

// A sample audit, written the way the agent shows it in chat. Lines reveal in sequence on load (CSS only).
type Line = { t: string; at?: string; cls?: string; gap?: boolean };
const TRANSCRIPT: Line[] = [
  { t: "> audit", cls: "tl-cmd" },
  { t: "Detected React Native (Expo), Android, iOS, Supabase", cls: "tl-dim", gap: true },
  { t: "Running 45 security checks on your code…", cls: "tl-dim" },
  { t: "Secrets, backend, storage, network, auth, AI features…", cls: "tl-dim" },
  { t: "MobileFirst Secure audit: PayFlow", cls: "tl-strong", gap: true },
  { t: "Not safe to launch", cls: "tl-verdict" },
  { t: "Score 28/100 (F)  ·  4 critical  ·  8 high  ·  11 medium", cls: "tl-dim" },
  { t: "Fix these first:", cls: "tl-strong", gap: true },
  { t: "1. Secret keys shipped in the app", at: ".env:3", cls: "tl-crit" },
  { t: "2. Supabase admin key inside the app", at: "supabase.ts:5", cls: "tl-crit" },
  { t: "3. Database open to anyone", at: "0001_init.sql:2", cls: "tl-crit" },
  { t: "Full report: app-security.mobilefirst.in/r/…", cls: "tl-link", gap: true },
];

export default function Home() {
  return (
    <main className="lp">
      <header className="lp-top">
        <span className="lp-logo">
          MobileFirst <span>Secure</span>
        </span>
        <a className="lp-signin" href="/login">
          Sign in
        </a>
      </header>

      <section className="lp-hero" id="start">
        <div className="lp-pitch">
          <h1>Get your app security report in 5 minutes.</h1>
          <p className="lp-sub">
            Your AI coding agent checks your React Native, Flutter, iOS or Android code against 46 security checks. You get a verdict, a score
            and the exact lines to fix.
          </p>
          <AuthForm mode="start" />
          <p className="lp-assure">Free, no credit card. Your codebase never leaves your machine.</p>
          <p className="lp-tools">Works in Claude Code, Codex, ChatGPT, Cursor, VS Code and the Claude app.</p>
        </div>

        <figure className="lp-demo" aria-label="Sample audit of an example payments app">
          <div className="term">
            <div className="term-bar">
              <span className="term-title">Your coding agent</span>
              <span className="term-tag">Sample audit</span>
            </div>
            <div className="term-body">
              {TRANSCRIPT.map((l, i) => (
                <p key={i} className={`tl ${l.cls || ""} ${l.gap ? "tl-gap" : ""}`} style={{ animationDelay: `${0.35 + i * 0.32}s` }}>
                  {l.t}
                  {l.at ? <span className="tl-at">{l.at}</span> : null}
                </p>
              ))}
            </div>
          </div>
        </figure>
      </section>

      <section className="lp-how" aria-labelledby="how">
        <h2 id="how">Three steps to your report</h2>
        <ol className="lp-steps">
          <li>
            <h3>Enter your email</h3>
            <p>We email you a code, then give you your personal audit link.</p>
          </li>
          <li>
            <h3>Add the link to your coding agent</h3>
            <p>One command or one paste. Your dashboard shows the exact setup for your tool.</p>
          </li>
          <li>
            <h3>Type audit</h3>
            <p>Your agent checks the code on your machine and hands you the report.</p>
          </li>
        </ol>
      </section>

      <section className="lp-proof">
        <p className="lp-stat">
          71% of iOS apps ship at least one secret key inside the app.<sup>1</sup> Check yours before someone else does.
        </p>
        <p className="lp-trust">
          The checks cover every OWASP Mobile Top 10 risk and all 24 OWASP MASVS controls. The audit is read-only and never changes your
          code. Built by MobileFirst, building mobile apps since 2014.
        </p>
        <a className="btn lp-again" href="#start">
          Get my free report
        </a>
      </section>

      <footer className="lp-foot">
        <p>
          {BRAND}, a MobileFirst product. {SLOGAN}.
        </p>
        <p className="lp-src">
          1. Cybernews analysis of 156,080 iOS apps, reported by{" "}
          <a href="https://www.malwarebytes.com/blog/news/2025/03/research-on-ios-apps-shows-widespread-exposure-of-secrets" rel="noopener">
            Malwarebytes
          </a>
          , March 2025.
        </p>
      </footer>
    </main>
  );
}
