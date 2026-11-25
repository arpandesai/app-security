// Core types for the MobileFirst Secure rule engine.

/** What a rule variant applies to. Detected per project from its files and dependencies. */
export type Target =
  | "any"
  | "react-native"
  | "expo"
  | "flutter"
  | "android"
  | "ios"
  | "firebase"
  | "supabase";

export type Severity = "critical" | "high" | "medium" | "low";

export type Category =
  | "SECRETS"
  | "BACKEND"
  | "STORAGE"
  | "NETWORK"
  | "AUTH"
  | "CRYPTO"
  | "PLATFORM"
  | "CODE"
  | "PRIVACY"
  | "RESILIENCE"
  | "AI";

/** launch = every app before release; scale = once real users depend on it; trust = apps handling money, health or identity data. */
export type Level = "launch" | "scale" | "trust";

/** How the coding agent should check one rule for one stack. */
export interface RuleVariant {
  target: Target;
  /** Human-readable scope shown to the agent, e.g. "React Native (JS/TS)". */
  scope: string;
  /** Glob patterns (relative to repo root) where the agent should look. */
  lookIn: string[];
  /** Regex or literal search terms that locate candidate code. Starting points, not verdicts. */
  searchFor: string[];
  /** Extra stack-specific guidance for deciding pass/fail. */
  hint?: string;
}

export interface Rule {
  id: string;
  category: Category;
  severity: Severity;
  /** Short title, founder-readable. Never contains "and" or "&". */
  title: string;
  /** What the agent must verify. */
  check: string;
  failIf: string;
  passIf: string;
  variants: RuleVariant[];
  /** Plain-English impact for a non-technical founder. */
  founder: string;
  /** Remediation guidance for the developer who fixes it. */
  fix: string;
  refs: { masvs?: string[]; maswe?: string[]; cwe?: string[] };
  /** Maturity level. Set from rules/meta.ts. */
  level?: Level;
  /** Crosswalk to other public standards (OWASP Mobile Top 10, ASVS, API/LLM/Agentic Top 10). Set from rules/meta.ts. */
  standards?: string[];
  /** The server adds public registry results (npm, pub.dev) to the agent's result for this rule. */
  registryCheck?: boolean;
  /** Evaluated on the server (e.g. dependency CVEs) rather than by the agent. */
  serverEvaluated?: boolean;
  /** Only applies to apps handling money, health or identity data (level "trust"). */
  highValueOnly?: boolean;
}

export type Status = "fail" | "pass" | "not_applicable" | "unable_to_check";

export interface Evidence {
  file: string;
  line?: number;
  snippet?: string;
}

export interface CheckResult {
  rule_id: string;
  status: Status;
  evidence?: Evidence[];
  note?: string;
}

export interface Dependency {
  ecosystem: "npm" | "Pub" | "Maven" | "SwiftURL" | "CocoaPods";
  name: string;
  version: string;
}

export interface Profile {
  frameworks: ("react-native" | "flutter" | "native")[];
  platforms: ("android" | "ios")[];
  targets: Target[];
  backends: ("firebase" | "supabase")[];
  label: string;
}

export interface AuditSession {
  id: string;
  createdAt: string;
  appName: string;
  appDescription?: string;
  profile: Profile;
  ruleIds: string[];
  agent?: string;
  rulesetVersion: string;
  /** The account whose personal MCP URL started this audit. */
  accountId?: string;
}

export interface DependencyVuln {
  package: string;
  version: string;
  ecosystem: string;
  ids: string[];
  summary?: string;
  severity: Severity;
}

/** A dependency the public registry doesn't know, or that almost nobody uses. */
export interface RegistryFlag {
  ecosystem: string;
  package: string;
  version: string;
  reason: "not_found" | "low_downloads";
  downloads?: number;
}

export interface Finding {
  ruleId: string;
  title: string;
  category: Category;
  severity: Severity;
  status: Status;
  founder: string;
  fix: string;
  evidence: Evidence[];
  note?: string;
  refs: Rule["refs"];
  standards?: string[];
  level?: Level;
}

export type Verdict = "Not safe to launch" | "Fix before launch" | "Safe to launch";

export interface Report {
  id: string;
  auditId: string;
  createdAt: string;
  appName: string;
  stack: string;
  verdict: Verdict;
  score: number;
  grade: string;
  counts: Record<Severity, number>;
  findings: Finding[]; // status === "fail", sorted by severity
  needsReview: Finding[]; // status === "unable_to_check"
  passed: { ruleId: string; title: string; category: Category }[];
  notApplicable: { ruleId: string; title: string; category: Category }[];
  dependencyVulns: DependencyVuln[];
  dependencyScan: "done" | "skipped" | "unavailable";
  registryFlags?: RegistryFlag[];
  registryScan?: "done" | "skipped" | "unavailable";
  checksRun: number;
  agent?: string;
  /** The account that ran the audit. Only it, its invited reviewers and MobileFirst admins can open the report. */
  ownerId?: string;
}
