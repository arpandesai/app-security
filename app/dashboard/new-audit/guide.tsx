"use client";

import { useEffect, useMemo, useState } from "react";
import { AGENT_TOOLS, type GuideStep } from "../../agent-tools";
import { CallMe } from "../call-me";

export interface GuideActivity {
  connection: { client: string; label: string; at: string } | null;
  audit: { auditId: string; appName: string; total: number; answered: number; startedAt: string; reportId?: string; serverHint?: boolean } | null;
}

const POLL_MS = 3000;
const POLL_FOR_MS = 30 * 60 * 1000;
// A connection made just before the guide was opened still counts for this run.
const GRACE_MS = 2 * 60 * 1000;

const store = {
  get(k: string, s: Storage | undefined) {
    try {
      return s?.getItem(k) ?? null;
    } catch {
      return null;
    }
  },
  set(k: string, v: string, s: Storage | undefined) {
    try {
      s?.setItem(k, v);
    } catch {}
  },
};

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** Show words in `backticks` as code. */
function withCode(text: string) {
  return text.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="snip ng-snip">
      <button
        type="button"
        className="copy"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(
            () => setDone(true),
            () => setDone(false)
          );
        }}
      >
        {done ? "Copied" : "Copy"}
      </button>
      <pre>{text}</pre>
    </div>
  );
}

function Waiting({ children }: { children: React.ReactNode }) {
  return (
    <p className="ng-status wait">
      <span className="ng-dot" aria-hidden="true" />
      {children}
    </p>
  );
}

export interface CallProps {
  defaultName: string;
  live: boolean;
  nextOpening: string | null;
  within: string;
}

export function AuditGuide({
  url,
  serverNow,
  initial,
  helpHref,
  call,
}: {
  url: string;
  serverNow: number;
  initial: GuideActivity;
  helpHref: string;
  call: CallProps;
}) {
  const [since, setSince] = useState(serverNow - GRACE_MS);
  const [activity, setActivity] = useState(initial);
  const [toolId, setToolId] = useState(AGENT_TOOLS[0].id);

  // Keep the start time across reloads of this tab, and remember the tool the customer picked.
  useEffect(() => {
    const ss = typeof sessionStorage === "undefined" ? undefined : sessionStorage;
    const ls = typeof localStorage === "undefined" ? undefined : localStorage;
    const saved = Number(store.get("mfs-guide-since", ss));
    if (saved && serverNow - saved < 2 * 60 * 60 * 1000) setSince(saved);
    else store.set("mfs-guide-since", String(serverNow - GRACE_MS), ss);
    const remembered = store.get("mfs-tool", ls);
    const fromConnection = AGENT_TOOLS.find((t) => t.name === initial.connection?.label)?.id;
    const pick = AGENT_TOOLS.find((t) => t.id === remembered)?.id ?? fromConnection;
    if (pick) setToolId(pick);
  }, [serverNow, initial.connection?.label]);

  const tool = AGENT_TOOLS.find((t) => t.id === toolId)!;
  const conn = activity.connection && Date.parse(activity.connection.at) >= since ? activity.connection : null;
  const audit = activity.audit && Date.parse(activity.audit.startedAt) >= since ? activity.audit : null;
  const ready = !!audit?.reportId;
  const connected = !!conn || !!audit;

  useEffect(() => {
    if (ready) return;
    const stopAt = Date.now() + POLL_FOR_MS;
    const id = setInterval(async () => {
      if (Date.now() > stopAt) return clearInterval(id);
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/activity", { cache: "no-store" });
        if (r.ok) setActivity(await r.json());
      } catch {}
    }, POLL_MS);
    return () => clearInterval(id);
  }, [ready]);

  // A step is done once a later live milestone has been reached.
  const liveIndex = (k: GuideStep["live"]) => tool.steps.findIndex((s) => s.live === k);
  const doneUpTo = ready ? tool.steps.length : audit ? liveIndex("audit") : connected ? liveIndex("connect") + 1 : 0;

  const previous = useMemo(
    () => (!conn && activity.connection ? activity.connection : null),
    [conn, activity.connection]
  );

  function status(step: GuideStep) {
    if (step.live === "connect") {
      if (connected)
        return (
          <p className="ng-status ok">
            Connected{conn ? ` from ${conn.label}, ${ago(conn.at)}` : ""}.
          </p>
        );
      return (
        <>
          <Waiting>Waiting for {tool.name} to connect…</Waiting>
          {previous ? (
            <p className="ng-hint">
              Last connected from {previous.label} {ago(previous.at)}. Already set up? Go straight to the last step.
            </p>
          ) : null}
        </>
      );
    }
    if (step.live === "audit") {
      if (audit?.reportId)
        return (
          <div className="ng-done">
            <p className="ng-status ok">Your report for {audit.appName} is ready.</p>
            <a className="btn" href={`/dashboard/reports/${audit.reportId}`}>
              Open report
            </a>
            {audit.serverHint ? (
              <p className="ng-next">
                Is part of your app in another project, like its server? Open that project and type <code>audit</code> there too. It
                shows up here under the same app.
              </p>
            ) : null}
          </div>
        );
      if (audit) {
        const pct = Math.round((100 * audit.answered) / Math.max(audit.total, 1));
        return (
          <div className="ng-run">
            <p className="ng-status run">
              Checking {audit.appName}: {audit.answered} of {audit.total} checks
            </p>
            <div className="ng-bar" role="progressbar" aria-valuemin={0} aria-valuemax={audit.total} aria-valuenow={audit.answered} aria-label="Audit progress">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      }
      return <Waiting>Waiting for the audit to start…</Waiting>;
    }
    return null;
  }

  return (
    <>
      <CallMe {...call} tool={toolId} page="/dashboard/new-audit" />

      <section className="card">
        <h2 className="pn-h2">Which AI tool do you code with?</h2>
        <div className="ng-tools" role="radiogroup" aria-label="Your AI coding tool">
          {AGENT_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === toolId}
              className={`ng-tool ${t.id === toolId ? "on" : ""}`}
              onClick={() => {
                setToolId(t.id);
                store.set("mfs-tool", t.id, typeof localStorage === "undefined" ? undefined : localStorage);
              }}
            >
              <b>{t.name}</b>
              <span>{t.kind}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card" aria-live="polite">
        <h2 className="pn-h2">Steps in {tool.name}</h2>
        <ol className="ng-steps">
          {tool.steps.map((s, i) => {
            const done = i < doneUpTo;
            return (
              <li key={`${tool.id}-${i}`} className={done ? "done" : ""}>
                <span className="ng-n" aria-hidden="true">
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="ng-body">
                  <h3>
                    {s.title}
                    {done ? <span className="sr-only"> (done)</span> : null}
                  </h3>
                  <p>{withCode(s.body)}</p>
                  {s.code ? <Copy text={s.code(url)} /> : null}
                  {status(s)}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="ng-stuck">
        Stuck on a step? <a href="#call">Request a call</a> and we'll set it up with you, or{" "}
        <a href={helpHref} target="_blank" rel="noopener">
          book a time
        </a>
        .
      </p>
    </>
  );
}
