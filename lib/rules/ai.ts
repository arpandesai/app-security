import type { Rule } from "../types";
import { G } from "./globs";

export const AI_RULES: Rule[] = [
  {
    id: "MFS-AI-01",
    category: "AI",
    severity: "high",
    title: "AI output used without safety checks",
    check:
      "Find where AI model responses are displayed or used by the app or backend.",
    failIf:
      "Model output is rendered as HTML (or markdown with raw HTML enabled) in a WebView or web view, executed (eval, new Function, injected JavaScript), or used to build database queries, file paths, deep links or URLs the app opens, or tool arguments, without validation.",
    passIf:
      "Output is shown as plain text or sanitised markdown and is never executed or used to build queries, links or commands without strict validation. Not applicable if the app has no AI features.",
    variants: [
      {
        target: "any",
        scope: "App code + backend",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, G.backend],
        searchFor: ["choices\\[0\\]|\\.content\\b|completion|generateContent|messages\\.create", "dangerouslySetInnerHTML|source=\\{\\{\\s*html|loadHtmlString|loadHTMLString|loadData\\(", "react-native-markdown|flutter_markdown|html:\\s*true", "eval\\(|new Function\\(|injectJavaScript\\(|evaluateJavascript\\(|runJavaScript\\("],
      },
    ],
    founder:
      "Text from the AI model is shown as HTML, run as code, or used in database queries or links, so a crafted answer can attack the app.",
    fix:
      "Show AI output as plain text or sanitised markdown, never run it, and never build queries, links or commands from it without strict validation.",
    refs: { masvs: ["MASVS-CODE-4"], cwe: ["CWE-79", "CWE-94"] },
  },
  {
    id: "MFS-AI-02",
    category: "AI",
    severity: "high",
    title: "AI can be steered by content it reads",
    check:
      "Find what content goes into AI prompts (web pages, files, emails, other users' messages, database records) and which tools or actions the AI can trigger.",
    failIf:
      "Untrusted content is inserted into prompts alongside instructions, and the AI can call tools or actions (send messages, change data, make payments, browse, read other records) based on it, without isolation, allowlists or user confirmation.",
    passIf:
      "The AI only processes the signed-in user's own input, or untrusted content is clearly separated and the AI has no sensitive tools, or every sensitive action needs the user's confirmation. Not applicable if the app has no AI features.",
    variants: [
      {
        target: "any",
        scope: "App code + backend",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, G.backend],
        searchFor: ["tools:|functions:|tool_choice|function_call|tool_use", "scrape|readFile|retriev|embedding|vector|fetch\\(.*\\).*prompt", "role:\\s*['\\\"]system|systemPrompt|system_prompt"],
      },
    ],
    founder:
      "Web pages, files or other users' messages fed to the AI can carry hidden instructions that make it leak data or take actions.",
    fix:
      "Keep untrusted content separate from instructions, give the AI only the tools it needs, and require the user to confirm anything that sends, changes or pays.",
    refs: { cwe: ["CWE-1427"] },
  },
  {
    id: "MFS-AI-03",
    category: "AI",
    severity: "high",
    title: "AI acts beyond the user's permissions",
    check:
      "Find the tools or functions the AI can call and the credentials they run with.",
    failIf:
      "AI tool or function calls run with service-level credentials (Supabase service_role key, Firebase Admin SDK, API keys with full access) instead of the signed-in user's session, or the AI can move money, delete data or message other users without explicit user confirmation.",
    passIf:
      "AI tools act with the user's own token and permissions, and high-impact actions need confirmation. Not applicable if the AI has no tools.",
    variants: [
      {
        target: "any",
        scope: "App code + backend",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, G.backend],
        searchFor: ["tools:|functions:|tool_choice|function_call|tool_use", "service_role|SUPABASE_SERVICE|firebase-admin|admin\\.auth|adminDb", "confirm|approval|requiresConfirmation"],
      },
    ],
    founder:
      "AI tools run with full backend access instead of the signed-in user's, or move money or data without the user confirming.",
    fix:
      "Run AI tools with the signed-in user's own permissions, and require explicit confirmation before anything that moves money, deletes data or contacts other people.",
    refs: { masvs: ["MASVS-AUTH-1"], cwe: ["CWE-269"] },
  },
];
