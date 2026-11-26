import type { Metadata } from "next";
import { BRAND, bookHref, personalMcpUrl } from "@/lib/config";
import { clientLabel, getActivity } from "@/lib/activity";
import { Panel, requireAccount } from "../panel";
import { AuditGuide } from "./guide";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Run a new audit — ${BRAND}`, robots: { index: false, follow: false } };

export default async function NewAudit() {
  const account = await requireAccount();
  const a = await getActivity(account.id);

  return (
    <Panel
      account={account}
      page="audits"
      back={{ href: "/dashboard/audits", label: "Audits" }}
      title="Run a new audit"
      intro="Pick the AI tool you code with and follow the steps. Each step is confirmed here as you go."
    >
      <AuditGuide
        url={personalMcpUrl(account.token)}
        serverNow={Date.now()}
        helpHref={bookHref("new-audit")}
        call={{ defaultName: account.name || "" }}
        initial={{
          connection: a.connection ? { client: a.connection.client, label: clientLabel(a.connection.client), at: a.connection.at } : null,
          audit: a.audit,
        }}
      />
      <p className="note">The link in these steps is personal. Anyone who has it can run audits on your account, so don't share it publicly.</p>
    </Panel>
  );
}
