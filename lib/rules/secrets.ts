import type { Rule } from "../types";
import { G } from "./globs";

const ALL_CODE = [G.js, G.dart, G.kotlinJava, G.swiftObjc];

export const SECRETS_RULES: Rule[] = [
  {
    id: "MFS-SECRETS-01",
    category: "SECRETS",
    severity: "critical",
    title: "Secret keys shipped in the app",
    check:
      "Search all code, assets, bundled config, everything compiled into the app from environment or build settings, and AI prompt text for secret (server-side) credentials. Publishable/public identifiers are fine: Stripe pk_ keys, Firebase apiKey in google-services.json or GoogleService-Info.plist, Supabase anon or sb_publishable_ keys, restricted Google Maps keys.",
    failIf:
      "A secret or private credential reaches the app: Stripe sk_live_/rk_live_ keys, AWS secret access keys, OpenAI/Anthropic/other AI keys, GitHub/Slack/SendGrid/Twilio tokens, private keys (BEGIN PRIVATE KEY), database passwords, Supabase service_role keys, webhook signing secrets or admin credentials. This includes secrets in source, assets, bundled .env files, build variables that ship (EXPO_PUBLIC_*, expo.extra, react-native-config, flutter_dotenv assets, --dart-define, buildConfigField, xcconfig or Info.plist values) and system prompts bundled in the app.",
    passIf:
      "Only publishable/public identifiers reach the app; all secrets live on a server.",
    variants: [
      {
        target: "any",
        scope: "All code, assets, config",
        lookIn: [...ALL_CODE, G.configFiles, G.env, "**/assets/**"],
        searchFor: [
          "sk_live_[0-9a-zA-Z]{10,}",
          "rk_live_[0-9a-zA-Z]{10,}",
          "AKIA[0-9A-Z]{16}",
          "aws_secret_access_key|secretAccessKey",
          "sk-(proj-|ant-)?[A-Za-z0-9_-]{20,}",
          "ghp_[A-Za-z0-9]{36}|github_pat_",
          "xox[baprs]-[A-Za-z0-9-]+",
          "SG\\.[A-Za-z0-9_-]{22}\\.[A-Za-z0-9_-]{43}",
          "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
          "(secret|private)[_-]?key\\s*[:=]",
          "(password|passwd|pwd)\\s*[:=]\\s*['\"][^'\"]{4,}",
        ],
        hint: "Check test/mock files too only if they are bundled into release builds.",
      },
      {
        target: "any",
        scope: "AI prompts bundled in the app",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, "**/prompts/**", "**/*.{txt,md}"],
        searchFor: ["systemPrompt|system_prompt|SYSTEM_PROMPT", "role:\\s*['\\\"]system"],
        hint: "A secret written into a prompt that ships in the app counts as a shipped secret.",
      },
      {
        target: "expo",
        scope: "Expo",
        lookIn: [G.env, G.expoConfig],
        searchFor: ["EXPO_PUBLIC_", "\"extra\"\\s*:", "process\\.env\\."],
        hint: "Every EXPO_PUBLIC_ variable and everything under expo.extra is inlined into the JS bundle.",
      },
      {
        target: "react-native",
        scope: "React Native",
        lookIn: [G.env, "babel.config.js", G.js],
        searchFor: ["react-native-config", "react-native-dotenv", "transform-inline-environment-variables", "Config\\.[A-Z_]+"],
        hint: "react-native-config and dotenv plugins copy .env values into the app.",
      },
      {
        target: "flutter",
        scope: "Flutter",
        lookIn: [G.pubspec, G.env, G.dart, G.ci],
        searchFor: ["flutter_dotenv", "- \\.env", "String\\.fromEnvironment", "--dart-define", "envied"],
        hint: "A .env listed under flutter assets ships inside the app; --dart-define values are compiled in.",
      },
      {
        target: "android",
        scope: "Android",
        lookIn: [G.gradle, "**/local.properties"],
        searchFor: ["buildConfigField", "resValue", "manifestPlaceholders"],
      },
      {
        target: "ios",
        scope: "iOS",
        lookIn: ["**/*.xcconfig", G.plist],
        searchFor: ["SECRET", "TOKEN", "API_KEY", "PASSWORD"],
      },
    ],
    founder:
      "Anyone can download your app and pull these keys out in minutes. With a secret key they can act as your company: charge cards, read your data, or run up your cloud or AI bill.",
    fix:
      "Treat every exposed key as leaked: revoke and rotate it now. Move the operation that needs it to your backend or a serverless function, have the app call that endpoint with the user's session, and keep only public values in build variables and prompts.",
    refs: { masvs: ["MASVS-STORAGE-1"], maswe: ["MASWE-0004"], cwe: ["CWE-798"] },
  },
  {
    id: "MFS-SECRETS-02",
    category: "SECRETS",
    severity: "high",
    title: "AI provider called directly from the app",
    check: "Find calls to AI model providers made from app code (not from your backend).",
    failIf:
      "The app calls an AI provider API directly with an API key, whatever the key's source (hardcoded, env var, remote config). Includes OpenAI, Anthropic, Google Gemini (AI Studio key), Groq, Mistral, OpenRouter, DeepSeek, Replicate.",
    passIf:
      "AI calls go through your own backend or serverless function that checks the user's session, or through Firebase AI Logic protected by App Check. Not applicable if the app uses no AI provider.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: [
          "api\\.openai\\.com|api\\.anthropic\\.com|generativelanguage\\.googleapis\\.com",
          "api\\.groq\\.com|api\\.mistral\\.ai|openrouter\\.ai|api\\.deepseek\\.com|api\\.replicate\\.com",
          "new OpenAI\\(|new Anthropic\\(|GoogleGenerativeAI\\(|GenerativeModel\\(",
          "dangerouslyAllowBrowser",
          "from ['\"]openai['\"]|@anthropic-ai/sdk|@google/generative-ai|dart_openai|google_generative_ai",
        ],
      },
    ],
    founder:
      "Your AI key travels inside the app. Someone can extract it and use your AI account for free. You pay the bill, which can reach thousands of dollars overnight.",
    fix:
      "Move every AI call behind a backend endpoint that checks the user's session and applies per-user rate limits. Rotate the current key.",
    refs: { masvs: ["MASVS-STORAGE-1"], maswe: ["MASWE-0004"], cwe: ["CWE-798"] },
  },
  {
    id: "MFS-SECRETS-04",
    category: "SECRETS",
    severity: "medium",
    title: "Signing keys or cloud credentials committed to the repo",
    check:
      "Look for release signing material, store API keys and cloud service-account credentials committed to the repository (these don't ship in the app but leak to anyone with repo access).",
    failIf:
      "Committed: Android keystores (.jks/.keystore) with their passwords, storePassword/keyPassword in gradle files, App Store Connect .p8 keys, push certificates (.p12), Google service-account JSON (\"type\": \"service_account\"), or real secrets in committed .env files.",
    passIf: "Signing material and credentials are kept in CI secrets or a password manager, and .gitignore covers them.",
    variants: [
      {
        target: "any",
        scope: "Repository",
        lookIn: ["**/*.{jks,keystore,p12,p8,pem,mobileprovision}", G.gradle, "**/*.json", G.env, "fastlane/*", ".gitignore"],
        searchFor: ["storePassword|keyPassword", "\"type\"\\s*:\\s*\"service_account\"", "BEGIN PRIVATE KEY", "AuthKey_.*\\.p8"],
      },
    ],
    founder:
      "The keys that prove an app update really comes from you sit in your code repository. Anyone with repo access, past contractors included, could sign apps as you or reach your cloud account.",
    fix:
      "Remove these files from the repo and its history, rotate the credentials, and store them in your CI secret store. Add the patterns to .gitignore.",
    refs: { cwe: ["CWE-522", "CWE-312"] },
  },
  {
    id: "MFS-SECRETS-05",
    category: "SECRETS",
    severity: "high",
    title: "AI tool config files committed with tokens",
    check:
      "Look for configuration files of AI coding tools committed to the repository and check whether they hold real credentials.",
    failIf:
      "An AI coding tool config file in the repo (.mcp.json, .cursor/mcp.json, .vscode/mcp.json, .claude/settings*.json, .codex/config.toml, Windsurf or Claude Desktop MCP configs) contains a real token, API key, password or Authorization header, not a placeholder or an environment-variable reference.",
    passIf:
      "No such files are committed, or they only reference environment variables, and .gitignore covers them.",
    variants: [
      {
        target: "any",
        scope: "Repository",
        lookIn: [G.aiToolConfig],
        searchFor: ["\\\"(env|headers)\\\"\\s*:", "token|api[_-]?key|secret|password|authorization|Bearer", "ghp_|github_pat_|sk-|xox[baprs]-|sb_secret_"],
      },
    ],
    founder:
      "Config files your AI coding tools use often hold tokens for GitHub, databases or cloud accounts. Committed to the repo, anyone with access can use them.",
    fix:
      "Revoke the exposed tokens, remove the files from the repo and its history, add them to .gitignore, and reference tokens through environment variables.",
    refs: { cwe: ["CWE-798"] },
  },
];

