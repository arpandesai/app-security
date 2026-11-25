import type { Metadata } from "next";
import { BRAND } from "@/lib/config";
import { Panel, requireAccount } from "../panel";
import { fmtDate } from "../parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Account — ${BRAND}`, robots: { index: false, follow: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const account = await requireAccount();
  const { saved, error } = await searchParams;

  return (
    <Panel account={account} page="account" title="Account" intro={`Member since ${fmtDate(account.createdAt)}.`}>
      <section className="card">
        <form className="pn-form" method="post" action="/api/account">
          <label>
            <span>Name</span>
            <input name="name" defaultValue={account.name} maxLength={80} autoComplete="name" />
          </label>
          <label>
            <span>Company</span>
            <input name="company" defaultValue={account.company || ""} maxLength={120} autoComplete="organization" />
          </label>
          <label>
            <span>Email</span>
            <input value={account.email} readOnly disabled />
            <small>You sign in with a code sent to this address.</small>
          </label>
          <div className="pn-form-row">
            <button className="btn" type="submit">
              Save changes
            </button>
            {saved ? <span className="pn-saved">Changes saved.</span> : null}
            {error ? <span className="auth-err" style={{ margin: 0 }}>Couldn't save. Names are up to 80 characters, companies up to 120.</span> : null}
          </div>
        </form>
      </section>
    </Panel>
  );
}
