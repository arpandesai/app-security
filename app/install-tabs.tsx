"use client";

import { useState } from "react";

type Tool = { name: string; how: string; snippet: (url: string) => string; step2?: string };

const DEFAULT_STEP2 = "Open your app's project in your agent and type";

const TOOLS: Tool[] = [
  {
    name: "Claude Code",
    how: "Run in your project's terminal:",
    snippet: (u) => `claude mcp add --transport http mobilefirst-secure ${u}`,
  },
  {
    name: "Claude",
    how: "In the Claude app (desktop or web): Customize → Connectors → Add custom connector, then paste:",
    snippet: (u) => u,
    step2: "Give Claude your code (in the desktop app, + → Add folder; or connect your GitHub repo) and type",
  },
  {
    name: "Codex",
    how: "Run in your terminal (works in the Codex CLI, IDE extension and ChatGPT desktop app):",
    snippet: (u) => `codex mcp add mobilefirst-secure --url ${u}`,
  },
  {
    name: "ChatGPT",
    how: "In the ChatGPT desktop app: Settings → MCP servers → Add server → Streamable HTTP, then paste:",
    snippet: (u) => u,
  },
  {
    name: "Cursor",
    how: "Add to .cursor/mcp.json in your project:",
    snippet: (u) => JSON.stringify({ mcpServers: { "mobilefirst-secure": { url: u } } }, null, 2),
  },
  {
    name: "VS Code",
    how: "Add to .vscode/mcp.json (GitHub Copilot agent mode):",
    snippet: (u) => JSON.stringify({ servers: { "mobilefirst-secure": { type: "http", url: u } } }, null, 2),
  },
  {
    name: "Other",
    how: "Any MCP client with Streamable HTTP support. Server URL:",
    snippet: (u) => u,
  },
];

export function InstallTabs({ url }: { url: string }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const t = TOOLS[i];
  const code = t.snippet(url);

  return (
    <div>
      <div className="tabs" role="tablist">
        {TOOLS.map((tool, n) => (
          <button
            key={tool.name}
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
