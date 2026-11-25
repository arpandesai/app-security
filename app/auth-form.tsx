"use client";

import { useRef, useState } from "react";

/**
 * Email first, then a 6-digit code from the email.
 * "start" is the landing page (new or returning: either way they end up on the dashboard); "login" is /login.
 */
export function AuthForm({ mode, cta, next }: { mode: "start" | "login"; cta?: string; next?: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);

  async function call(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  async function sendCode(address: string, honeypot = "") {
    setBusy(true);
    setError("");
    try {
      await call("/api/auth/start", { email: address, website: honeypot, mode: mode === "start" ? "signup" : "login" });
      setStep("code");
      setTimeout(() => codeInput.current?.focus(), 0);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setError("");
    try {
      const data = await call("/api/auth/verify", { email, code: value, next });
      window.location.href = data.redirect || "/dashboard";
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form
        className="auth"
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
      >
        <p className="auth-lead">
          Check your inbox. We sent a 6-digit code to <b>{email}</b>.
        </p>
        <div className="auth-row">
          <input
            ref={codeInput}
            className="auth-code"
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6 && !busy) verify(v);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            aria-label="6-digit code"
            required
          />
          <button className="btn auth-btn" type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Continue"}
          </button>
        </div>
        {error ? (
          <p className="auth-err" role="alert">
            {error}
          </p>
        ) : null}
        <p className="auth-small">
          No email after a minute? Check spam, or{" "}
          <button
            type="button"
            className="linkbtn"
            disabled={busy}
            onClick={async () => setResent(await sendCode(email))}
          >
            {resent ? "send another code" : "send a new code"}
          </button>
          .{" "}
          <button type="button" className="linkbtn" onClick={() => (setStep("email"), setCode(""), setError(""))}>
            Change email
          </button>
        </p>
      </form>
    );
  }

  return (
    <form
      className="auth"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        sendCode(email, String(f.get("website") || ""));
      }}
    >
      <div className="auth-row">
        <label className="sr" htmlFor={`email-${mode}`}>
          Work email
        </label>
        <input
          id={`email-${mode}`}
          className="auth-email"
          type="email"
          required
          maxLength={200}
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
        <button className="btn auth-btn" type="submit" disabled={busy}>
          {busy ? "Sending code…" : cta || (mode === "start" ? "Get my free report" : "Email me a code")}
        </button>
      </div>
      {error ? (
        <p className="auth-err" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
