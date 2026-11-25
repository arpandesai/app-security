import { redirect } from "next/navigation";
import type { Account } from "@/lib/accounts";
import { currentAccount } from "@/lib/auth";
import { BRAND, SLOGAN } from "@/lib/config";
import { BookLink } from "../book-link";

export { BookLink };

export type PanelPage = "overview" | "audits" | "setup" | "account";

const NAV: { id: PanelPage; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: "/dashboard" },
  { id: "audits", label: "Audits", href: "/dashboard/audits" },
  { id: "setup", label: "Setup", href: "/dashboard/setup" },
  { id: "account", label: "Account", href: "/dashboard/account" },
];

/** The signed-in customer, or a redirect to /login. */
export async function requireAccount(): Promise<Account> {
  const account = await currentAccount();
  if (!account) redirect("/login");
  return account;
}

function SignOut({ className }: { className?: string }) {
  return (
    <form method="post" action="/api/auth/logout" className={className}>
      <button className="linkbtn" type="submit">
        Sign out
      </button>
    </form>
  );
}

function HelpCard({ className }: { className: string }) {
  return (
    <div className={className}>
      <b>Talk to an engineer</b>
      <p>Get your findings fixed, or a hand with setup. Book a call with MobileFirst.</p>
      <BookLink from="sidebar" className="btn sm">
        Book a call
      </BookLink>
    </div>
  );
}

/** The customer panel: sidebar navigation, page header and content. */
export function Panel({
  account,
  page,
  title,
  intro,
  back,
  actions,
  children,
}: {
  account: Account;
  page: PanelPage;
  title?: string;
  intro?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pn">
      <aside className="pn-side">
        <div className="pn-brand">
          <a className="pn-logo" href="/dashboard">
            MobileFirst <span>Secure</span>
          </a>
          <SignOut className="pn-mobile-only" />
        </div>
        <nav className="pn-nav" aria-label="Panel">
          {NAV.map((n) => (
            <a key={n.id} href={n.href} aria-current={n.id === page ? "page" : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
        <HelpCard className="pn-help" />
        <div className="pn-me">
          <span title={account.email}>{account.email}</span>
          <SignOut />
        </div>
      </aside>

      <main className="pn-main">
        <div className="pn-inner">
          {back ? (
            <a className="pn-back noprint" href={back.href}>
              ← {back.label}
            </a>
          ) : null}
          {title ? (
            <header className="pn-head">
              <div>
                <h1>{title}</h1>
                {intro ? <p>{intro}</p> : null}
              </div>
              {actions ? <div className="pn-actions">{actions}</div> : null}
            </header>
          ) : null}

          {account.disabled ? (
            <section className="card">
              <h2 className="pn-h2">Your account is switched off</h2>
              <p className="muted" style={{ margin: "0 0 16px" }}>
                Audits from your personal URL are paused. Book a call with MobileFirst to turn it back on.
              </p>
              <BookLink from="switched-off">Book a call</BookLink>
            </section>
          ) : (
            children
          )}

          <HelpCard className="pn-help-mobile noprint" />
          <footer className="foot pn-foot">
            <p>
              {BRAND}, a MobileFirst product. {SLOGAN}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
