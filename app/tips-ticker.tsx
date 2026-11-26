"use client";

import { useState } from "react";

// Short, plain security tips that scroll across the landing page. Each one maps to a check in the audit.
const TIPS = [
  "Never ship secret keys in your app. Anyone can pull them out of the download.",
  "Turn on row-level security for every Supabase table.",
  "Firebase rules that say “allow read, write: if true” open your data to everyone.",
  "Check who owns a record on the server, not by hiding buttons in the app.",
  "Keep AI API keys on your server, with a spending cap per user.",
  "Unlock paid features only from a verified purchase, never the app’s word.",
  "Rate limit login and one-time codes so they can’t be guessed.",
  "Verify login tokens with jwt.verify. jwt.decode checks nothing.",
  "Store login tokens in the Keychain or Keystore, not plain storage.",
  "Never log passwords, tokens or full request bodies.",
  "A key committed to git is leaked, even after you delete it. Rotate it.",
  "Ship release builds with debug mode and test logins switched off.",
];

export function TipsTicker() {
  const [paused, setPaused] = useState(false);
  const row = (hidden: boolean) => (
    <ul className="lp-tips-row" aria-hidden={hidden || undefined}>
      {TIPS.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
  return (
    <section className={`lp-tips ${paused ? "paused" : ""}`} aria-label="App security tips">
      <div className="lp-tips-label">Security tips</div>
      <div className="lp-tips-window">
        <div className="lp-tips-track">
          {row(false)}
          {row(true)}
        </div>
      </div>
      <button type="button" className="lp-tips-pause" onClick={() => setPaused(!paused)} aria-pressed={paused}>
        {paused ? "Play" : "Pause"}
      </button>
    </section>
  );
}
