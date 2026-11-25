import type { Metadata } from "next";
import type { Report } from "@/lib/types";
import { BRAND } from "@/lib/config";
import { kv } from "@/lib/store";
import { reportKey } from "@/lib/mcp";
import { getAccount } from "@/lib/accounts";
import { listReviewers } from "@/lib/sharing";
import { ReportBody } from "../../../report-body";

// Protected by HTTP basic auth in middleware.ts (ADMIN_PASSWORD).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Report — ${BRAND} admin`, robots: { index: false, follow: false } };

export default async function AdminReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = /^[A-Za-z0-9_-]{16,40}$/.test(id) ? await kv.getJSON<Report>(reportKey(id)) : null;
  const owner = report?.ownerId ? await getAccount(report.ownerId) : null;
  const reviewers = report ? await listReviewers(id) : [];

  return (
    <main className="wrap">
      <div className="top">
        <a className="logo" href={owner ? `/admin/${owner.id}` : "/admin"}>
          ← {owner ? owner.name || owner.email : "Customers"}
        </a>
        <span className="muted">Admin</span>
      </div>
      {report ? (
        <>
          <p className="shared-by">
            Owner: {owner ? `${owner.email}${owner.company ? `, ${owner.company}` : ""}` : "unknown (audit ran before accounts)"}.{" "}
            {reviewers.length ? `Reviewers: ${reviewers.map((v) => v.email).join(", ")}.` : "No reviewers."}
          </p>
          <ReportBody r={report} variant="admin" />
        </>
      ) : (
        <div className="card">Report not found or expired.</div>
      )}
    </main>
  );
}
