import type { Rule, RuleVariant, WebText } from "../types";
import { G } from "./globs";

/**
 * Web app support (Next.js, React with Vite or Create React App).
 *
 * WEB_SUPPORT: checks that already exist for mobile and also apply to web apps. Each gets web variants
 * (files and patterns to inspect) and, where the mobile wording doesn't fit, web wording used for
 * web-only audits. `mobileOnlyAny` moves the rule's existing "any" variants to "mobile" because their
 * search terms are mobile-specific.
 *
 * WEB_RULES: checks that only exist for web apps.
 */
export const WEB_SUPPORT: Record<string, { variants?: RuleVariant[]; web?: WebText; mobileOnlyAny?: boolean }> = {
  "MFS-SECRETS-01": {
    variants: [
      {
        target: "web",
        scope: "Web: values exposed to the browser",
        lookIn: [G.env, G.webConfig, G.js, "public/**"],
        searchFor: [
          "NEXT_PUBLIC_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD)",
          "VITE_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD)",
          "REACT_APP_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD)",
          "import\\.meta\\.env\\.",
          "['\"]use client['\"]",
        ],
        hint: "NEXT_PUBLIC_, VITE_ and REACT_APP_ variables are copied into the JavaScript every visitor downloads, and so is anything a 'use client' component imports. Values used only in server code (route handlers, server actions, server components, getServerSideProps) don't reach the browser.",
      },
    ],
    web: {
      title: "Secret keys exposed to the browser",
      check:
        "Search browser code, files under public/, build config and environment files for secret (server-side) credentials, and work out which values reach the browser. Publishable/public identifiers are fine: Stripe pk_ keys, the Firebase web config apiKey, Supabase anon or sb_publishable_ keys, restricted Google Maps keys.",
      failIf:
        "A secret or private credential reaches the browser: Stripe sk_live_/rk_live_ keys, AWS secret access keys, OpenAI/Anthropic/other AI keys, GitHub/Slack/SendGrid/Twilio tokens, private keys, database passwords, Supabase service_role keys, webhook signing secrets or admin credentials, in client code, files under public/, or environment variables exposed to the client (NEXT_PUBLIC_*, VITE_*, REACT_APP_*).",
      passIf: "Only publishable or public identifiers reach the browser; secrets are read only by server code.",
      founder:
        "Anyone can open your site, view its JavaScript and copy these keys in minutes. With a secret key they can act as your company: charge cards, read your data, or run up your cloud or AI bill.",
      fix: "Rotate every exposed key now. Move the code that needs it into a route handler, server action or serverless function, read the key from a server-only environment variable (no NEXT_PUBLIC_, VITE_ or REACT_APP_ prefix), and have the browser call that endpoint.",
    },
  },
  "MFS-SECRETS-02": {
    variants: [
      {
        target: "web",
        scope: "Web: browser vs server code",
        lookIn: [G.js, G.env],
        searchFor: [
          "['\"]use client['\"]",
          "dangerouslyAllowBrowser",
          "NEXT_PUBLIC_[A-Z0-9_]*(OPENAI|ANTHROPIC|GEMINI|GROQ|MISTRAL|OPENROUTER|DEEPSEEK)",
          "VITE_[A-Z0-9_]*(OPENAI|ANTHROPIC|GEMINI|GROQ|MISTRAL|OPENROUTER|DEEPSEEK)",
        ],
        hint: "Calls in route handlers, server actions, server components or serverless functions are server-side and fine. A call in a 'use client' file, anywhere in a Vite or Create React App bundle, or through an SDK created with dangerouslyAllowBrowser is a fail.",
      },
    ],
    web: {
      title: "AI provider called from the browser",
      check: "Find calls to AI model providers and whether each runs in browser code or server code.",
      failIf:
        "Browser code calls an AI provider API with an API key, whatever the key's source: a 'use client' component, a Vite or Create React App bundle, or an SDK created with dangerouslyAllowBrowser. Includes OpenAI, Anthropic, Google Gemini, Groq, Mistral, OpenRouter, DeepSeek, Replicate.",
      passIf: "AI calls go through your own server code, which holds the key and applies per-user limits.",
      founder:
        "Your AI key travels to every visitor's browser. Someone can copy it and use your AI account for free. You pay the bill, which can reach thousands of dollars overnight.",
      fix: "Move the AI call into a route handler, server action or serverless function, keep the key in a server-only environment variable, rotate the exposed key, and add per-user rate limits.",
    },
  },
  "MFS-SECRETS-04": {
    web: {
      title: "Private keys or cloud credentials committed to the repo",
      check:
        "Look for private keys, cloud service-account credentials and real secrets committed to the repository (they may never reach the browser, but anyone with repo access can use them).",
      failIf:
        "Committed: private keys (.pem, .p12, BEGIN PRIVATE KEY), Google or Firebase service-account JSON (\"type\": \"service_account\"), cloud access keys, or real secrets in committed .env files.",
      passIf: "Credentials are kept in your host's environment variables, CI secrets or a password manager, and .gitignore covers .env files and key files.",
      fix: "Remove these files from the repo and its history, rotate the credentials, and store them in your host's environment variables or CI secret store. Add the patterns to .gitignore.",
      founder:
        "Cloud credentials and service-account keys sit in your code repository. Anyone with repo access, past contractors included, can use them to reach your cloud accounts.",
    },
  },
  "MFS-SECRETS-05": {},
  "MFS-BACKEND-01": {
    variants: [
      {
        target: "web",
        scope: "Web: where each Supabase client runs",
        lookIn: [G.js, G.env],
        searchFor: [
          "createClient\\(|createServerClient\\(|createBrowserClient\\(",
          "SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY|sb_secret_",
          "NEXT_PUBLIC_SUPABASE_SERVICE|VITE_SUPABASE_SERVICE|REACT_APP_SUPABASE_SERVICE",
          "['\"]use client['\"]",
        ],
        hint: "A service_role or sb_secret_ key used only in server code, read from a server-only environment variable, is acceptable on the web. It fails when it reaches the browser: a NEXT_PUBLIC_, VITE_ or REACT_APP_ variable, a 'use client' file, or any client in a Vite or Create React App project.",
      },
    ],
    web: {
      title: "Supabase admin key exposed to the browser",
      failIf:
        "A Supabase service_role key or sb_secret_ key reaches browser code: a NEXT_PUBLIC_, VITE_ or REACT_APP_ variable, a 'use client' file, or a Supabase client created in a Vite or Create React App bundle.",
      passIf: "The browser uses only the anon or sb_publishable_ key; admin keys stay in server-only code.",
      fix: "Rotate the key in Supabase now. Use the anon or publishable key in the browser, and keep the service_role key in server-only code, read from an environment variable without a public prefix.",
    },
  },
  "MFS-BACKEND-02": {
    web: { founder: "With the public key in your site's JavaScript, anyone can query these tables directly. No login, no limits." },
  },
  "MFS-BACKEND-03": {
    web: {
      founder:
        "Your database can be read or changed by anyone on the internet who knows your project ID, and that ID is in your site's code.",
    },
  },
  "MFS-BACKEND-04": {
    variants: [
      {
        target: "web",
        scope: "Web: route handlers, server actions, middleware",
        lookIn: [G.webRoutes, G.middleware, G.js],
        searchFor: [
          "export (async )?function (GET|POST|PUT|PATCH|DELETE)",
          "['\"]use server['\"]",
          "params\\.(id|userId|slug)|searchParams\\.get\\(",
          "getServerSession|auth\\(\\)|currentUser\\(|getUser\\(|getSession\\(",
          "matcher\\s*:",
        ],
        hint: "Every route handler and server action can be called directly, without your UI. Each must check the session and that the record belongs to the caller. Middleware alone isn't enough when its matcher skips routes, and server actions need their own checks.",
      },
    ],
    web: {
      check:
        "Find features limited by role, plan or ownership (admin pages, premium features, other users' records), and every route handler, server action, API route or function that reads or changes records by ID or accepts prices, plans, roles or user IDs from the browser. Determine where each limit is enforced.",
      failIf:
        "(a) Access to privileged data or actions is decided only in browser code (hiding a button, filtering other users' records in the browser, a client-side premium flag) with no matching check on the server or in database policies; or (b) a route handler, server action or function returns or changes a record by ID without checking it belongs to the signed-in user; or (c) the server takes price, plan, role, credits or user ID from the request instead of deriving them on the server.",
      passIf:
        "The server or database policies enforce every permission and ownership check, and the server computes prices, plans and roles itself; browser checks only shape the UI. Not applicable if the app has no roles, plans or per-user data.",
      founder: "Your server hands over or changes data without checking who's asking: other users' records, admin features, or prices the browser makes up.",
      fix: "In every route handler and server action, check that the signed-in user owns the record and may perform the action, and compute prices, plans and roles on the server. Treat the browser as untrusted.",
    },
  },
  "MFS-BACKEND-05": {
    mobileOnlyAny: true,
    variants: [
      {
        target: "web",
        scope: "Web: checkout, payment webhooks",
        lookIn: [G.js, G.webRoutes],
        searchFor: [
          "checkout\\.sessions\\.create|stripe\\.checkout|redirectToCheckout",
          "success_url|successUrl",
          "webhooks\\.constructEvent|stripe-signature",
          "lemonsqueezy|paddle|razorpay",
          "isPremium|isPro|hasSubscription",
        ],
        hint: "On the web, a payment is confirmed by a signature-verified webhook from the payment provider, not by reaching the success page or by a value the browser sends.",
      },
    ],
    web: {
      check: "Find checkout and subscription handling and how paid access is granted.",
      failIf:
        "Paid access is granted when the browser reaches a success URL, from a client-side flag or query parameter, or from a payment webhook whose signature isn't verified.",
      passIf: "Paid access is granted only from a signature-verified provider webhook (or a server-side lookup with the provider), and stored on the server.",
      founder: "Paid features can be unlocked for free, because the site takes the browser's word that a payment happened.",
      fix: "Grant access from the payment provider's webhook, verified with its signing secret (for Stripe, stripe.webhooks.constructEvent), and check entitlement on the server for every paid request.",
    },
  },
  "MFS-BACKEND-08": {},
  "MFS-STORAGE-01": {
    variants: [
      {
        target: "web",
        scope: "Web: browser storage",
        lookIn: [G.js],
        searchFor: [
          "localStorage\\.setItem|sessionStorage\\.setItem",
          "localforage|idb-keyval|indexedDB",
          "document\\.cookie\\s*=",
          "(access|refresh|id)_?token|jwt|password",
          "persist\\(",
        ],
        hint: "Anything in localStorage, sessionStorage or IndexedDB can be read by any script on the page, so one injection bug exposes it. Supabase and Firebase browser SDKs keep their own session in browser storage by default; judge what the app's own code adds.",
      },
    ],
    web: {
      title: "Login tokens or personal data stored in the browser",
      check: "Trace where the site stores auth tokens, refresh tokens, passwords, session IDs and sensitive personal data in the browser.",
      failIf:
        "The app's own code writes long-lived tokens, passwords or sensitive personal data to localStorage, sessionStorage or IndexedDB, or sets auth cookies from JavaScript (document.cookie) instead of HttpOnly cookies from the server.",
      passIf:
        "Sessions use HttpOnly, Secure cookies set by the server, or the auth provider's SDK defaults, and no sensitive personal data is persisted in browser storage.",
      founder:
        "Any script running on your site, injected by an attacker or from a compromised third-party library, can read these and take over the user's account.",
      fix: "Keep sessions in HttpOnly, Secure, SameSite cookies set by the server, and don't write tokens or personal data to localStorage or sessionStorage yourself.",
    },
  },
  "MFS-STORAGE-03": {
    variants: [
      {
        target: "web",
        scope: "Web: console, error tracking",
        lookIn: [G.js],
        searchFor: ["console\\.(log|info|debug)\\(", "sendDefaultPii|beforeSend", "Sentry\\.(init|setUser)|LogRocket|posthog"],
        hint: "Browser console output is visible to anyone with developer tools, and hosting platforms keep server logs. Tokens in URLs leak through history, Referer headers and analytics.",
      },
    ],
    web: {
      check: "Review log statements in browser and server code, and URLs the site builds.",
      passIf:
        "Logs are generic or limited to development, console calls are stripped from production builds, error tracking scrubs personal data, and secrets travel in headers or request bodies.",
      fix: "Remove sensitive values from logs, strip console output from production builds, scrub personal data in your error-tracking setup, and send secrets in headers or request bodies, never in URLs.",
      founder: "Logins and personal data end up in browser consoles, server logs, error-tracking tools and analytics, where other people can read them.",
    },
  },
  "MFS-NETWORK-01": {
    variants: [
      {
        target: "web",
        scope: "Web: mixed content",
        lookIn: [G.webConfig, G.html, G.js],
        searchFor: ["http://(?!localhost|127\\.0\\.0\\.1)", "action=[\"']http://", "upgrade-insecure-requests"],
        hint: "Hosting platforms serve your pages over HTTPS; the fail is the site or its server calling APIs, loading scripts or posting forms over http:// in production.",
      },
    ],
    web: {
      check: "Find plain http:// URLs the site or its server code connects to or loads resources from.",
      fix: "Use https:// for every API, script, image and form target, and add upgrade-insecure-requests to your Content-Security-Policy.",
      failIf:
        "The site or its server code talks to a production server over http://, or loads scripts, styles, images or form targets over http:// (mixed content).",
      passIf: "Every production URL uses https://.",
      founder: "Anyone on the same Wi-Fi can read or change what's sent over plain HTTP, including logins and personal data.",
    },
  },
  "MFS-NETWORK-02": {
    variants: [
      {
        target: "web",
        scope: "Web: server-side TLS settings",
        lookIn: [G.js, G.env, G.webConfig, "package.json"],
        searchFor: ["rejectUnauthorized:\\s*false", "NODE_TLS_REJECT_UNAUTHORIZED", "strictSSL:\\s*false", "checkServerIdentity"],
        hint: "NODE_TLS_REJECT_UNAUTHORIZED=0 in an env file or start script turns off certificate checks for the whole server process.",
      },
    ],
    web: {
      check: "Look for server code or settings that turn off TLS certificate or hostname validation.",
      failIf:
        "Any code path or environment setting accepts all certificates: rejectUnauthorized: false, NODE_TLS_REJECT_UNAUTHORIZED=0, strictSSL: false, or a checkServerIdentity that always passes.",
      passIf: "Default certificate validation everywhere.",
      fix: "Delete the override and rely on default certificate validation. For internal services with private certificates, add their CA to the trusted list (NODE_EXTRA_CA_CERTS) instead of turning checks off.",
      founder:
        "Your server accepts any certificate, so someone on the network path can impersonate the services it calls and read or change the traffic, including API keys and user data.",
    },
  },
  "MFS-AUTH-02": {
    variants: [
      {
        target: "web",
        scope: "Web: OAuth configuration",
        lookIn: [G.js, G.env, G.webRoutes],
        searchFor: ["client_secret|clientSecret", "NEXT_PUBLIC_[A-Z0-9_]*SECRET|VITE_[A-Z0-9_]*SECRET", "response_type=token", "redirect_uri|redirectTo|callbackUrl", "state="],
        hint: "OAuth client secrets stay in server code. Check that the callback validates state, the redirect URI is fixed rather than taken from the request, and the authorization code flow (with PKCE for public clients) is used.",
      },
    ],
    web: {
      title: "Insecure login flow or OAuth secret in the browser",
      failIf:
        "An OAuth client_secret reaches browser code; the implicit flow (response_type=token) or password grant is used; the callback doesn't validate state; or the redirect URI is taken from the request without an allowlist.",
      passIf: "The authorization code flow runs with the secret on the server (or PKCE for public clients), state is validated, and redirect URIs are fixed.",
      founder: "The way users log in can be intercepted or abused, and the secret your login provider gave you is in your site's JavaScript.",
      fix: "Use the authorization code flow with the client secret only on the server (or PKCE for browser-only apps), validate state on the callback, fix the allowed redirect URIs, and rotate any secret that reached the browser.",
    },
  },
  "MFS-AUTH-03": {
    web: {
      failIf:
        "Logout only clears client state or redirects, but leaves the session cookie or token valid, or never revokes the session with the backend or auth provider.",
      passIf: "Logout clears the session cookie or stored tokens and revokes the session with the backend or auth provider.",
      founder: "After a user logs out, their session still works, from the same browser or with a copied token.",
    },
  },
  "MFS-AUTH-04": {
    web: {
      failIf: "These actions run with just the existing session, without re-entering a password, a passkey or a one-time code.",
      fix: "Ask for the password, a passkey or a one-time code again before account changes and money movement, and check it on the server.",
      founder:
        "If someone gets into a signed-in browser or steals a session, they can take over the account or move money without proving who they are.",
    },
  },
  "MFS-CRYPTO-01": {
    web: {
      failIf:
        "An encryption key, IV/nonce, salt or encryption password is a literal in code or config, sits in a variable exposed to the browser (NEXT_PUBLIC_, VITE_, REACT_APP_), or is derived from a constant.",
      passIf:
        "Keys live in server-side secrets or a key management service, and data that must stay secret is encrypted on the server. Not applicable if the app does no custom encryption.",
      founder: "The lock and its key ship together. Anyone who views your site's code can decrypt everything this code is meant to protect.",
      fix: "Encrypt on the server, keep keys in your host's secret store or a key management service, and rotate any key that was committed or exposed.",
    },
  },
  "MFS-CRYPTO-02": {
    variants: [
      {
        target: "web",
        scope: "Web: randomness, hashing",
        lookIn: [G.js],
        searchFor: ["Math\\.random\\(", "createHash\\(['\"](md5|sha1)", "crypto-js", "uuid.*v1|uuidv1"],
        hint: "Use crypto.randomUUID or crypto.getRandomValues for tokens and IDs, and bcrypt, scrypt or argon2 for passwords.",
      },
    ],
    web: {
      failIf:
        "Any of: DES, 3DES, RC4 or Blowfish; AES in ECB mode; home-made 'encryption' (XOR, Base64) protecting sensitive data; MD5 or SHA-1 for passwords, tokens, signatures or integrity checks; a fast hash (plain SHA-256) for stored passwords; or Math.random creating tokens, OTPs, passwords, nonces, IVs, keys or invite codes.",
      passIf:
        "AES-GCM through Web Crypto or Node's crypto module, SHA-256+ for integrity, bcrypt, scrypt or Argon2 for passwords, and crypto.getRandomValues or crypto.randomUUID for security values. Non-security uses (MD5 cache keys, Math.random for UI) are fine. Not applicable if the app does no custom cryptography.",
      founder: "Your site protects data with outdated or predictable cryptography that attackers can break, reverse or guess with free tools.",
      fix: "Use AES-GCM through Web Crypto or Node's crypto module, SHA-256+ for integrity, bcrypt, scrypt or Argon2 for passwords, and crypto.getRandomValues or crypto.randomUUID for every security value.",
    },
  },
  "MFS-AI-01": {
    web: {
      failIf:
        "Model output is rendered as HTML (dangerouslySetInnerHTML, innerHTML, or markdown with raw HTML enabled), executed (eval, new Function), or used to build database queries, file paths, redirects, URLs or tool arguments, without sanitising or strict validation.",
      founder: "Text from the AI model is shown as HTML, run as code, or used in database queries or links, so a crafted answer can attack your site and its visitors.",
    },
  },
  "MFS-AI-02": {},
  "MFS-AI-03": {},
  "MFS-CODE-01": {
    variants: [
      {
        target: "web",
        scope: "npm",
        lookIn: ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock"],
        searchFor: ["dependencies"],
        hint: "ecosystem \"npm\". Use direct dependencies from package.json, with versions resolved from the lockfile.",
      },
    ],
    web: { founder: "Your site includes third-party code with publicly known security holes. Attackers look for sites using these versions." },
  },
  "MFS-CODE-03": {
    web: {
      title: "Test leftovers in production",
      failIf:
        "Any of: hardcoded test credentials, master passwords or OTPs (e.g. '123456' accepted as a valid code), skip-login flags or debug shortcuts that can be enabled in production; admin, debug, seed or test routes reachable without admin authentication; or production builds that point at staging/dev servers or carry test-environment keys (sk_test_, pk_test_).",
      passIf: "No such leftovers, or they run only in development, and production config points only at production servers.",
      fix: "Remove test credentials, bypasses and debug routes from production code, protect admin routes with real authorisation, and point production builds only at production servers.",
      founder: "Shortcuts built for testing (test logins, debug endpoints, staging servers) are still in the live site, where anyone can use them.",
    },
  },
  "MFS-CODE-07": {
    web: {
      failIf:
        "No lockfile is committed (package-lock.json, yarn.lock, pnpm-lock.yaml or bun.lock), or a dependency is pulled from a URL or git branch without a pinned commit. Registry findings are added by the server.",
      fix: "Remove packages that don't exist or that you can't verify, check each real package name against its official docs, commit your lockfile, and install with npm ci (or your package manager's frozen-lockfile option).",
    },
  },
  "MFS-PRIVACY-03": {
    mobileOnlyAny: true,
    variants: [
      {
        target: "web",
        scope: "Web: ad pixels, analytics, consent",
        lookIn: [G.js, G.html],
        searchFor: [
          "gtag\\(|googletagmanager|google-analytics",
          "fbq\\(|connect\\.facebook\\.net|tiktok|snap\\.licdn|linkedin.*insight",
          "hotjar|clarity\\.ms|fullstory",
          "consent|CookieConsent|cookiebot|onetrust|klaro",
        ],
        hint: "Look at what loads before the visitor makes a choice. Ad pixels and tracking analytics that set cookies or identifiers on page load, with no consent check, are the fail.",
      },
    ],
    web: {
      check: "Find advertising pixels, tracking analytics and session-replay scripts, then check consent handling.",
      failIf:
        "Advertising pixels or cross-site tracking scripts load and set cookies or identifiers before the visitor consents, or there is no consent mechanism while such scripts run.",
      passIf: "Tracking scripts load only after consent, or the site uses no cross-site tracking.",
      founder: "Tracking visitors without asking can lead to privacy fines in many regions, and it erodes trust.",
      fix: "Load ad pixels and tracking analytics only after consent through a consent banner, and prefer analytics that don't need cookies.",
    },
  },
  "MFS-PRIVACY-04": {
    web: { founder: "Your users' personal details are copied to outside companies, including AI providers, which can break privacy laws." },
  },
  "MFS-RESILIENCE-01": {
    variants: [
      {
        target: "web",
        scope: "Web: debug output, error details",
        lookIn: [G.js, G.webConfig, G.env, "package.json"],
        searchFor: ["err(or)?\\.stack", "debug:\\s*true|DEBUG=", "\"start\":\\s*\"(next dev|vite)", "NODE_ENV\\s*=\\s*['\"]?development"],
        hint: "Look for error responses that return stack traces or internal messages to the browser, debug flags left on, or a production start script that runs a development server.",
      },
    ],
    web: {
      title: "Debug features enabled in production",
      check: "Check production build and start settings, error handling in server code, and unconditional debug switches.",
      failIf:
        "Production runs a development server or debug mode (next dev, vite dev, DEBUG flags), or server code returns stack traces or internal error details to the browser.",
      passIf: "Production runs a production build and returns generic error messages to the browser.",
      founder: "Your live site hands out internal details, like stack traces and debug output, that show attackers how it works and where to aim.",
      fix: "Run production builds in production, turn debug flags off, and log errors on the server while returning a generic message to the browser.",
    },
  },
  "MFS-RESILIENCE-02": {
    variants: [
      {
        target: "web",
        scope: "Web: source maps",
        lookIn: [G.webConfig, G.env, "package.json"],
        searchFor: ["productionBrowserSourceMaps:\\s*true", "sourcemap:\\s*(true|['\"](inline|hidden)['\"])", "GENERATE_SOURCEMAP", "devtool:"],
        hint: "Create React App publishes source maps unless GENERATE_SOURCEMAP=false. Next.js does only with productionBrowserSourceMaps: true; Vite only with build.sourcemap.",
      },
    ],
    web: {
      title: "Source maps published in production",
      check: "Check whether production builds publish JavaScript source maps.",
      failIf:
        "The app handles money, health or identity data and production builds publish source maps: productionBrowserSourceMaps: true (Next.js), build.sourcemap enabled (Vite), or Create React App without GENERATE_SOURCEMAP=false.",
      passIf: "Production builds don't publish source maps, or upload them privately to an error-tracking tool.",
      founder: "Your original source code, comments included, can be downloaded by anyone, which makes it easier to find weak spots or copy your logic.",
      fix: "Turn off public source maps in production builds. If you need them for error tracking, upload them privately (for example to Sentry) and don't serve them.",
    },
  },
};

