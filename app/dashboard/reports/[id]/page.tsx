import type { Metadata } from "next";
import type { Report } from "@/lib/types";
import { BRAND } from "@/lib/config";
import { kv } from "@/lib/store";
import { reportKey } from "@/lib/mcp";
import { listAccountReports } from "@/lib/accounts";
import { ReportBody } from "../../../report-body";
import { Panel, requireAccount } from "../../panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Report — ${BRAND}`, robots: { index: false, follow: false } };

export default async function PanelReport({ params }: { params: Promise<{ id: string }> }) {
  const account = await requireAccount();
  const { id } = await params;
  // Only reports this account ran open inside the panel.
  const owned = (await listAccountReports(account.id)).some((r) => r.reportId === id);
  const report = owned ? await kv.getJSON<Report>(reportKey(id)) : null;

  return (
    <Panel account={account} page="audits" back={{ href: "/dashboard/audits", label: "All audits" }}>
      {report ? (
        <ReportBody r={report} variant="panel" />
      ) : (
        <section className="card">
          <h1 className="pn-h2">{owned ? "This report has expired" : "Report not found"}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {owned
              ? "Reports stay open for 90 days. Type audit in your app's project to run a fresh one."
              : "It isn't one of your audits. Open your reports from the Audits page."}
          </p>
        </section>
      )}
    </Panel>
  );
}
