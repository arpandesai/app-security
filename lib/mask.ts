// Server-side secret masking for evidence snippets. Runs even if the agent already masked,
// so live credentials are never stored on our side.

const keep = (s: string, head = 6, tail = 4) =>
  s.length <= head + tail + 2 ? s.slice(0, 2) + "••••" : s.slice(0, head) + "••••" + s.slice(-tail);

const TOKEN_PATTERNS: RegExp[] = [
  /\b(?:sk|rk|pk)_(?:live|test)_[0-9A-Za-z]{8,}/g, // Stripe (pk_ is public, masked anyway for tidiness)
  /\bsk-(?:proj-|ant-[a-z0-9]+-)?[A-Za-z0-9_-]{16,}/g, // OpenAI / Anthropic
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{10,}/g, // Supabase new-format keys
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\bghp_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{20,}/g, // GitHub
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, // Slack
  /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g, // SendGrid
  /\bAIza[0-9A-Za-z_-]{30,}/g, // Google API key
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs (Supabase keys, tokens)
];

const PEM = /-----BEGIN ([A-Z ]*)PRIVATE KEY-----[\s\S]*?(-----END \1PRIVATE KEY-----|$)/g;

// key = "value" style assignments of secret-ish names
const ASSIGN =
  /((?:password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|access[_-]?key|auth)[A-Za-z_]*\s*[:=]\s*["'`])([^"'`\s]{6,})(["'`])/gi;

// Long opaque strings in quotes (hex/base64), likely keys
const OPAQUE = /(["'`])([A-Za-z0-9+/=_-]{32,})(["'`])/g;

export function maskSecrets(input: string): string {
  let s = input.replace(PEM, "-----BEGIN $1PRIVATE KEY----- [redacted] -----END $1PRIVATE KEY-----");
  for (const re of TOKEN_PATTERNS) s = s.replace(re, (m) => keep(m));
  s = s.replace(ASSIGN, (_m, pre, val, post) => pre + (val.includes("••••") ? val : keep(val, 3, 2)) + post);
  s = s.replace(OPAQUE, (_m, q1, val, q2) => q1 + (val.includes("••••") ? val : keep(val)) + q2);
  return s;
}

export function cleanSnippet(snippet: string | undefined): string | undefined {
  if (!snippet) return undefined;
  const lines = snippet.replace(/\r/g, "").split("\n").slice(0, 6).join("\n");
  const trimmed = lines.length > 600 ? lines.slice(0, 600) + " …" : lines;
  return maskSecrets(trimmed);
}
