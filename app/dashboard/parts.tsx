import type { AccountReport } from "@/lib/accounts";
import type { SharedReport } from "@/lib/sharing";
import { TTL } from "@/lib/store";

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
export const isExpired = (iso: string) => Date.now() - new Date(iso).getTime() > TTL.report * 1000;
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
export const verdictClass = (v: string) => (v === "Not safe to launch" ? "v-bad" : v === "Fix before launch" ? "v-warn" : "v-ok");

function Issues({ r }: { r: AccountReport }) {
  const parts = [
    r.counts.critical ? `${r.counts.critical} critical` : "",
    r.counts.high ? `${r.counts.high} high` : "",
    r.counts.medium ? `${r.counts.medium} medium` : "",
    r.counts.low ? `${r.counts.low} low` : "",
  ].filter(Boolean);
  return <>{parts.length ? parts.join(", ") : "None"}</>;
}

const sub = (r: AccountReport | SharedReport) =>
  "sharedBy" in r ? `Shared by ${r.sharedByCompany ? `${r.sharedBy}, ${r.sharedByCompany}` : r.sharedBy}` : r.agent ? `${r.stack}, ${r.agent}` : r.stack;

/** A table of audits, newest first, each linking to its report inside the panel. */
export function AuditRows({ reports }: { reports: (AccountReport | SharedReport)[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>App</th>
          <th>Audited</th>
          <th>Score</th>
          <th>Verdict</th>
          <th>Issues</th>
          <th aria-label="Report" />
        </tr>
      </thead>
      <tbody>
        {reports.map((r) => (
          <tr key={r.reportId}>
            <td>
              <b>{r.appName}</b>
              <div className="muted">{sub(r)}</div>
            </td>
            <td className="nw">{fmtDate(r.createdAt)}</td>
            <td className="nw">
              <b>{r.score}</b>
              <span className="muted">/100</span>
            </td>
            <td className="nw">
              <span className={`verdict sm ${verdictClass(r.verdict)}`}>{r.verdict}</span>
            </td>
            <td>
              <Issues r={r} />
            </td>
            <td className="nw">
              {isExpired(r.createdAt) ? (
                <span className="muted">Expired</span>
              ) : (
                <a href={`/dashboard/reports/${r.reportId}`}>Open report</a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
