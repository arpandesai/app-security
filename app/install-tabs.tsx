"use client";

import { useState } from "react";
import { AGENT_TOOLS } from "./agent-tools";

const DEFAULT_STEP2 = "Open your app's project in your agent and type";

export function InstallTabs({ url }: { url: string }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const t = AGENT_TOOLS[i];
  const code = t.snippet(url);

  return (
    <div>
      <div className="tabs" role="tablist">
        {AGENT_TOOLS.map((tool, n) => (
          <button
            key={tool.id}
            role="tab"
            aria-selected={n === i}
            className={`tab ${n === i ? "on" : ""}`}
            onClick={() => {
              setI(n);
              setCopied(false);
            }}
          >
            {tool.name}
          </button>
        ))}
      </div>
      <p className="step" style={{ marginTop: 0, marginBottom: 10 }}>
        <b>1.</b> {t.how}
      </p>
      <div className="snip">
        <button
          className="copy"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <pre>{code}</pre>
      </div>
      <p className="step">
        <b>2.</b> {t.step2 ?? DEFAULT_STEP2} <b>audit</b>.
      </p>
    </div>
  );
}
