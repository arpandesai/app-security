// The AI coding tools customers connect, with setup instructions. Used by the Setup tabs and the
// "Run a new audit" guide. Keep ChatGPT and Codex in the list.

export type Live = "connect" | "audit";

export interface GuideStep {
  title: string;
  /** Text shown under the title. Words in `backticks` are shown as code. */
  body: string;
  /** Text to copy, built from the customer's personal MCP URL. */
  code?: (url: string) => string;
  /** Live status shown on this step: the agent connecting, or the audit running. */
  live?: Live;
}

export interface AgentTool {
  id: string;
  name: string;
  /** Where it runs, shown under the name in the picker. */
  kind: string;
  /** Setup tab: one-line instruction and the snippet to paste. */
  how: string;
  snippet: (url: string) => string;
  step2?: string;
  /** Guide: the full sequence, ending with typing audit. */
  steps: GuideStep[];
}

const CD: GuideStep = {
  title: "Open your app's project in a terminal",
  body: "Go to the folder that holds your app's code: the one with package.json, pubspec.yaml, or your Android or Xcode project.",
  code: () => "cd path/to/your-app",
};

/** The last step. `where` says where to type when it isn't obvious; `approve` says how to allow the tools. */
const AUDIT = (approve: string, where?: string): GuideStep => ({
  title: "Type audit",
  body: `${where ? `${where}, type` : "Type"} \`audit\` and send it. ${approve} The audit takes a few minutes, only reads your code, and your code never leaves your machine.`,
  code: () => "audit",
  live: "audit",
});

const jsonCursor = (u: string) => JSON.stringify({ mcpServers: { "mobilefirst-secure": { url: u } } }, null, 2);

export const AGENT_TOOLS: AgentTool[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    kind: "Terminal",
    how: "Run in your project's terminal:",
    snippet: (u) => `claude mcp add --transport http mobilefirst-secure ${u}`,
    steps: [
      CD,
      {
        title: "Add MobileFirst Secure",
        body: "Run this once, in the same folder. It connects Claude Code to your personal MobileFirst Secure link.",
        code: (u) => `claude mcp add --transport http mobilefirst-secure ${u}`,
      },
      {
        title: "Start Claude Code",
        body: "Start a new Claude Code session in that folder. This page confirms when it connects.",
        code: () => "claude",
        live: "connect",
      },
      AUDIT("When Claude Code asks to use MobileFirst Secure, choose Yes."),
    ],
  },
  {
    id: "codex",
    name: "Codex",
    kind: "Terminal, IDE",
    how: "Run in your terminal (works in the Codex CLI, IDE extension and ChatGPT desktop app):",
    snippet: (u) => `codex mcp add mobilefirst-secure --url ${u}`,
    steps: [
      CD,
      {
        title: "Add MobileFirst Secure",
        body: "Run this once. Codex uses it in the CLI, the IDE extension and the ChatGPT desktop app.",
        code: (u) => `codex mcp add mobilefirst-secure --url ${u}`,
      },
      {
        title: "Start Codex",
        body: "Start Codex in that folder, or open the folder with the Codex IDE extension. This page confirms when it connects.",
        code: () => "codex",
        live: "connect",
      },
      AUDIT("If Codex asks to use MobileFirst Secure, approve it."),
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    kind: "Desktop app",
    how: "In the ChatGPT desktop app: Settings → MCP servers → Add server → Streamable HTTP, then paste:",
    snippet: (u) => u,
    steps: [
      {
        title: "Add MobileFirst Secure",
        body: "In the ChatGPT desktop app, open Settings → MCP servers → Add server → `Streamable HTTP`. Paste your link and choose no authentication. This page confirms when it connects.",
        code: (u) => u,
        live: "connect",
      },
      {
        title: "Open your app's project",
        body: "ChatGPT reads code through Codex. In the desktop app, open Codex and pick your app's project folder. ChatGPT on the web can't see the code on your computer.",
      },
      AUDIT("If ChatGPT asks to use MobileFirst Secure, approve it."),
    ],
  },
  {
    id: "claude",
    name: "Claude",
    kind: "Desktop, web",
    how: "In the Claude app (desktop or web): Customize → Connectors → Add custom connector, then paste:",
    snippet: (u) => u,
    step2: "Give Claude your code (in the desktop app, + → Add folder; or connect your GitHub repo) and type",
    steps: [
      {
        title: "Add the connector",
        body: "In Claude, open Customize → Connectors → Add custom connector. Name it MobileFirst Secure, paste your link and choose no authentication. On Team or Enterprise plans, an Owner adds it first under Organization settings → Connectors. This page confirms when it connects.",
        code: (u) => u,
        live: "connect",
      },
      {
        title: "Give Claude your code",
        body: "In the desktop app, use + → Add folder and pick your app's project folder. Or connect your GitHub repository.",
      },
      AUDIT("Allow MobileFirst Secure when Claude asks.", "Start a new chat with the MobileFirst Secure connector turned on"),
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    kind: "Editor",
    how: "Add to .cursor/mcp.json in your project:",
    snippet: jsonCursor,
    steps: [
      {
        title: "Add MobileFirst Secure to your project",
        body: "Open your app's project in Cursor. Create a file named `.cursor/mcp.json` in the project folder and paste this in.",
        code: jsonCursor,
      },
      {
        title: "Check it's switched on",
        body: "Open Cursor Settings and find MCP. `mobilefirst-secure` should show as enabled. This page confirms when it connects.",
        live: "connect",
      },
      AUDIT("Run the MobileFirst Secure tools when Cursor asks.", "Open the Agent chat"),
    ],
  },
  {
    id: "vscode",
    name: "VS Code",
    kind: "Editor, Copilot",
    how: "In VS Code, open the Command Palette (Cmd/Ctrl+Shift+P), run MCP: Add Server, choose HTTP and paste:",
    snippet: (u) => u,
    step2: "Run MCP: List Servers, pick mobilefirst-secure, choose Start Server, then open Copilot Chat in Agent mode and type",
    steps: [
      {
        title: "Add MobileFirst Secure",
        body: "Open your app's project in VS Code. Open the Command Palette (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows), run `MCP: Add Server` and choose `HTTP`. Paste your link, and name the server `mobilefirst-secure`.",
        code: (u) => u,
      },
      {
        title: "Start it",
        body: "In the Command Palette, run `MCP: List Servers`, pick `mobilefirst-secure` and choose `Start Server`. If VS Code asks whether you trust it, confirm. This page confirms when it connects.",
        live: "connect",
      },
      AUDIT("When it asks to use the MobileFirst Secure tools, allow them.", "Open Copilot Chat (Ctrl+Alt+I, or Ctrl+Cmd+I on Mac), set the mode to `Agent`"),
    ],
  },
  {
    id: "other",
    name: "Other",
    kind: "Any MCP client",
    how: "Any MCP client with Streamable HTTP support. Server URL:",
    snippet: (u) => u,
    steps: [
      {
        title: "Add MobileFirst Secure",
        body: "Add a Streamable HTTP MCP server with your link and no authentication. This page confirms when it connects.",
        code: (u) => u,
        live: "connect",
      },
      {
        title: "Open your app's project",
        body: "Open the folder that holds your app's code in your agent.",
      },
      AUDIT("Approve the MobileFirst Secure tools if your agent asks."),
    ],
  },
];
