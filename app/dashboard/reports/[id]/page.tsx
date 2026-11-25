import type { Metadata } from "next";
import type { Report } from "@/lib/types";
import { BRAND } from "@/lib/config";
import { kv } from "@/lib/store";
import { reportKey } from "@/lib/mcp";
import { listReviewers, listSharedWithMe, MAX_REVIEWERS, roleFor } from "@/lib/sharing";
import { ReportBody } from "../../../report-body";
import { Panel, requireAccount } from "../../panel";
import { fmtDate } from "../../parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Report — ${BRAND}`, robots: { index: false, follow: false } };

type Q = { invited?: string; emailed?: string; already?: string; removed?: string; error?: string };

async function Reviewers({ r, q }: { r: Report; q: Q }) {
  const reviewers = await listReviewers(r.id);
  return (
    <section className="card share noprint" id="share">
      <h2 className="pn-h2">Reviewers</h2>
      <p className="muted" style={{ margin: "0 0 16px" }}>
        This report is private. Invite your developer, co-founder or investor by email: they sign in with that address to read it. You can
        remove anyone at any time.
      </p>

      {q.invited ? (
        <p className="share-msg ok-msg" role="status">
          {q.already
            ? `${q.invited} can already open this report.`
            : q.emailed
              ? `Invite sent to ${q.invited}.`
              : `${q.invited} can now open this report, but the invite email couldn't be sent. Send them the report link yourself.`}
        </p>
      ) : null}
      {q.removed ? (
        <p className="share-msg" role="status">
          {q.removed} can no longer open this report.
        </p>
      ) : null}
      {q.error ? (
        <p className="share-msg auth-err" role="alert">
          {q.error}
        </p>
      ) : null}

      {reviewers.length < MAX_REVIEWERS ? (
        <form className="share-form" method="post" action={`/api/reports/${r.id}/reviewers`}>
          <input type="hidden" name="action" value="invite" />
          <label className="sr" htmlFor="invite-email">
            Reviewer's email
          </label>
          <input id="invite-email" name="email" type="email" required maxLength={200} placeholder="developer@company.com" autoComplete="off" />
          <button className="btn" type="submit">
            Invite
          </button>
        </form>
      ) : (
        <p className="muted">This report has the maximum of {MAX_REVIEWERS} reviewers. Remove one to invite someone else.</p>
      )}

      {reviewers.length ? (
        <ul className="share-list">
          {reviewers.map((v) => (
            <li key={v.email}>
              <div>
                <b>{v.email}</b>
                <span className="muted">Invited {fmtDate(v.at)}</span>
              </div>
              <form method="post" action={`/api/reports/${r.id}/reviewers`}>
                <input type="hidden" name="action" value="remove" />
                <input type="hidden" name="email" value={v.email} />
                <button className="linkbtn" type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default async function PanelReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  const account = await requireAccount();
  const { id } = await params;
  const q = await searchParams;
  const role = /^[A-Za-z0-9_-]{16,40}$/.test(id) ? await roleFor(account, id) : null;
  const report = role ? await kv.getJSON<Report>(reportKey(id)) : null;

  let sharedBy: string | undefined;
  if (report && role === "reviewer") {
    const entry = (await listSharedWithMe(account.email)).find((s) => s.reportId === id);
    if (entry) sharedBy = entry.sharedByCompany ? `${entry.sharedBy}, ${entry.sharedByCompany}` : entry.sharedBy;
  }

  return (
    <Panel account={account} page="audits" back={{ href: "/dashboard/audits", label: "All audits" }}>
      {report && role ? (
        <>
          <ReportBody r={report} variant={role} sharedBy={sharedBy} />
          {role === "owner" ? <Reviewers r={report} q={q} /> : null}
        </>
      ) : (
        <section className="card">
          <h1 className="pn-h2">{role ? "This report has expired" : "Report not found"}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {role
              ? "Reports stay open for 90 days. Type audit in your app's project to run a fresh one."
              : "It isn't one of your audits, and it hasn't been shared with you. Open your reports from the Audits page."}
          </p>
        </section>
      )}
    </Panel>
  );
}
