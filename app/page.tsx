import { MCP_URL, BRAND, SLOGAN } from "@/lib/config";
import { InstallTabs } from "./install-tabs";

export default function Home() {
  return (
    <main className="wrap">
      <div className="top">
        <span className="logo">
          MobileFirst <span>Secure</span>
        </span>
      </div>

      <section className="hero-landing">
        <h1>Is your app safe to launch?</h1>
        <p>
          A security audit of your mobile app's code, run by the coding agent you already use. Type <b>audit</b>, get a report. Your codebase
          never leaves your machine.
        </p>
      </section>

      <section className="card">
        <InstallTabs url={MCP_URL} />
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
