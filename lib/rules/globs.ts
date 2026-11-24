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
  ci: ".github/workflows/*.yml,codemagic.yaml,bitrise.yml,fastlane/*,**/*.sh,Makefile,package.json",
};

/** Folders the agent must skip: third-party and generated code. */
export const EXCLUDE = [
  "node_modules",
  "Pods",
  "build",
  ".dart_tool",
  ".gradle",
  ".expo",
  "dist",
  "vendor",
  "DerivedData",
  ".git",
  "android/app/build",
  "ios/build",
  "*.lock (except when collecting dependencies)",
];

/** Platform thresholds. Update yearly when store requirements move. */
export const THRESHOLDS = {
  // Google Play: new apps and app updates must target API 36 since 31 Aug 2026.
  androidTargetSdk: 36,
  androidMinSdk: 24,
  iosMinDeployment: 15,
};
