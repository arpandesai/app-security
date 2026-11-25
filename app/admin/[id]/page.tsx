import type { Metadata } from "next";
import { getAccount } from "@/lib/accounts";
import { BRAND } from "@/lib/config";
import { AccountView } from "../../account-view";

// Protected by HTTP basic auth in middleware.ts (ADMIN_PASSWORD).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Customer — ${BRAND}`, robots: { index: false, follow: false } };

export default async function AdminCustomer({ params }: { params: Promise<{ id: string }> }) {
  const account = await getAccount((await params).id);
  return (
    <main className="wrap">
      <div className="top">
        <a className="logo" href="/admin">
          ← Customers
        </a>
        <span className="muted">Admin</span>
      </div>
      {!account ? (
        <div className="card">Customer not found.</div>
      ) : (
        <>
          <section className="card">
            <h1 className="dash-h">{account.name || account.email}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {[account.company, account.email, account.disabled ? "Switched off" : "Active"].filter(Boolean).join(" · ")}
            </p>
          </section>
          <AccountView account={account} />
        </>
      )}
    </main>
  );
}
