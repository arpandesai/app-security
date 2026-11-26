import type { Rule, RuleVariant, WebText } from "../types";
import { G } from "./globs";
import { WEB_SUPPORT } from "./web";

/**
 * Node.js server support (Express, NestJS, Fastify, Hono, Koa, hapi, AdonisJS, Restify).
 * The server is part of the app: it can live in the app's own project or in a separate one.
 *
 * SERVER_SUPPORT: existing checks that also apply to server code. Each gets server variants where its
 * "any" variants don't already cover server code, and server wording where the default doesn't fit.
 *
 * SERVER_SIDE_RULES: checks for server-side code, on web apps (route handlers, server actions) and Node.js servers.
 */
const S = (scope: string, lookIn: string[], searchFor: string[], hint?: string): RuleVariant => ({
  target: "server",
  scope,
  lookIn,
  searchFor,
  ...(hint ? { hint } : {}),
});
const W = (scope: string, lookIn: string[], searchFor: string[], hint?: string): RuleVariant => ({
  target: "web",
  scope,
  lookIn,
  searchFor,
  ...(hint ? { hint } : {}),
});
const web = (id: string): WebText => WEB_SUPPORT[id]?.web || {};

const ROUTES = [G.serverCode];
const ROUTE_HINT =
  "Express/Koa/Hono/Fastify: app.get, router.post and friends. NestJS: @Controller classes with @Get/@Post methods, guards and interceptors. Check middleware order too: a route registered before the auth middleware isn't protected by it.";

