import type { Metadata } from "next";
import { BRAND } from "@/lib/config";
import { groupByApp, issueCount, listAccountReports, urgentCount, type AccountReport } from "@/lib/accounts";
import { listSharedWithMe } from "@/lib/sharing";
import { BookLink, Panel, requireAccount } from "./panel";
import { AuditRows, fmtDate, isExpired, plural, verdictClass } from "./parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Overview — ${BRAND}`, robots: { index: false, follow: false } };

function Counts({ r }: { r: AccountReport }) {
  return (
    <div className="counts">
      <span className="pill s-critical">{r.counts.critical} critical</span>
      <span className="pill s-high">{r.counts.high} high</span>
      <span className="pill s-medium">{r.counts.medium} medium</span>
      <span className="pill s-low">{r.counts.low} low</span>
    </div>
  );
}

function FirstReport() {
  return (
    <section className="card pn-start">
      <h2 className="pn-h2">Get your first report</h2>
      <ol className="pn-steps">
        <li>
          <b>Connect your coding agent</b>
          <span>Pick Claude Code, Codex, ChatGPT, Cursor or another agent, and follow the steps. It takes about a minute.</span>
          <a className="btn sm" href="/dashboard/new-audit">
            Start step by step
          </a>
        </li>
        <li>
          <b>
            Type <code>audit</code> in your app's project
          </b>
          <span>Your agent checks the code on your machine. Your codebase never leaves it.</span>
        </li>
        <li>
          <b>Read your report here</b>
          <span>A verdict, a score out of 100 and the exact lines to fix.</span>
        </li>
      </ol>
      <p className="pn-stuck">
        Stuck on setup?{" "}
        <BookLink from="onboarding" className="">
          Book a call
        </BookLink>{" "}
        and we'll connect it with you.
      </p>
    </section>
  );
}

/** Score, issue counts and actions for one audited part of an app. */
function PartBody({ r }: { r: AccountReport }) {
  const expired = isExpired(r.createdAt);
  return (
    <>
      <div className="pn-app-mid">
        <div className="pn-score">
          {r.score}
          <small>/100</small>
        </div>
        <Counts r={r} />
      </div>
      <div className="pn-app-actions">
        {issueCount(r) ? (
          <BookLink from="app" reportId={r.reportId}>
            Get it fixed
          </BookLink>
        ) : null}
        {expired ? (
          <span className="muted">Report expired. Type audit to run a new one.</span>
        ) : (
          <a className={issueCount(r) ? "btn ghost" : "btn"} href={`/dashboard/reports/${r.reportId}`}>
            Open report
          </a>
        )}
      </div>
    </>
  );
}

export default async function Overview() {
  const account = await requireAccount();
  const [reports, shared] = await Promise.all([listAccountReports(account.id), listSharedWithMe(account.email)]);
  const apps = groupByApp(reports);
  const urgent = apps.reduce((n, a) => n + urgentCount(a.latest), 0);
  const firstName = account.name ? account.name.split(" ")[0] : "";

  const sharedSection = shared.length ? (
    <>
      <div className="pn-sec-row" style={{ marginTop: reports.length ? 36 : 0 }}>
        <h2 className="pn-sec">Shared with you</h2>
      </div>
      <section className="card tbl" style={{ marginBottom: reports.length ? 0 : 28 }}>
        <AuditRows reports={shared} />
      </section>
    </>
  ) : null;

  const intro =
    reports.length === 0 ? (
      shared.length ? (
        `${plural(shared.length, "report")} shared with you.`
      ) : (
        "Your security reports will appear here."
      )
    ) : (
      <>
        {plural(apps.length, "app")}, {plural(reports.length, "audit")}.{" "}
        {urgent ? `${plural(urgent, "critical or high issue")} in your latest reports.` : "No critical or high issues in your latest reports."}
      </>
    );

  return (
    <Panel
      account={account}
      page="overview"
      title={firstName ? `Hi ${firstName}` : "Welcome"}
      intro={intro}
      actions={
        reports.length ? (
          <a className="btn" href="/dashboard/new-audit">
            Run a new audit
          </a>
        ) : undefined
      }
    >
      {reports.length === 0 ? (
        <>
          {sharedSection}
          <FirstReport />
        </>
      ) : (
        <>
          <h2 className="pn-sec">Your apps</h2>
          <div className="pn-apps">
            {apps.map(({ appName, latest, audits, parts }) => {
              const single = parts.length === 1;
              return (
                <article className="card pn-app" key={appName}>
                  <div className="pn-app-top">
                    <div className="pn-app-name">
                      <h3>{appName}</h3>
                      <p className="muted">
                        {single ? `${latest.stack}. ` : ""}Last audited {fmtDate(latest.createdAt)}
                        {audits > 1 ? `, ${plural(audits, "audit")}` : ""}.
                      </p>
                    </div>
                    {single ? <span className={`verdict ${verdictClass(latest.verdict)}`}>{latest.verdict}</span> : null}
                  </div>
                  {single ? (
                    <PartBody r={latest} />
                  ) : (
                    parts.map((p) => (
                      <section className="pn-part" key={p.part}>
                        <div className="pn-part-head">
                          <div>
                            <b>{p.part === "server" ? "Server" : "App"}</b>
                            <span className="muted">
                              {p.latest.stack}. {fmtDate(p.latest.createdAt)}
                            </span>
                          </div>
                          <span className={`verdict sm ${verdictClass(p.latest.verdict)}`}>{p.latest.verdict}</span>
                        </div>
                        <PartBody r={p.latest} />
                      </section>
                    ))
                  )}
                </article>
              );
            })}
          </div>

          <p className="pn-tip">
            Type <code>audit</code> in any app project to run a new check. New reports appear here automatically.
          </p>

          {reports.length > 1 ? (
            <>
              <div className="pn-sec-row">
                <h2 className="pn-sec">Recent audits</h2>
                <a href="/dashboard/audits">See all audits</a>
              </div>
              <section className="card tbl">
                <AuditRows reports={reports.slice(0, 5)} />
              </section>
            </>
          ) : null}
          {sharedSection}
        </>
      )}
    </Panel>
  );
}
