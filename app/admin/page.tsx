import type { Metadata } from "next";
import { listAccounts, listAccountReports } from "@/lib/accounts";
import { BRAND } from "@/lib/config";

// Protected by HTTP basic auth in middleware.ts (ADMIN_PASSWORD).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Admin — ${BRAND}`, robots: { index: false, follow: false } };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export default async function Admin() {
  const accounts = await listAccounts();
  const rows = await Promise.all(accounts.map(async (a) => ({ a, reports: await listAccountReports(a.id) })));
  const audits = rows.reduce((n, r) => n + r.reports.length, 0);

  return (
    <main className="wrap wide">
      <div className="top">
        <a className="logo" href="/">
          MobileFirst <span>Secure</span>
        </a>
        <span className="muted">Admin</span>
      </div>
      <h1 className="dash-h">Customers</h1>
      <p className="muted">
        {accounts.length} customers · {audits} audits
      </p>
      <div className="card tbl">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Signed up</th>
              <th>Audits</th>
              <th>Last audit</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, reports }) => {
              const last = reports[0];
              return (
                <tr key={a.id}>
                  <td>
                    <a href={`/admin/${a.id}`}>
                      <b>{a.name || a.email.split("@")[0]}</b>
                    </a>
                  </td>
                  <td>{a.company || <span className="muted">–</span>}</td>
                  <td>
                    <a href={`mailto:${a.email}`}>{a.email}</a>
                  </td>
                  <td className="nw">{fmt(a.createdAt)}</td>
                  <td>{reports.length}</td>
                  <td>
                    {last ? (
                      <a href={`/r/${last.reportId}`}>
                        {last.appName} · {last.score} · {fmt(last.createdAt)}
                      </a>
                    ) : (
                      <span className="muted">–</span>
                    )}
                  </td>
                  <td className="nw">{a.disabled ? <span className="pill s-critical">Off</span> : <span className="pill s-ok">Active</span>}</td>
                  <td className="nw">
                    <div className="actions">
                    <a href={`/admin/${a.id}`}>View</a>
                    <form method="post" action="/api/admin/accounts">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="action" value={a.disabled ? "enable" : "disable"} />
                      <button className="btn ghost sm" type="submit">
                        {a.disabled ? "Turn on" : "Switch off"}
                      </button>
                    </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  No customers yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
