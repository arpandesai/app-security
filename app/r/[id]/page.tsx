import type { Metadata } from "next";
import type { Report } from "@/lib/types";
import { kv } from "@/lib/store";
import { reportKey } from "@/lib/mcp";
import { BRAND, SLOGAN } from "@/lib/config";
import { ReportBody } from "../../report-body";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Security report — ${BRAND}`,
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = /^[A-Za-z0-9_-]{16,40}$/.test(id) ? await kv.getJSON<Report>(reportKey(id)) : null;

  return (
    <main className="wrap">
      <div className="top">
        <a className="logo" href="/">
          MobileFirst <span>Secure</span>
        </a>
        <a className="muted noprint" href="/login">
          Sign in
        </a>
      </div>

      {report ? (
        <ReportBody r={report} variant="public" />
      ) : (
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Report not found</h1>
          <p className="muted">This report link has expired or doesn't exist. Run the audit again from your coding agent to get a fresh report.</p>
        </div>
      )}

      <footer className="foot">
        <p>
          {BRAND} · A MobileFirst product · {SLOGAN}
        </p>
      </footer>
    </main>
  );
}
