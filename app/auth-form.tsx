"use client";

import { useState } from "react";

/** Sign-up (name, company, email) or sign-in (email), then a 6-digit code from the email. */
export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const [step, setStep] = useState<"details" | "code">("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");

  async function call(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  async function sendCode(values: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const data = await call("/api/auth/start", { ...values, mode });
      setFields(values);
      setStep("code");
      setInfo(
        data.existing && mode === "signup"
          ? `You already have an account. We sent a sign-in code to ${values.email}.`
          : `We sent a 6-digit code to ${values.email}.`
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await call("/api/auth/verify", { email: fields.email, code });
      window.location.href = data.redirect || "/dashboard";
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form className="otp" onSubmit={verify}>
        <p className="note" style={{ margin: 0 }}>
          {info} It expires in 10 minutes.
        </p>
        <div className="otp-row">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            aria-label="6-digit code"
            required
            autoFocus
          />
          <button className="btn" type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </div>
        {error ? <div className="note err">{error}</div> : null}
        <p className="muted" style={{ margin: 0 }}>
          <button type="button" className="linkbtn" disabled={busy} onClick={() => sendCode(fields)}>
            Send a new code
          </button>{" "}
          ·{" "}
          <button type="button" className="linkbtn" onClick={() => (setStep("details"), setCode(""), setError(""))}>
            Use a different email
          </button>
        </p>
      </form>
    );
  }

  return (
    <form
      className={mode === "signup" ? "signup" : "signup login"}
      onSubmit={(e) => {
        e.preventDefault();
        sendCode(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
      }}
    >
      {mode === "signup" ? (
        <>
          <input name="name" required maxLength={100} placeholder="Your name" aria-label="Your name" autoComplete="name" defaultValue={fields.name} />
          <input name="company" maxLength={120} placeholder="Company (optional)" aria-label="Company" autoComplete="organization" defaultValue={fields.company} />
        </>
      ) : null}
      <input name="email" type="email" required maxLength={200} placeholder="you@company.com" aria-label="Email" autoComplete="email" defaultValue={fields.email} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Sending…" : mode === "signup" ? "Get my MCP URL" : "Email me a code"}
      </button>
      {error ? <div className="note err">{error}</div> : null}
    </form>
  );
}
