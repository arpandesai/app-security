import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { roleFor } from "@/lib/sharing";
import { BRAND, SLOGAN } from "@/lib/config";
import { AuthForm } from "../../auth-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Security report — ${BRAND}`,
  robots: { index: false, follow: false },
};

const ID = /^[A-Za-z0-9_-]{16,40}$/;

/**
 * The link in the agent's chat and in invite emails. Reports are private: signed-out visitors get a
 * sign-in form (nothing about the report is shown), and signed-in owners or invited reviewers go
 * straight to the report in their panel.
 */
export default async function ReportLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await currentAccount();
  if (account && ID.test(id) && (await roleFor(account, id))) redirect(`/dashboard/reports/${id}`);

  return (
    <main className="wrap narrow">
      <div className="top">
        <a className="logo" href="/">
          MobileFirst <span>Secure</span>
        </a>
      </div>
      <section className="card" style={{ marginTop: 40 }}>
        {account ? (
          <>
            <h1 className="dash-h">You don't have access to this report</h1>
            <p className="muted" style={{ margin: "0 0 16px" }}>
              You're signed in as <b>{account.email}</b>. Ask the person who shared it to invite this email address, or sign in with the
              address the invite was sent to.
            </p>
            <div className="cta-row" style={{ marginTop: 0 }}>
              <a className="btn" href="/dashboard">
                Go to your dashboard
              </a>
              <form method="post" action="/api/auth/logout" style={{ margin: 0 }}>
                <button className="btn ghost" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <h1 className="dash-h">This security report is private</h1>
            <p className="muted" style={{ margin: "0 0 16px" }}>
              Sign in with the email address it was shared with. We'll email you a 6-digit code; there's no password.
            </p>
            <AuthForm mode="start" next={`/r/${ID.test(id) ? id : ""}`} cta="Email me a code" />
          </>
        )}
      </section>
      <footer className="foot">
        <p>
          {BRAND} · A MobileFirst product · {SLOGAN}
        </p>
      </footer>
    </main>
  );
}
