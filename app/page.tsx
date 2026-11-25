import { BRAND, SLOGAN } from "@/lib/config";
import { AuthForm } from "./auth-form";

export default function Home() {
  return (
    <main className="wrap">
      <div className="top">
        <span className="logo">
          MobileFirst <span>Secure</span>
        </span>
        <a className="muted" href="/login">
          Sign in
        </a>
      </div>

      <section className="hero-landing">
        <h1>Is your app safe to launch?</h1>
        <p>
          A security audit of your mobile app's code, run by the coding agent you already use. Type <b>audit</b>, get a report. Your codebase
          never leaves your machine.
        </p>
      </section>

      <section className="card">
        <AuthForm mode="signup" />
        <p className="muted" style={{ margin: "12px 0 0" }}>
          Free. Works with Claude Code, Claude, Codex, ChatGPT, Cursor and VS Code.
        </p>
      </section>

      <footer className="foot">
        <p>React Native · Flutter · Android · iOS</p>
        <p>
          {BRAND} · A MobileFirst product · {SLOGAN}
        </p>
      </footer>
    </main>
  );
}
