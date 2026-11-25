import type { Metadata } from "next";
import { BRAND, personalMcpUrl } from "@/lib/config";
import { InstallTabs } from "../../install-tabs";
import { BookLink, Panel, requireAccount } from "../panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Setup — ${BRAND}`, robots: { index: false, follow: false } };

export default async function Setup() {
  const account = await requireAccount();

  return (
    <Panel
      account={account}
      page="setup"
      title="Setup"
      intro={
        <>
          Connect your coding agent once. Then type <code>audit</code> in any app project.
        </>
      }
    >
      <section className="card">
        <InstallTabs url={personalMcpUrl(account.token)} />
        <p className="note">This URL is personal. Anyone who has it can run audits on your account, so don't share it publicly.</p>
      </section>

      <section className="card pn-callout">
        <div>
          <h2 className="pn-h2">Need help installing?</h2>
          <p className="muted" style={{ margin: 0 }}>
            Book a call and a MobileFirst engineer will connect your agent with you, then run your first audit together.
          </p>
        </div>
        <BookLink from="setup">Book a call</BookLink>
      </section>
    </Panel>
  );
}
