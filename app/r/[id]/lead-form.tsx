"use client";

import { useEffect, useState } from "react";

export function LeadForm({ reportId, intent, button }: { reportId: string; intent: "fix" | "report"; button: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, email, intent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setState("done");
      if (intent === "fix") setMsg("Thanks. A MobileFirst engineer will reply by email shortly.");
      else setMsg(data.emailed ? `Sent to ${email}.` : "Saved. You can also keep a PDF copy now.");
    } catch (err: any) {
      setState("error");
      setMsg(err.message || "Something went wrong. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="note">
        {msg}{" "}
        {intent === "report" ? (
          <button className="btn ghost" style={{ marginLeft: 8, padding: "6px 12px", fontSize: 14 }} onClick={() => window.print()}>
            Save as PDF
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address"
      />
      <button className="btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : button}
      </button>
      {state === "error" ? <div className="note" style={{ width: "100%", color: "var(--crit)" }}>{msg}</div> : null}
    </form>
  );
}

/** Opens every collapsed section before printing so the PDF contains the full report. */
export function PrintExpander() {
  useEffect(() => {
    const open = () => document.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
    window.addEventListener("beforeprint", open);
    return () => window.removeEventListener("beforeprint", open);
  }, []);
  return null;
}
