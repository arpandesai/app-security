import type { Profile, Target } from "./types";

const base = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop()!.toLowerCase();

/**
 * Work out the stack from the marker files and dependency names the agent reports.
 * Returns null when no mobile app is found.
 */
export function detectProfile(projectFiles: string[], dependencyNames: string[] = []): Profile | null {
  const files = projectFiles.map((f) => f.replace(/\\/g, "/"));
  const names = new Set(files.map(base));
  const deps = new Set(dependencyNames.map((d) => d.trim().toLowerCase()));
  const has = (n: string) => names.has(n.toLowerCase());
  const anyPath = (re: RegExp) => files.some((f) => re.test(f));

  const isExpo = deps.has("expo");
  const isRN = isExpo || deps.has("react-native");
  const isFlutter = has("pubspec.yaml") && (deps.size === 0 || deps.has("flutter") || anyPath(/(^|\/)lib\/main\.dart$/) || !isRN);

  let android = has("androidmanifest.xml") || has("build.gradle") || has("build.gradle.kts");
  let ios =
    has("info.plist") || has("podfile") || has("package.swift") || anyPath(/\.xcodeproj\/?$/) || anyPath(/\.xcworkspace\/?$/);

  const frameworks: Profile["frameworks"] = [];
  if (isRN) frameworks.push("react-native");
  if (isFlutter) frameworks.push("flutter");
  if (frameworks.length) {
    // Cross-platform apps ship to both stores even when native folders are generated at build time (Expo prebuild).
    android = true;
    ios = true;
  } else if (android || ios) {
    frameworks.push("native");
  } else {
    return null;
  }

  const platforms: Profile["platforms"] = [];
  if (android) platforms.push("android");
  if (ios) platforms.push("ios");

  const backends: Profile["backends"] = [];
  const firebase =
    has("google-services.json") ||
    has("googleservice-info.plist") ||
    has("firebase.json") ||
    has("firestore.rules") ||
    [...deps].some((d) => d === "firebase" || d.startsWith("@react-native-firebase/") || d.startsWith("firebase_"));
  const supabase =
    anyPath(/(^|\/)supabase\/(config\.toml|migrations)/) ||
    [...deps].some((d) => d.includes("supabase"));
  if (firebase) backends.push("firebase");
  if (supabase) backends.push("supabase");

  const targets: Target[] = ["any"];
  if (isRN) targets.push("react-native");
  if (isExpo) targets.push("expo");
  if (isFlutter) targets.push("flutter");
  targets.push(...platforms, ...backends);

  const fw = frameworks
    .map((f) => (f === "react-native" ? (isExpo ? "React Native (Expo)" : "React Native") : f === "flutter" ? "Flutter" : "Native"))
    .join(" + ");
  const pl = platforms.map((p) => (p === "android" ? "Android" : "iOS")).join(", ");
  const be = backends.map((b) => (b === "firebase" ? "Firebase" : "Supabase")).join(", ");
  const label = [fw, pl, be].filter(Boolean).join(" · ");

  return { frameworks, platforms, targets, backends, label };
}
