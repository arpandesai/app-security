import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { BRAND } from "@/lib/config";
import { AuthForm } from "../auth-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Sign in — ${BRAND}` };

export default async function Login() {
  if (await currentAccount()) redirect("/dashboard");
  return (
    <main className="wrap narrow">
      <div className="top">
        <a className="logo" href="/">
          MobileFirst <span>Secure</span>
        </a>
      </div>
      <section className="card" style={{ marginTop: 40 }}>
        <h1 className="dash-h">Sign in</h1>
        <p className="muted" style={{ margin: "0 0 16px" }}>
          We'll email you a 6-digit code.
        </p>
        <AuthForm mode="login" />
      </section>
      <p className="muted">
        New here? <a href="/">Get your MCP URL</a>
      </p>
    </main>
  );
}
