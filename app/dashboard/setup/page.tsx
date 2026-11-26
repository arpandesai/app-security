import type { Metadata } from "next";
import { BRAND, personalMcpUrl } from "@/lib/config";
import { InstallTabs } from "../../install-tabs";
import { BookLink, Panel, requireAccount } from "../panel";
import { CallMe } from "../call-me";

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
          Connect your coding agent once. Then type <code>audit</code> in any app project. Prefer step by step?{" "}
          <a href="/dashboard/new-audit">Run a new audit</a> with the guide.
        </>
      }
    >
      <CallMe defaultName={account.name || ""} page="/dashboard/setup" />

      <section className="card">
        <InstallTabs url={personalMcpUrl(account.token)} />
        <p className="note">This URL is personal. Anyone who has it can run audits on your account, so don't share it publicly.</p>
      </section>

      <p className="ng-stuck">
        Prefer a set time? <BookLink from="setup" className="">Book a call</BookLink> and we'll connect your agent with you.
      </p>
    </Panel>
  );
}