export const SERVER_SUPPORT: Record<string, { variants?: RuleVariant[]; server?: WebText }> = {
  "MFS-SECRETS-04": {
    server: {
      title: "Secrets committed to the repo",
      check:
        "Look for real secrets committed to the repository: API keys and passwords written in server code or config, .env files with live values, private keys and cloud service-account files.",
      failIf:
        "Committed: live API keys, tokens or passwords in source or config (Stripe sk_live_, AWS secret keys, database URLs with passwords, JWT secrets, SMTP passwords), .env files with real values, private keys (.pem, .p12, BEGIN PRIVATE KEY), or Google or Firebase service-account JSON.",
      passIf: "Secrets are read from environment variables or a secret manager, only examples (.env.example) are committed, and .gitignore covers .env files and key files.",
      founder:
        "Anyone with access to your code, past contractors included, can use these keys to reach your database, payment account or cloud, and so can anyone who sees a leaked copy of the repo.",
      fix: "Rotate every committed secret, remove them from the repo and its history, and read them from environment variables or a secret manager. Commit a .env.example with placeholder values instead.",
    },
  },
  "MFS-SECRETS-05": {},
  "MFS-BACKEND-02": {},
  "MFS-BACKEND-03": {},
  "MFS-BACKEND-04": {
    variants: [
      S(
        "Server: routes, controllers, middleware",
        ROUTES,
        [
          "app\\.(get|post|put|patch|delete)\\(|router\\.(get|post|put|patch|delete)\\(",
          "@(Get|Post|Put|Patch|Delete)\\(|@UseGuards|canActivate",
          "req\\.(params|query|body)\\.(id|userId|user_id|accountId|orgId)",
          "req\\.user|request\\.user|ctx\\.state\\.user|c\\.get\\(['\"]user",
          "isAdmin|role|permission|authorize",
        ],
        ROUTE_HINT
      ),
    ],
    server: {
      check:
        "Find every route that reads or changes records by ID, admin and role-limited routes, and routes that accept prices, plans, roles or user IDs from the request. Determine where each permission is checked.",
      failIf:
        "(a) A route returns or changes a record by ID without checking it belongs to the signed-in user or their organisation; or (b) an admin or role-limited route has no authorisation check, or is registered before the auth middleware; or (c) the server takes price, plan, role, credits or user ID from the request instead of deriving them itself.",
      passIf:
        "Every route checks the session and the caller's right to the record or action, and the server computes prices, plans and roles itself. Not applicable if the server has no per-user data or roles.",
      founder: "Your server hands over or changes data without checking who's asking: other users' records, admin features, or prices the app makes up.",
      fix: "In every route, check that the signed-in user owns the record and may perform the action (a guard or middleware per route, not only per router), and compute prices, plans and roles on the server.",
    },
  },
  "MFS-BACKEND-05": {
    variants: [
      S("Server: purchases, payment webhooks", ROUTES, [
        "webhooks\\.constructEvent|stripe-signature|verifySignature",
        "verifyReceipt|App Store Server|appstoreconnect|androidpublisher|purchases\\.subscriptions|purchaseToken",
        "revenuecat|X-RevenueCat|lemonsqueezy|paddle|razorpay",
        "isPremium|isPro|plan|subscription|entitlement",
      ]),
    ],
    server: {
      check: "Find how the server learns about payments and subscriptions (store receipts, payment webhooks) and how it grants paid access.",
      failIf:
        "Paid access is granted from a flag or receipt the app sends without checking it with Apple, Google or the payment provider, or from a payment webhook whose signature isn't verified.",
      passIf:
        "Purchases are verified with Apple's App Store Server API, the Google Play Developer API or the provider, webhooks are signature-verified, and entitlements are stored on the server.",
      founder: "Paid features can be unlocked for free, because the server takes the app's word that a payment happened.",
      fix: "Verify every purchase with the store or payment provider (or use RevenueCat's verified webhooks), check webhook signatures, and grant access only from what the server verified.",
    },
  },
  "MFS-BACKEND-08": {},
  "MFS-STORAGE-03": {
    variants: [
      S("Server: logs, error tracking", ROUTES, [
        "console\\.(log|info|debug)\\(.*(req\\.body|headers|password|token)",
        "morgan\\(|winston|pino|bunyan|logger\\.",
        "redact|sendDefaultPii|beforeSend",
        "[?&](token|key|password|secret)=",
      ]),
    ],
    server: {
      check: "Review what the server logs (request bodies, headers, errors) and what it sends to error tracking, and URLs it builds with secrets.",
      failIf:
        "Logs or error reports include passwords, tokens, Authorization headers, cookies, card data or sensitive personal data (for example a logger that prints the whole request body or headers), or secrets are passed in URLs.",
      passIf: "Loggers redact sensitive fields, request bodies and auth headers aren't logged, error tracking scrubs personal data, and secrets travel in headers or bodies.",
      founder: "Passwords, login tokens and personal data end up in your logs and monitoring tools, where many more people and services can read them.",
      fix: "Turn on redaction in your logger (for example pino's redact option) for passwords, tokens, cookies and Authorization headers, stop logging whole request bodies, and scrub personal data in error tracking.",
    },
  },
  "MFS-NETWORK-01": {
    server: {
      check: "Find plain http:// URLs the server calls, and connections to databases or other services without encryption.",
      failIf: "The server calls production services over http://, or connects to a database or cache over the public internet with encryption turned off (for example sslmode=disable).",
      passIf: "Every production URL uses https://, and connections outside a private network use TLS.",
      founder: "Anyone on the network path can read or change what your server sends, including your users' data and your API keys.",
      fix: "Use https:// for every service the server calls, and turn on TLS for database and cache connections that leave your private network.",
    },
  },
  "MFS-NETWORK-02": {
    variants: [
      S("Server: TLS settings", [G.serverCode, G.serverConfig], ["rejectUnauthorized:\\s*false", "NODE_TLS_REJECT_UNAUTHORIZED", "strictSSL:\\s*false", "checkServerIdentity", "ssl:\\s*\\{\\s*rejectUnauthorized"]),
    ],
    server: web("MFS-NETWORK-02"),
  },
  "MFS-AUTH-02": {
    server: {
      title: "Insecure login flow",
      check: "Find OAuth and social login handling on the server: callbacks, token exchange, redirect URIs, client secrets.",
      failIf:
        "The OAuth callback doesn't validate state (or a PKCE verifier), the redirect URI is taken from the request without an allowlist, the implicit or password grant is used, or the client secret is hardcoded in code.",
      passIf: "The authorization code flow runs with state validation, fixed redirect URIs, and the client secret from configuration. Not applicable without OAuth or social login.",
      founder: "The way users log in can be intercepted or abused, letting attackers sign in as your users.",
      fix: "Use the authorization code flow with state (and PKCE), allow only fixed redirect URIs, keep the client secret in an environment variable, and use a maintained library such as Passport or your provider's SDK.",
    },
  },
  "MFS-AUTH-03": {
    server: {
      check: "Find the logout endpoint and how sessions and refresh tokens are ended.",
      failIf:
        "Logout doesn't destroy the server session or revoke refresh tokens, so they keep working, or access tokens are long-lived (days) with no way to revoke them.",
      passIf: "Logout destroys the session or revokes the refresh token on the server, and access tokens are short-lived.",
      founder: "After a user logs out, a copied token or session still works, sometimes for days.",
      fix: "Destroy the session or revoke the refresh token at logout, keep access tokens short-lived (minutes), and keep a revocation list if you need to cut access immediately.",
    },
  },
  "MFS-AUTH-04": {
    server: {
      check: "Find endpoints that change the email, phone or password, add payout details, move money or delete the account.",
      failIf: "These endpoints act on the existing session alone, without the current password, a passkey or a one-time code checked on the server.",
      passIf: "The server requires a fresh password, passkey or one-time code for these actions.",
      founder: "Anyone holding a stolen session can take over the account or move money without proving who they are.",
      fix: "Require the current password, a passkey or a one-time code for account changes and money movement, and check it on the server.",
    },
  },
  "MFS-CRYPTO-01": {
    server: {
      failIf: "An encryption key, IV/nonce, salt or encryption password is a literal in server code or committed config, or derived from a constant.",
      passIf: "Keys come from environment variables, a secret manager or a key management service. Not applicable if the server does no custom encryption.",
      founder: "The lock and its key sit in the same code. Anyone who gets the code can decrypt everything it protects.",
      fix: "Load keys from a secret manager or key management service, rotate any key that was committed, and re-encrypt the data it protected.",
    },
  },
  "MFS-CRYPTO-02": {
    variants: [S("Server: randomness, hashing", ROUTES, ["Math\\.random\\(", "createHash\\(['\"](md5|sha1)", "createCipher\\(|createCipheriv\\(['\"](des|aes-\\d+-ecb)", "crypto-js", "bcrypt|argon2|scrypt"])],
    server: { ...web("MFS-CRYPTO-02"), founder: "Your server protects data with outdated or predictable cryptography that attackers can break, reverse or guess with free tools." },
  },
  "MFS-AI-01": {
    server: {
      failIf:
        "Model output is executed (eval, new Function, child_process), used to build database queries, file paths, URLs or redirects, passed as tool or API arguments, or returned as HTML, without strict validation or sanitising.",
      founder: "Text from the AI model is run as code or used in database queries and file paths, so a crafted answer can attack your server and its data.",
    },
  },
  "MFS-AI-02": {},
  "MFS-AI-03": {},
  "MFS-CODE-01": {
    variants: [
      S("npm", ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock"], ["dependencies"], 'ecosystem "npm". Use direct dependencies from package.json, with versions resolved from the lockfile.'),
    ],
    server: { founder: "Your server runs third-party code with publicly known security holes. Attackers scan for servers using these versions." },
  },
  "MFS-CODE-03": {
    server: {
      ...web("MFS-CODE-03"),
      founder: "Shortcuts built for testing (test logins, debug endpoints, seed routes, staging services) are still in the live server, where anyone can use them.",
    },
  },
  "MFS-CODE-07": { server: web("MFS-CODE-07") },
  "MFS-PRIVACY-04": { server: web("MFS-PRIVACY-04") },
  "MFS-RESILIENCE-01": {
    variants: [
      S("Server: error handling, debug settings", [G.serverCode, G.serverConfig], [
        "err(or)?\\.stack|err(or)?\\.message",
        "app\\.use\\(\\(err|ExceptionFilter|setErrorHandler|onError",
        "NODE_ENV|DEBUG=|debug:\\s*true",
        "\"start\":\\s*\"(nodemon|ts-node-dev|tsx watch|nest start --watch)",
        "swagger|/docs|graphiql|introspection:\\s*true",
      ]),
    ],
    server: {
      title: "Debug features enabled in production",
      check: "Check the server's error handling, start scripts, NODE_ENV and debug switches, and API explorers left on.",
      failIf:
        "Error responses include stack traces, SQL errors or internal messages; production runs with a watcher or debug mode (nodemon, NODE_ENV not production, DEBUG flags); or API explorers (Swagger UI, GraphiQL, GraphQL introspection) are open in production without authentication.",
      passIf: "Production returns generic error messages, logs details on the server, runs with NODE_ENV=production, and API explorers are off or protected.",
      founder: "Your live server hands out internal details, like stack traces, database errors and a map of every endpoint, that show attackers where to aim.",
      fix: "Add a final error handler that logs the error and returns a generic message, run production with NODE_ENV=production and a plain node start command, and turn off or protect Swagger UI and GraphQL introspection.",
    },
  },

  // Web checks that apply to servers too.
  "MFS-BACKEND-09": {
    variants: [S("Server: CORS", [G.serverCode, G.serverConfig], ["cors\\(", "origin:\\s*(true|['\"]\\*['\"])", "credentials:\\s*true", "Access-Control-Allow-(Origin|Credentials)", "enableCors\\(|@fastify/cors|hono/cors"])],
  },
  "MFS-BACKEND-10": {
    variants: [S("Server: outgoing requests", ROUTES, ["fetch\\((req|request|body|params|query|url)", "axios\\.(get|post)\\((req|body|url)", "got\\(|node-fetch|undici|http\\.get\\(", "webhook|callbackUrl|imageUrl|avatarUrl", "puppeteer|playwright"])],
  },
  "MFS-AUTH-05": {
    variants: [S("Server: cookies, sessions", ROUTES, ["res\\.cookie\\(|setCookie|reply\\.setCookie", "express-session|cookie-session|@fastify/session|@fastify/cookie", "httpOnly:\\s*false|secure:\\s*false", "sameSite:\\s*['\"]?none"])],
    server: {
      check: "Find where the server sets session or auth cookies: session middleware options (express-session, cookie-session, @fastify/session), res.cookie, Set-Cookie headers. Not applicable when the server uses bearer tokens only.",
    },
  },
  "MFS-AUTH-06": {
    variants: [
      S(
        "Server: state-changing routes",
        ROUTES,
        ["app\\.get\\(.*(delete|remove|update|transfer)", "csrf|csurf|@fastify/csrf|lusca", "sameSite", "Authorization['\"]?:\\s*`?Bearer|passport-jwt|Bearer "],
        "Answer not_applicable when the server authenticates with bearer tokens in the Authorization header rather than cookies, which is typical for mobile app servers."
      ),
    ],
  },
  "MFS-PLATFORM-05": {
    variants: [
      S("Server: rendered HTML", [G.serverCode, G.templates], ["<%-", "\\{\\{\\{", "\\|\\s*safe", "res\\.send\\(`[^`]*<", "res\\.(send|write)\\([^)]*req\\.(query|body|params)"], "Template engines escape by default; the risk is unescaped output (<%- in EJS, {{{ }}} in Handlebars, != in Pug, |safe in Nunjucks) and HTML built from strings. Answer not_applicable for a JSON-only API."),
    ],
    server: {
      check: "Find HTML the server renders: template engines (EJS, Handlebars, Pug, Nunjucks) and HTML built in route handlers.",
      failIf: "User-controlled data reaches unescaped template output (<%-, {{{ }}}, !=, |safe) or HTML built from strings in res.send, without sanitising.",
      passIf: "Templates use escaped output for user data, or the server returns JSON only.",
      founder: "A crafted value can run its own code in the browser of anyone who opens a page your server renders, such as an email confirmation or admin page.",
      fix: "Use the template engine's escaped output for anything from users, and sanitise HTML with DOMPurify (or sanitize-html) where you must render it.",
    },
  },
  "MFS-PLATFORM-06": {
    variants: [S("Server: response headers", [G.serverCode, G.serverConfig], ["helmet\\(|@fastify/helmet|secure-headers|hono/secure-headers", "Strict-Transport-Security|X-Content-Type-Options|Content-Security-Policy", "x-powered-by|disable\\(['\"]x-powered-by"])],
    server: {
      check: "Find where the server sets HTTP response headers: helmet or an equivalent, a reverse proxy config, or headers set by hand.",
      failIf: "The server sets no security headers (no helmet or equivalent): no Strict-Transport-Security or X-Content-Type-Options, and it advertises its framework with X-Powered-By.",
      passIf: "helmet (or an equivalent, or the gateway in front of the server) sets Strict-Transport-Security, X-Content-Type-Options and, for any HTML, a Content-Security-Policy.",
      founder: "Without these headers, browsers and proxies handle your server's responses less safely, and your server tells attackers what it runs on.",
      fix: "Add helmet (or @fastify/helmet, hono/secure-headers) as the first middleware, and turn off X-Powered-By.",
    },
  },
  "MFS-PLATFORM-07": {
    variants: [S("Server: redirects", ROUTES, ["res\\.redirect\\(|reply\\.redirect\\(|ctx\\.redirect\\(|c\\.redirect\\(|@Redirect\\(", "req\\.query\\.(next|redirect|returnTo|return_to|callbackUrl|url)"])],
    server: {
      failIf:
        "The server redirects to a URL taken from the request (res.redirect, reply.redirect, ctx.redirect, c.redirect, @Redirect) without restricting it to relative paths or an allowlist of hosts. Login and OAuth callbacks are the usual place.",
    },
  },
  "MFS-CODE-08": {
    variants: [
      S(
        "Server: queries, commands",
        ROUTES,
        ["query\\(`[^`]*\\$\\{|query\\(['\"][^'\"]*['\"]\\s*\\+", "\\$queryRawUnsafe|\\$executeRawUnsafe|\\.raw\\(|sequelize\\.query\\(", "child_process|exec\\(|execSync\\(|spawn\\(", "eval\\(|new Function\\(", "\\$where|\\$regex|\\$ne", "fs\\.(readFile|createReadStream|unlink)\\(|res\\.sendFile\\(|path\\.join\\([^)]*req\\."],
        "Mongoose and MongoDB are open to operator injection when request objects reach queries unchecked ({ $ne: null }); check that IDs and filters are validated or cast."
      ),
    ],
  },
};

export const SERVER_SIDE_RULES: Rule[] = [
  {
    id: "MFS-AUTH-07",
    category: "AUTH",
    severity: "high",
    platforms: ["web", "server"],
    title: "Login tokens not verified properly",
    check: "Find where server code reads login tokens (JWTs, session tokens) and how it checks them.",
    failIf:
      "A token is decoded without verifying its signature (jwt.decode, parsing the payload by hand); verification accepts the 'none' algorithm or doesn't pin algorithms; the signing secret is hardcoded, a placeholder or short; tokens have no expiry or expiry is ignored; or tokens from a login provider aren't checked for issuer and audience.",
    passIf:
      "Every request verifies the signature with a pinned algorithm and a key from configuration, and checks expiry (plus issuer and audience for provider tokens), or a maintained auth library does this. Not applicable if the code doesn't handle tokens itself.",
    variants: [
      W("Web: route handlers, middleware", [G.webRoutes, G.middleware, G.js, G.env], ["jwt\\.decode\\(|jwt\\.verify\\(|jwtVerify\\(|decodeJwt\\(", "algorithms|['\"]none['\"]|ignoreExpiration", "JWT_SECRET|NEXTAUTH_SECRET|AUTH_SECRET"]),
      S("Server: auth middleware, guards", [G.serverCode, G.serverConfig], ["jwt\\.decode\\(|jwt\\.verify\\(|jwtVerify\\(|decodeJwt\\(", "algorithms|['\"]none['\"]|ignoreExpiration", "JWT_SECRET|secretOrKey|passport-jwt|JwtModule|@fastify/jwt", "expiresIn|exp\\b"]),
    ],
    founder: "Anyone can forge a login token and act as any user, admins included, because the server doesn't properly check that tokens are genuine.",
    fix: "Verify every token with jwt.verify (or jose's jwtVerify) using a pinned algorithm and a long secret from an environment variable, set short expiry times, and check issuer and audience for tokens from login providers.",
    refs: { cwe: ["CWE-347", "CWE-345"] },
  },
  {
    id: "MFS-AUTH-08",
    category: "AUTH",
    severity: "high",
    platforms: ["web", "server"],
    title: "Unlimited login or code attempts",
    check: "Find login, signup, password reset and one-time code endpoints (OTP, 2FA, magic links) and how often each can be called.",
    failIf:
      "These endpoints accept unlimited attempts: no rate limit per account or IP, no lockout or growing delay, and one-time codes stay valid after many wrong tries.",
    passIf:
      "The endpoints are rate limited (express-rate-limit, @nestjs/throttler, @fastify/rate-limit, a gateway or the auth provider), and one-time codes expire and stop working after a few wrong tries. Not applicable when an auth provider handles login and codes entirely.",
    variants: [
      W("Web: auth routes, server actions", [G.webRoutes, G.middleware, G.js], ["login|signin|sign-in|otp|verify|reset|magic", "ratelimit|rateLimit|@upstash/ratelimit|limiter", "attempts|lockout"]),
      S("Server: auth routes", [G.serverCode, G.serverConfig], ["/login|/signin|/otp|/verify|/reset|/forgot", "rateLimit|express-rate-limit|throttler|@fastify/rate-limit|rate-limiter-flexible|slowDown", "attempts|lockout|maxAttempts"]),
    ],
    founder: "Attackers can try passwords or one-time codes over and over until one works, and take over accounts.",
    fix: "Rate limit login, signup, password reset and code endpoints per account and per IP, slow down or lock after repeated failures, and expire one-time codes after a few wrong tries.",
    refs: { cwe: ["CWE-307"] },
  },
  {
    id: "MFS-BACKEND-11",
    category: "BACKEND",
    severity: "high",
    platforms: ["web", "server"],
    title: "Request data saved straight to the database",
    check: "Find create and update handlers and what they pass to the database or ORM.",
    failIf:
      "A handler passes the request body (or a spread of it) straight into a create or update (Model.create(req.body), update(req.body), { ...body }, prisma.user.update({ data: body })), so a user can set fields they shouldn't, like role, isAdmin, plan, balance, verified or another user's ID.",
    passIf:
      "Handlers copy allowed fields explicitly, or validate the body with a strict schema that rejects unknown fields (zod, joi, class-validator with whitelist and forbidNonWhitelisted) before saving.",
    variants: [
      W("Web: route handlers, server actions", [G.webRoutes, G.js], ["await req(uest)?\\.json\\(\\)|formData\\.get|Object\\.fromEntries\\(", "\\.create\\(|\\.update\\(|\\.upsert\\(|\\.insert\\(", "data:\\s*(body|input|data|values)\\b|\\.\\.\\.(body|input|data)", "z\\.object|\\.strict\\(\\)|safeParse"]),
      S("Server: create, update handlers", [G.serverCode], ["req\\.body|request\\.body|ctx\\.request\\.body|c\\.req\\.json\\(\\)", "\\.create\\(|\\.update\\(|\\.updateOne\\(|findByIdAndUpdate|findOneAndUpdate|\\.save\\(|\\.insert\\(", "\\.\\.\\.(req\\.)?body|data:\\s*req\\.body", "whitelist|forbidNonWhitelisted|z\\.object|Joi\\.object|\\.strict\\(\\)"]),
    ],
    founder: "Users can give themselves admin rights, a paid plan or extra credit by adding fields to a normal request, like a profile update.",
    fix: "Copy only the fields each endpoint allows, or validate the body with a strict schema that rejects unknown fields, before saving.",
    refs: { cwe: ["CWE-915"] },
  },
  {
    id: "MFS-BACKEND-12",
    category: "BACKEND",
    severity: "medium",
    platforms: ["web", "server"],
    title: "API responses include private fields",
    check: "Find endpoints that return database records, especially users, accounts, orders and payments, and which fields they send back.",
    failIf:
      "Responses return whole records or user objects with private fields (password hashes, reset or verification tokens, API keys, internal flags, other users' emails or phone numbers), relying on the app to hide them.",
    passIf: "Responses use an explicit select, a serializer or a response DTO that leaves private fields out.",
    variants: [
      W("Web: route handlers, server actions", [G.webRoutes, G.js], ["Response\\.json\\(|NextResponse\\.json\\(", "password|passwordHash|password_hash|resetToken|apiKey", "select:|omit:|\\.select\\("]),
      S("Server: responses", [G.serverCode], ["res\\.(json|send)\\(|reply\\.send\\(|ctx\\.body\\s*=|c\\.json\\(", "password|passwordHash|password_hash|resetToken|apiKey|refreshToken", "\\.select\\(|select:|exclude|toJSON|@Exclude|serialize|ClassSerializerInterceptor", "SELECT \\*|findMany\\(|\\.find\\(\\{"]),
    ],
    founder: "Your API sends private data, like password hashes or other users' contact details, to anyone who looks at its responses, even if the app never shows it.",
    fix: "Return only the fields each screen needs, with a select, a serializer or a response DTO, and never send password hashes or tokens.",
    refs: { cwe: ["CWE-213"] },
  },
  {
    id: "MFS-CODE-09",
    category: "CODE",
    severity: "medium",
    platforms: ["web", "server"],
    title: "File uploads not checked",
    check: "Find file upload handling (multer, busboy, formidable, @fastify/multipart, formData files, presigned upload URLs) and where files are stored and served.",
    failIf:
      "Uploads accept any file type or size, use the uploader's file name in the storage path, are saved in a folder the server serves publicly, or presigned upload URLs allow any content type or size.",
    passIf: "Uploads are checked against allowed types and a size limit, stored under generated names outside public folders (or in object storage), and served with safe content types. Not applicable without uploads.",
    variants: [
      W("Web: uploads", [G.webRoutes, G.js], ["formData\\.get\\(.*file|instanceof File|\\.arrayBuffer\\(\\)", "createPresignedPost|getSignedUrl|PutObjectCommand|\\.upload\\(", "public/uploads|writeFile"]),
      S("Server: uploads", [G.serverCode, G.serverConfig], ["multer\\(|busboy|formidable|@fastify/multipart|FileInterceptor", "fileFilter|limits:|fileSize|mimetype", "originalname|file\\.name|filename", "express\\.static\\(|createPresignedPost|getSignedUrl|PutObjectCommand"]),
    ],
    founder: "Attackers can upload huge files to knock the server over, or files that run as code or overwrite other files.",
    fix: "Allow only the file types you expect, cap the size, store files under random names in object storage or a private folder, and serve them with safe content types (Content-Disposition: attachment where possible).",
    refs: { cwe: ["CWE-434"] },
  },
];
