"use client";

import { useState } from "react";

// "Need help setting up?": ask an engineer to call. Live now during support hours (a call within minutes);
// outside them, says when the call will come, in the visitor's own time.
/** "today from 10:00 AM, your time", "tomorrow from …" or "on Friday from …", in the visitor's time zone. */
function opening(at: Date): string {
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(at) - day(new Date())) / 86400000);
  const date = days === 0 ? "today" : days === 1 ? "tomorrow" : `on ${at.toLocaleDateString(undefined, { weekday: "long" })}`;
  return `${date} from ${time}, your time`;
}

export function CallMe({
  defaultName,
  live,
  nextOpening,
  within,
  tool,
  page,
}: {
  defaultName: string;
  live: boolean;
  nextOpening: string | null;
  within: string;
  tool?: string;
  page: string;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [book, setBook] = useState("");

  const when = nextOpening ? opening(new Date(nextOpening)) : "as soon as we're back";
  const promise = live ? `in under ${within}` : when;

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
        {live ? (
          <span className="cm-live">
            <span className="cm-dot" aria-hidden="true" />
            Live now
          </span>
        ) : null}
      </div>
      {state === "done" ? (
        <p className="cm-done" role="status">
          Thanks{first ? `, ${first}` : ""}. An engineer will call {phone} {promise}
          {live ? ". Keep your project open, we'll set it up together." : "."}
        </p>
      ) : (
        <>
          <p className="cm-lead">
            {live
              ? `Request a call and one of our engineers will call you in under ${within} to set it up with you.`
              : `Leave your number and one of our engineers will call you ${when}, to set it up with you.`}
          </p>
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
