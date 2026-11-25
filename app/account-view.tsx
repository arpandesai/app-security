import type { Account } from "@/lib/accounts";
import { listAccountReports } from "@/lib/accounts";
import { personalMcpUrl } from "@/lib/config";
import { TTL } from "@/lib/store";
import { InstallTabs } from "./install-tabs";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const verdictClass = (v: string) => (v === "Not safe to launch" ? "v-bad" : v === "Fix before launch" ? "v-warn" : "v-ok");

/** A customer's MCP URL setup and audit list. Used by /dashboard and /admin/<id>. */
export async function AccountView({ account }: { account: Account }) {
  const reports = await listAccountReports(account.id);
  const expired = (iso: string) => Date.now() - new Date(iso).getTime() > TTL.report * 1000;

  return (
    <>
      <h2>Connect your coding agent</h2>
      <section className="card">
        <InstallTabs url={personalMcpUrl(account.token)} />
        <p className="note">This URL is personal. Anyone who has it can run audits on your account, so don't share it publicly.</p>
      </section>

      <h2>{`Your audits (${reports.length})`}</h2>
      <section className="card">
        {reports.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No audits yet. Connect your coding agent above, open your app's project and type <b>audit</b>.
          </p>
        ) : (
          <ul className="audits">
            {reports.map((r) => (
              <li key={r.reportId}>
                <div className="a-main">
                  <b>{r.appName}</b>
                  <span className="muted">
                    {fmtDate(r.createdAt)} · {r.stack}
                  </span>
                </div>
                <div className="a-side">
                  <span className="a-score">
                    {r.score}
                    <small>/100 · {r.grade}</small>
                  </span>
                  <span className={`verdict ${verdictClass(r.verdict)}`}>{r.verdict}</span>
                  {expired(r.createdAt) ? (
                    <span className="muted">Expired</span>
                  ) : (
                    <a className="btn ghost sm" href={`/r/${r.reportId}`}>
                      Open report
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
