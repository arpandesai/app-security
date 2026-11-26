// Shared glob patterns for rule variants. Paths are relative to the repo root.

export const G = {
  js: "**/*.{js,jsx,ts,tsx,mjs,cjs}",
  dart: "**/*.dart",
  kotlinJava: "**/*.{kt,java}",
  swiftObjc: "**/*.{swift,m,mm,h}",
  manifest: "**/src/main/AndroidManifest.xml",
  androidResXml: "**/src/main/res/xml/*.xml",
  gradle: "**/*.gradle,**/*.gradle.kts,**/gradle.properties,**/libs.versions.toml",
  plist: "**/Info.plist",
  entitlements: "**/*.entitlements",
  privacyManifest: "**/PrivacyInfo.xcprivacy",
  xcodeProject: "**/*.pbxproj,**/*.xcconfig,**/Podfile",
  expoConfig: "app.json,app.config.js,app.config.ts,eas.json",
  env: "**/.env*",
  pubspec: "**/pubspec.yaml",
  configFiles: "**/*.{json,plist,xml,properties,yaml,yml,toml,xcconfig}",
  sql: "**/*.sql",
  firebaseRules: "**/firestore.rules,**/database.rules.json,**/storage.rules,**/firebase.json",
  backend:
    "supabase/functions/**,functions/**,api/**,server/**,backend/**,app/api/**,pages/api/**,src/app/api/**,src/pages/api/**",
  aiToolConfig:
    ".mcp.json,**/.cursor/mcp.json,**/.vscode/mcp.json,**/.claude/settings*.json,**/.codex/config.toml,**/.windsurf/**,**/claude_desktop_config.json,**/.continue/config.*",
  lockfiles:
    "**/package-lock.json,**/yarn.lock,**/pnpm-lock.yaml,**/bun.lock,**/bun.lockb,**/pubspec.lock,**/Podfile.lock,**/Package.resolved,**/gradle.lockfile",
  ci: ".github/workflows/*.yml,codemagic.yaml,bitrise.yml,fastlane/*,**/*.sh,Makefile,package.json",
  // Web apps
  webConfig: "next.config.{js,mjs,ts},vite.config.{js,mjs,ts},vercel.json,netlify.toml,**/_headers",
  middleware: "middleware.{js,ts},src/middleware.{js,ts}",
  webRoutes:
    "app/**/route.{js,ts},src/app/**/route.{js,ts},pages/api/**,src/pages/api/**,app/**/actions.{js,ts},src/app/**/actions.{js,ts},server/**,api/**",
  html: "index.html,public/**/*.html",
  // Node.js servers
  serverCode:
    "src/**/*.{js,ts,mjs,cjs},routes/**,controllers/**,middleware/**,middlewares/**,services/**,modules/**,handlers/**,server/**,api/**,app/**/*.{js,ts},lib/**/*.{js,ts},*.{js,ts,mjs,cjs}",
  serverConfig:
    "package.json,**/.env*,ecosystem.config.*,Dockerfile,docker-compose*.{yml,yaml},serverless.{yml,yaml,ts},nest-cli.json,vercel.json,fly.toml,render.yaml,Procfile",
  templates: "**/*.{ejs,hbs,handlebars,pug,njk,html}",
};

/** Split comma-separated glob lists without breaking brace sets such as *.{js,ts}. */
export const splitGlobs = (g: string) => g.split(/,(?![^{]*\})/).map((x) => x.trim()).filter(Boolean);

/** Globs that only matter for mobile apps. Dropped from shared "any" variants when the project is web only. */
export const MOBILE_ONLY_GLOBS = new Set(
  [
    G.dart, G.kotlinJava, G.swiftObjc, G.manifest, G.androidResXml, G.gradle, G.plist, G.entitlements,
    G.privacyManifest, G.xcodeProject, G.expoConfig, G.pubspec, "fastlane/*", "**/Podfile", "**/Package.swift",
    "**/pubspec.lock", "**/Podfile.lock", "**/Package.resolved", "**/gradle.lockfile",
  ].flatMap(splitGlobs)
);

/** Folders the agent must skip: third-party and generated code. */
const EXCLUDE_COMMON = ["node_modules", "build", "dist", "vendor", ".git", "coverage"];
const EXCLUDE_MOBILE = ["Pods", ".dart_tool", ".gradle", ".expo", "DerivedData", "android/app/build", "ios/build"];
const EXCLUDE_WEB = [".next", ".vercel", "out"];
const EXCLUDE_SERVER = [".serverless", ".aws-sam", "uploads", "logs"];
export const excludeFor = (kinds: { mobile: boolean; web: boolean; server?: boolean }) => [
  ...EXCLUDE_COMMON,
  ...(kinds.mobile ? EXCLUDE_MOBILE : []),
  ...(kinds.web ? EXCLUDE_WEB : []),
  ...(kinds.server ? EXCLUDE_SERVER : []),
  "*.lock (except when collecting dependencies)",
];
export const EXCLUDE = excludeFor({ mobile: true, web: true, server: true });

/** Platform thresholds. Update yearly when store requirements move. */
export const THRESHOLDS = {
  // Google Play: new apps and app updates must target API 36 since 31 Aug 2026.
  androidTargetSdk: 36,
  androidMinSdk: 24,
  iosMinDeployment: 15,
};
