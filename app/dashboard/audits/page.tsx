import type { Metadata } from "next";
import { BRAND } from "@/lib/config";
import { listAccountReports } from "@/lib/accounts";
import { Panel, requireAccount } from "../panel";
import { AuditRows, plural } from "../parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Audits — ${BRAND}`, robots: { index: false, follow: false } };

export default async function Audits() {
  const account = await requireAccount();
  const reports = await listAccountReports(account.id);

  return (
    <Panel
      account={account}
      page="audits"
      title="Audits"
      intro={reports.length ? `${plural(reports.length, "audit")}, newest first. Reports stay open for 90 days.` : "Every audit you run shows up here."}
    >
      {reports.length ? (
        <section className="card tbl">
          <AuditRows reports={reports} />
        </section>
      ) : (
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>
            No audits yet. <a href="/dashboard/setup">Connect your coding agent</a>, open your app's project and type <code>audit</code>.
          </p>
        </section>
      )}
    </Panel>
  );
}