export const BACKEND_RULES: Rule[] = [
  {
    id: "MFS-BACKEND-01",
    category: "BACKEND",
    severity: "critical",
    title: "Supabase admin key inside the app",
    check:
      "Find every Supabase client initialisation and identify which key it uses. Decode JWT-looking keys (eyJ...) and read the role claim.",
    failIf:
      "The app uses a Supabase service_role key (JWT payload role = \"service_role\") or a new-format secret key (sb_secret_...), or any variable named like SERVICE_ROLE / SERVICE_KEY reaches app code.",
    passIf: "The app only uses the anon key or a publishable key (sb_publishable_...).",
    variants: [
      {
        target: "supabase",
        scope: "Supabase client",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, G.env, G.expoConfig],
        searchFor: ["createClient\\(", "Supabase\\.initialize\\(", "SupabaseClient\\(", "service_role", "sb_secret_", "SERVICE_ROLE|SERVICE_KEY|serviceRoleKey"],
      },
    ],
    founder:
      "This key skips every access rule in your database. Anyone who extracts it can read, change or delete all of your users' data.",
    fix:
      "Rotate the service role key in the Supabase dashboard now. Use the anon/publishable key in the app and move admin operations into Edge Functions.",
    refs: { masvs: ["MASVS-STORAGE-1"], maswe: ["MASWE-0004"], cwe: ["CWE-798"] },
  },
  {
    id: "MFS-BACKEND-02",
    category: "BACKEND",
    severity: "critical",
    title: "Supabase tables open without row-level security",
    check:
      "Read the SQL migrations/schema in the repo. For every table in the public schema, check whether row-level security is enabled and what the policies allow.",
    failIf:
      "A public-schema table has no `enable row level security`, or has policies with `using (true)` / `with check (true)` for anon or authenticated roles on tables holding user data.",
    passIf: "RLS is enabled on every table and policies scope access to the owner (auth.uid()).",
    variants: [
      {
        target: "supabase",
        scope: "Supabase SQL",
        lookIn: ["supabase/migrations/**/*.sql", "supabase/*.sql", G.sql],
        searchFor: ["create table", "enable row level security", "create policy", "using \\(true\\)", "with check \\(true\\)", "to anon"],
        hint: "If Supabase is used but no SQL is in the repo (schema managed in the dashboard), answer unable_to_check and say so.",
      },
    ],
    founder:
      "With the public key that's inside every copy of your app, anyone can query these tables directly. No login, no limits.",
    fix:
      "Enable RLS on every table and write policies scoped to auth.uid(). Test with the anon key that unauthenticated requests return nothing.",
    refs: { masvs: ["MASVS-AUTH-1"], cwe: ["CWE-284"] },
  },
  {
    id: "MFS-BACKEND-03",
    category: "BACKEND",
    severity: "critical",
    title: "Firebase database or storage open to everyone",
    check: "Read Firestore, Realtime Database and Storage security rules in the repo.",
    failIf:
      "Rules allow unauthenticated read or write (`if true`, `\".read\": true`, `\".write\": true`), test-mode time-limited rules (`request.time <`), or let any signed-in user read/write other users' data (`if request.auth != null` on user-owned collections).",
    passIf: "Rules check that request.auth.uid owns the document or path being accessed.",
    variants: [
      {
        target: "firebase",
        scope: "Firebase rules",
        lookIn: [G.firebaseRules],
        searchFor: ["allow read, write: if true", "allow (read|write): if true", "request\\.time <", "\"\\.read\"\\s*:\\s*true", "\"\\.write\"\\s*:\\s*true", "request\\.auth != null"],
        hint: "If Firebase is used but no rules files are in the repo, answer unable_to_check and say so.",
      },
    ],
    founder:
      "Your database can be read or changed by anyone on the internet who knows your project ID, and that ID is inside your app.",
    fix:
      "Write rules that check request.auth.uid against the document owner, deploy them, and test with the Firebase emulator before release.",
    refs: { masvs: ["MASVS-AUTH-1"], cwe: ["CWE-284"] },
  },
  {
    id: "MFS-BACKEND-04",
    category: "BACKEND",
    severity: "critical",
    title: "Server doesn't verify ownership or permissions",
    check:
      "Find features limited by role, plan or ownership (admin screens, premium features, other users' records), and every backend endpoint or function in the repo that reads or changes records by ID or accepts prices, plans, roles or user IDs from the app. Determine where each limit is enforced.",
    failIf:
      "(a) Access to privileged data or actions is decided only in app code (hiding a button, filtering other users' records on the device, unlocking premium with a local flag) with no matching enforcement in backend rules, policies or API code; or (b) an endpoint or function in the repo returns or changes a record by ID without checking it belongs to the signed-in user; or (c) the server takes price, plan, role, credits or user ID from the request instead of deriving them on the server.",
    passIf:
      "The backend enforces every permission and ownership check, and computes prices, plans and roles itself; app-side checks only shape the UI. Not applicable if the app has no roles, plans or per-user data.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["isAdmin|is_admin", "role\\s*===?\\s*['\"]", "isPremium|isPro|hasSubscription", "\\.eq\\(['\"]user_id", "\\.where\\(['\"](userId|uid|ownerId)"],
      },
      {
        target: "any",
        scope: "Backend code in the repo",
        lookIn: [G.backend],
        searchFor: ["req\\.(params|query)\\.|params\\.id|findById\\(|\\.doc\\(|\\.eq\\(['\\\"]id", "req\\.body\\.(price|amount|role|plan|userId|user_id|credits|isAdmin)", "auth\\.uid\\(\\)|getUser\\(|verifyIdToken|currentUser"],
        hint: "Supabase Edge Functions, Firebase Functions or an API folder in the same repo.",
      },
    ],
    founder:
      "Your server hands over or changes data without checking who's asking: other users' records, admin features, or prices the app makes up.",
    fix:
      "On the server, check for every request that the signed-in user owns the record and may perform the action, and compute prices, plans and roles there. Treat the app as untrusted.",
    refs: { masvs: ["MASVS-AUTH-1"], cwe: ["CWE-602", "CWE-639", "CWE-915"] },
  },
  {
    id: "MFS-BACKEND-05",
    category: "BACKEND",
    severity: "medium",
    title: "Purchases unlocked without server verification",
    check: "Find in-app purchase or subscription handling and how premium access is granted.",
    failIf:
      "Premium access is granted from a purchase result on the device (stored as a local flag or in local storage) with no server-side receipt validation.",
    passIf:
      "Entitlements come from RevenueCat, Adapty, Qonversion or your backend verifying receipts with Apple/Google. Not applicable if there are no in-app purchases.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["react-native-iap|expo-in-app-purchases|in_app_purchase", "react-native-purchases|purchases_flutter|RevenueCat", "BillingClient|acknowledgePurchase", "StoreKit|Transaction\\.currentEntitlements|SKPaymentQueue", "finishTransaction|completePurchase"],
      },
    ],
    founder:
      "Paid features can be unlocked for free with common cheating tools, because the app takes its own word that a purchase happened.",
    fix: "Verify purchases on a server (or use RevenueCat) and read entitlements from there.",
    refs: { masvs: ["MASVS-AUTH-1"], cwe: ["CWE-602"] },
  },
  {
    id: "MFS-BACKEND-08",
    category: "BACKEND",
    severity: "high",
    title: "No rate limits or spend caps on paid services",
    check:
      "Find every paid service the app can trigger (AI models, SMS or OTP, email, maps or geocoding) and check what limits each call.",
    failIf:
      "A paid service can be triggered by the app with no per-user rate limit, quota or spend cap enforced on the server, so one user or script can call it without limit.",
    passIf:
      "Paid calls go through your backend with per-user rate limits or quotas (or Firebase App Check plus quotas), and provider budget caps are set. Not applicable if the app uses no paid services. If limits live in a provider dashboard you can't see, answer unable_to_check.",
    variants: [
      {
        target: "any",
        scope: "App code + backend",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, G.backend],
        searchFor: ["openai|anthropic|generativelanguage|replicate|groq", "twilio|sendgrid|resend|messagebird|vonage|signInWithPhoneNumber", "maps\\.googleapis|geocod|places", "ratelimit|rateLimit|rate_limit|throttle|quota|limiter|App ?Check"],
      },
    ],
    founder:
      "AI, SMS or email features can be triggered without limit. One script can run up thousands of dollars overnight.",
    fix:
      "Put paid calls behind your backend with per-user rate limits and daily quotas, and set a budget cap with each provider.",
    refs: { cwe: ["CWE-770"] },
  },
];
