import type { Metadata } from "next";
import { BRAND } from "@/lib/config";
import { listAccountReports } from "@/lib/accounts";
import { listSharedWithMe } from "@/lib/sharing";
import { Panel, requireAccount } from "../panel";
import { AuditRows, plural } from "../parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Audits — ${BRAND}`, robots: { index: false, follow: false } };

export default async function Audits() {
  const account = await requireAccount();
  const [reports, shared] = await Promise.all([listAccountReports(account.id), listSharedWithMe(account.email)]);

  return (
    <Panel
      account={account}
      page="audits"
      title="Audits"
      intro={reports.length ? `${plural(reports.length, "audit")}, newest first. Reports stay open for 90 days.` : "Every audit you run shows up here."}
      actions={
        <a className="btn" href="/dashboard/new-audit">
          Run a new audit
        </a>
      }
    >
      {reports.length ? (
        <section className="card tbl">
          <AuditRows reports={reports} />
        </section>
      ) : (
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>
            No audits yet. <a href="/dashboard/new-audit">Run your first audit</a>: pick your AI tool and follow the steps.
          </p>
        </section>
      )}
      {shared.length ? (
        <>
          <h2 className="pn-sec" style={{ marginTop: 36 }}>
            Shared with you
          </h2>
          <section className="card tbl">
            <AuditRows reports={shared} />
          </section>
        </>
      ) : null}
    </Panel>
  );
}
