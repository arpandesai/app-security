import type { Profile, Target } from "./types";

const base = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop()!.toLowerCase();

/**
 * Work out the stack from the marker files and dependency names the agent reports.
 * Mobile: React Native/Expo, Flutter, native Android, native iOS. Web: Next.js, React (Vite or Create React App).
 * A monorepo can be both. Returns null when no supported app is found.
 */
export function detectProfile(projectFiles: string[], dependencyNames: string[] = []): Profile | null {
  const files = projectFiles.map((f) => f.replace(/\\/g, "/"));
  const names = new Set(files.map(base));
  const deps = new Set(dependencyNames.map((d) => d.trim().toLowerCase()));
  const has = (n: string) => names.has(n.toLowerCase());
  const anyPath = (re: RegExp) => files.some((f) => re.test(f));

  // Mobile frameworks
  const isExpo = deps.has("expo");
  const isRN = isExpo || deps.has("react-native");
  const isFlutter = has("pubspec.yaml") && (deps.size === 0 || deps.has("flutter") || anyPath(/(^|\/)lib\/main\.dart$/) || !isRN);

  // Web frameworks. Expo's own web support (react-native-web) is part of the mobile app, not a separate web app.
  const isNext = deps.has("next") || anyPath(/(^|\/)next\.config\.(js|mjs|ts)$/);
  const isReactWeb =
    !isNext &&
    !isRN &&
    (deps.has("react-dom") || deps.has("react")) &&
    (deps.has("vite") || deps.has("@vitejs/plugin-react") || deps.has("@vitejs/plugin-react-swc") || deps.has("react-scripts") || anyPath(/(^|\/)vite\.config\.(js|mjs|ts)$/));

  let android = has("androidmanifest.xml") || has("build.gradle") || has("build.gradle.kts");
  let ios =
    has("info.plist") || has("podfile") || has("package.swift") || anyPath(/\.xcodeproj\/?$/) || anyPath(/\.xcworkspace\/?$/);

  const frameworks: Profile["frameworks"] = [];
  if (isRN) frameworks.push("react-native");
  if (isFlutter) frameworks.push("flutter");
  if (isRN || isFlutter) {
    // Cross-platform apps ship to both stores even when native folders are generated at build time (Expo prebuild).
    android = true;
    ios = true;
  } else if (android || ios) {
    frameworks.push("native");
  }
  if (isNext) frameworks.push("nextjs");
  if (isReactWeb) frameworks.push("react-web");
  if (!frameworks.length) return null;

  const platforms: Profile["platforms"] = [];
  if (android) platforms.push("android");
  if (ios) platforms.push("ios");
  if (isNext || isReactWeb) platforms.push("web");
  const mobile = android || ios;
  const web = isNext || isReactWeb;

  const backends: Profile["backends"] = [];
  const firebase =
    has("google-services.json") ||
    has("googleservice-info.plist") ||
    has("firebase.json") ||
    has("firestore.rules") ||
    [...deps].some((d) => d === "firebase" || d.startsWith("@react-native-firebase/") || d.startsWith("firebase_") || d === "firebase-admin");
  const supabase =
    anyPath(/(^|\/)supabase\/(config\.toml|migrations)/) ||
    [...deps].some((d) => d.includes("supabase"));
  if (firebase) backends.push("firebase");
  if (supabase) backends.push("supabase");

  const targets: Target[] = ["any"];
  if (mobile) targets.push("mobile");
  if (web) targets.push("web");
  if (isRN) targets.push("react-native");
  if (isExpo) targets.push("expo");
  if (isFlutter) targets.push("flutter");
  if (isNext) targets.push("nextjs");
  if (isReactWeb) targets.push("react-web");
  targets.push(...platforms.filter((p) => p !== "web"), ...backends);

  const fwName = (f: Profile["frameworks"][number]) =>
    f === "react-native"
      ? isExpo
        ? "React Native (Expo)"
        : "React Native"
      : f === "flutter"
        ? "Flutter"
        : f === "nextjs"
          ? "Next.js"
          : f === "react-web"
            ? deps.has("react-scripts")
              ? "React (Create React App)"
              : "React (Vite)"
            : "Native";
  const fw = frameworks.map(fwName).join(" + ");
  const pl = platforms.map((p) => (p === "android" ? "Android" : p === "ios" ? "iOS" : "Web")).join(", ");
  const be = backends.map((b) => (b === "firebase" ? "Firebase" : "Supabase")).join(", ");
  const label = [fw, pl, be].filter(Boolean).join(" · ");

  return { frameworks, platforms, targets, backends, label };
}

/** Which platform kinds a profile covers. */
export const platformKinds = (p: Profile) => ({
  mobile: p.platforms.includes("android") || p.platforms.includes("ios"),
  web: p.platforms.includes("web"),
});
