import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { BRAND, SLOGAN, SUPPORT_EMAIL } from "@/lib/config";
import { AccountView } from "../account-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Dashboard — ${BRAND}`, robots: { index: false, follow: false } };

export default async function Dashboard() {
  const account = await currentAccount();
  if (!account) redirect("/login");

  return (
    <main className="wrap">
      <div className="top">
        <a className="logo" href="/">
          MobileFirst <span>Secure</span>
        </a>
        <form method="post" action="/api/auth/logout" className="signout">
          <span className="muted">{account.email}</span>
          <button className="linkbtn" type="submit">
            Sign out
          </button>
        </form>
      </div>

      {account.disabled ? (
        <section className="card">
          <h1 className="dash-h">Account switched off</h1>
          <p className="muted" style={{ margin: 0 }}>
            Contact MobileFirst{SUPPORT_EMAIL ? ` at ${SUPPORT_EMAIL}` : ""} to turn it back on.
          </p>
        </section>
      ) : (
        <>
          <section className="card">
            <h1 className="dash-h">{`Hi ${account.name.split(" ")[0]}`}</h1>
            <p className="muted" style={{ margin: 0 }}>
              Connect your coding agent once, then type <b>audit</b> in any app project. Every report shows up here.
            </p>
          </section>
          <AccountView account={account} />
        </>
      )}

      <footer className="foot">
        <p>
          {BRAND} · A MobileFirst product · {SLOGAN}
        </p>
      </footer>
    </main>
  );
}
