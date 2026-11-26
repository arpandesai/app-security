"use client";

import { useState } from "react";

// "Need help setting up?": ask an engineer to call.
export function CallMe({ defaultName, tool, page }: { defaultName: string; tool?: string; page: string }) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [book, setBook] = useState("");


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, tool, page, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || "Something went wrong. Try again.");
        setBook(j.book || "");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setError("You seem to be offline. Try again.");
      setState("error");
    }
  }

  const first = name.trim().split(/\s+/)[0];
  return (
    <section className="card cm" id="call" aria-labelledby="cm-h">
      <div className="cm-top">
        <h2 id="cm-h" className="pn-h2">
          Need help setting up?
        </h2>
        <span className="cm-live">
          <span className="cm-dot" aria-hidden="true" />
          Live now
        </span>
      </div>
      {state === "done" ? (
        <p className="cm-done" role="status">
          Thanks{first ? `, ${first}` : ""}. Our engineer will call you soon on {phone}.
        </p>
      ) : (
        <>
          <p className="cm-lead">Request a call and our engineer will call you soon.</p>
          <form className="cm-form" onSubmit={submit}>
            <label>
              <span>Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} />
            </label>
            <label>
              <span>Phone number</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 415 555 0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={24}
              />
            </label>
            <button className="btn" type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Requesting…" : "Request a call"}
            </button>
          </form>
          {state === "error" ? (
            <p className="cm-error" role="alert">
              {error}
              {book ? (
                <>
                  {" "}
                  <a href={book} target="_blank" rel="noopener">
                    Book a time
                  </a>
                </>
              ) : null}
            </p>
          ) : (
            <p className="cm-note">Include your country code. We only use your number to help you set up.</p>
          )}
        </>
      )}
    </section>
  );
}