const web = (scope: string, lookIn: string[], searchFor: string[], hint?: string): RuleVariant => ({
  target: "web",
  scope,
  lookIn,
  searchFor,
  ...(hint ? { hint } : {}),
});

export const WEB_RULES: Rule[] = [
  {
    id: "MFS-BACKEND-09",
    category: "BACKEND",
    severity: "high",
    platforms: ["web"],
    title: "CORS open to any origin with credentials",
    check: "Find CORS configuration in server code, middleware, next.config headers, vercel.json and serverless functions.",
    failIf:
      "An API that uses cookies or other credentials reflects the request's Origin (or allows every origin) while sending Access-Control-Allow-Credentials: true, or an API that returns private data allows any origin.",
    passIf: "CORS allows only your own origins, or the API uses no browser credentials and returns no private data.",
    variants: [
      web("Web: CORS", [G.webRoutes, G.middleware, G.webConfig, G.backend, G.js], [
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials",
        "cors\\(",
        "origin:\\s*(true|['\"]\\*['\"])",
        "req\\.headers\\.origin|headers\\.get\\(['\"]origin['\"]\\)",
      ]),
    ],
    founder: "Any website a signed-in user visits can read their private data from your API, as if it were your own site.",
    fix: "Allow only your own origins, never echo back the request's Origin, and allow credentials only for those origins.",
    refs: { cwe: ["CWE-942"] },
  },
  {
    id: "MFS-BACKEND-10",
    category: "BACKEND",
    severity: "high",
    platforms: ["web"],
    title: "Server fetches URLs supplied by users",
    check: "Find server code that fetches a URL taken from the request or from user data: link previews, image proxies, webhooks, imports, AI tools that browse.",
    failIf:
      "Server code passes a user-supplied URL to fetch, axios, got, an image optimiser or a headless browser without allowing only expected hosts and blocking private and internal addresses (localhost, 127.0.0.1, 10.0.0.0/8, 169.254.169.254).",
    passIf: "Server-side fetches use fixed URLs, or check the destination against an allowlist after resolving it.",
    variants: [
      web(
        "Web: server-side fetches",
        [G.webRoutes, G.backend, G.js, G.webConfig],
        ["fetch\\((req|request|body|params|searchParams|url)", "axios\\.(get|post)\\((req|body|url)", "got\\(|node-fetch|undici", "remotePatterns|domains:\\s*\\[", "puppeteer|playwright"],
        "next.config images.remotePatterns with hostname '**' lets the image optimiser fetch from anywhere."
      ),
    ],
    founder:
      "Attackers can make your server request internal addresses, like your cloud's metadata service, and pull out credentials or reach systems that aren't public.",
    fix: "Fetch only from an allowlist of hosts, resolve the address and block private and link-local ranges, and don't follow redirects to other hosts.",
    refs: { cwe: ["CWE-918"] },
  },
  {
    id: "MFS-AUTH-05",
    category: "AUTH",
    severity: "medium",
    platforms: ["web"],
    title: "Session cookies without secure flags",
    check: "Find where the site sets session or auth cookies: auth library cookie options, cookies().set, res.cookie, Set-Cookie headers.",
    failIf: "A session or auth cookie is set without HttpOnly, without Secure in production, or with SameSite=None without a cross-site need.",
    passIf: "Session cookies are HttpOnly, Secure and SameSite=Lax or Strict, or the auth library's secure defaults are left unchanged.",
    variants: [
      web("Web: cookies", [G.js, G.webRoutes, G.middleware], [
        "cookies\\(\\)\\.set\\(|res\\.cookie\\(|Set-Cookie|serialize\\(",
        "httpOnly:\\s*false|secure:\\s*false",
        "sameSite:\\s*['\"]?none",
        "cookieOptions|cookies:\\s*\\{",
      ]),
    ],
    founder: "Login cookies can be read by injected scripts or sent over insecure connections, which lets attackers take over sessions.",
    fix: "Set session cookies with HttpOnly, Secure and SameSite=Lax (or Strict), and keep the auth library's defaults unless you have a specific reason.",
    refs: { cwe: ["CWE-1004", "CWE-614"] },
  },
  {
    id: "MFS-AUTH-06",
    category: "AUTH",
    severity: "medium",
    platforms: ["web"],
    title: "State-changing requests without CSRF protection",
    check: "Find endpoints that change data and authenticate with cookies: route handlers, API routes, form handlers.",
    failIf:
      "A cookie-authenticated endpoint changes data on GET, or accepts cross-site POST requests (for example form or text/plain bodies) with no CSRF token, no Origin check and no SameSite=Lax or Strict session cookie.",
    passIf:
      "State changes use POST, PUT, PATCH or DELETE, and cookie-authenticated requests are protected by SameSite=Lax or Strict cookies plus an Origin check or CSRF token. Next.js server actions check the Origin header by default.",
    variants: [
      web(
        "Web: state-changing endpoints",
        [G.webRoutes, G.js, G.middleware],
        ["export (async )?function GET", "app\\.(post|put|delete)\\(|router\\.(post|put|delete)\\(", "csrf|csurf|x-csrf-token", "sameSite", "Authorization['\"]?:\\s*`?Bearer"],
        "Answer not_applicable when the API authenticates with a bearer token in the Authorization header rather than cookies."
      ),
    ],
    founder: "Another website can make a signed-in visitor's browser change their settings, post as them or move money, without them noticing.",
    fix: "Change data only with POST, PUT, PATCH or DELETE, keep session cookies SameSite=Lax or Strict, and check the Origin header or a CSRF token on cookie-authenticated endpoints.",
    refs: { cwe: ["CWE-352"] },
  },
  {
    id: "MFS-PLATFORM-05",
    category: "PLATFORM",
    severity: "high",
    platforms: ["web"],
    title: "Unsafe HTML rendering",
    check:
      "Find every place the site renders HTML from a string or builds links from data: dangerouslySetInnerHTML, innerHTML, markdown rendered with raw HTML, and href or src values built from user or API data.",
    failIf:
      "User-controlled or third-party content (other users' posts, profile fields, URL parameters, API or AI responses, CMS content) reaches dangerouslySetInnerHTML, innerHTML/outerHTML, insertAdjacentHTML, document.write or a markdown renderer with raw HTML enabled without sanitising (DOMPurify or equivalent), or a link uses a user-supplied URL without blocking javascript: URLs.",
    passIf: "Content is rendered as text by the framework, or sanitised with an allowlist sanitiser before it is inserted as HTML.",
    variants: [
      web(
        "Web: HTML sinks",
        [G.js, G.html],
        [
          "dangerouslySetInnerHTML",
          "\\.innerHTML\\s*=|outerHTML|insertAdjacentHTML",
          "document\\.write\\(",
          "rehype-raw|allowDangerousHtml|marked\\(|markdown-it",
          "href=\\{[^}]*(url|link|href)",
          "DOMPurify|sanitize",
        ],
        "React escapes text by default; the risk is wherever that protection is bypassed."
      ),
    ],
    founder: "A crafted post, profile field or link can run its own code in other visitors' browsers: steal their session, act as them, or show fake content.",
    fix: "Render user and API content as text. Where HTML is needed, sanitise it with DOMPurify (or the framework's sanitiser) using a strict allowlist, and only allow http and https URLs in links.",
    refs: { cwe: ["CWE-79"] },
  },
  {
    id: "MFS-PLATFORM-06",
    category: "PLATFORM",
    severity: "medium",
    platforms: ["web"],
    title: "Missing security headers",
    check: "Find where the site sets HTTP response headers: next.config headers(), middleware, vercel.json, netlify.toml or _headers, and server code.",
    failIf:
      "Production responses have no Content-Security-Policy (or at least frame-ancestors or X-Frame-Options against framing) or no Strict-Transport-Security, or the policy allows scripts from any source ('unsafe-inline' together with * or https:).",
    passIf: "A Content-Security-Policy with frame-ancestors, Strict-Transport-Security and X-Content-Type-Options: nosniff are set for every page.",
    variants: [
      web(
        "Web: response headers",
        [G.webConfig, G.middleware, G.js, G.html],
        ["Content-Security-Policy", "frame-ancestors|X-Frame-Options", "Strict-Transport-Security", "X-Content-Type-Options", "async headers\\(\\)", "unsafe-inline|unsafe-eval"],
        "Some hosting platforms add Strict-Transport-Security on their own. If headers are set only in a hosting dashboard, answer unable_to_check."
      ),
    ],
    founder:
      "Without these headers, a single injection bug does more damage, other sites can frame yours to trick users into clicks, and browsers can fall back to insecure connections.",
    fix: "Set a Content-Security-Policy (start with default-src 'self'; frame-ancestors 'none'), Strict-Transport-Security, X-Content-Type-Options: nosniff and Referrer-Policy in next.config headers(), middleware or your host's headers file.",
    refs: { cwe: ["CWE-693", "CWE-1021"] },
  },
  {
    id: "MFS-PLATFORM-07",
    category: "PLATFORM",
    severity: "medium",
    platforms: ["web"],
    title: "Open redirects",
    check: "Find redirects whose destination comes from the request (next, redirect, returnTo, callbackUrl parameters) in pages, route handlers, middleware and auth callbacks.",
    failIf:
      "The site redirects to a URL taken from the request (redirect(), NextResponse.redirect, res.redirect, router.push, window.location) without restricting it to relative paths or an allowlist of hosts.",
    passIf: "Redirect targets are relative paths starting with a single slash, or are checked against an allowlist.",
    variants: [
      web("Web: redirects", [G.js, G.webRoutes, G.middleware], [
        "searchParams\\.get\\(['\"](next|redirect|returnTo|return_to|callbackUrl|continue)['\"]\\)",
        "[?&](next|redirect|returnTo|callbackUrl)=",
        "redirect\\(|NextResponse\\.redirect\\(|res\\.redirect\\(",
        "window\\.location(\\.href)?\\s*=|router\\.(push|replace)\\(",
      ]),
    ],
    founder: "Attackers can send links on your real domain that bounce people to a fake login page, which makes phishing far more convincing.",
    fix: "Only redirect to relative paths that start with a single slash, or check the destination host against an allowlist.",
    refs: { cwe: ["CWE-601"] },
  },
  {
    id: "MFS-CODE-08",
    category: "CODE",
    severity: "high",
    platforms: ["web"],
    title: "Server code builds queries or commands from user input",
    check: "Trace request data (body, query, params, headers, cookies) into database queries, shell commands, eval and file paths in server code.",
    failIf:
      "Request data is concatenated or interpolated into SQL (raw queries, $queryRawUnsafe, .raw(), template strings passed to query()), NoSQL operators, shell commands (exec, spawn with a shell), eval or new Function, or file paths without validation.",
    passIf: "Queries use parameters or the ORM's safe API, no shell command or eval receives request data, and file paths are validated against a fixed folder.",
    variants: [
      web(
        "Web: server code",
        [G.webRoutes, G.backend, G.js],
        [
          "\\$queryRawUnsafe|\\$executeRawUnsafe|\\.raw\\(|sql\\.raw\\(",
          "query\\(`[^`]*\\$\\{",
          "child_process|execSync\\(|exec\\(|spawn\\(",
          "eval\\(|new Function\\(",
          "\\$where|\\$regex",
          "fs\\.(readFile|createReadStream)\\(",
        ],
        "Supabase .from() queries and Prisma's normal API are parameterised; raw SQL and SQL built from strings are where injection happens."
      ),
    ],
    founder: "Crafted input can make your server run its own database queries or commands: read every record, change data or take over the server.",
    fix: "Use parameterised queries or the ORM's safe methods, never pass request data to shell commands or eval, and validate file paths against a fixed folder.",
    refs: { cwe: ["CWE-89", "CWE-78", "CWE-94", "CWE-22"] },
  },
];
