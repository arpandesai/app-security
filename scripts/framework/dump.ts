// Exports the live ruleset, with check counts per stack from the real planner, for scripts/framework/build.py.
import { ALL_RULES, CATEGORIES, RULESET_VERSION } from "../../lib/rules";
import { THRESHOLDS, excludeFor, G } from "../../lib/rules/globs";
import { detectProfile } from "../../lib/detect";
import { planRules } from "../../lib/checklist";

// Check counts per typical stack, computed by the real planner.
const STACKS: [string, string[], string[]][] = [
  ["Native iOS", ["ios/App.xcodeproj", "ios/Podfile"], []],
  ["Native Android", ["app/src/main/AndroidManifest.xml", "app/build.gradle.kts"], []],
  ["React Native", ["package.json"], ["react-native"]],
  ["Flutter with Firebase", ["pubspec.yaml", "lib/main.dart", "firebase.json"], ["flutter", "firebase_core"]],
  ["Expo with Supabase", ["package.json", "app.json", "supabase/config.toml"], ["expo", "react-native", "@supabase/supabase-js"]],
  ["Every mobile target", ["package.json", "app.json", "pubspec.yaml", "firebase.json", "supabase/config.toml", "ios/Podfile", "app/src/main/AndroidManifest.xml"], ["expo", "react-native", "flutter", "firebase", "@supabase/supabase-js"]],
  ["React (Vite)", ["package.json", "vite.config.ts"], ["react", "react-dom", "vite"]],
  ["Next.js with Supabase", ["package.json", "next.config.ts", "supabase/migrations"], ["next", "react-dom", "@supabase/supabase-js"]],
  ["React (Vite) with Firebase", ["package.json", "vite.config.ts", "firebase.json"], ["react", "react-dom", "vite", "firebase"]],
  ["Every web target", ["package.json", "next.config.ts", "firebase.json", "supabase/migrations"], ["next", "react-dom", "firebase", "@supabase/supabase-js"]],
  ["Expo and Next.js monorepo", ["apps/mobile/package.json", "apps/mobile/app.json", "apps/web/next.config.ts", "supabase/config.toml"], ["expo", "react-native", "next", "react-dom", "@supabase/supabase-js"]],
];
const stackCounts = STACKS.map(([name, files, deps]) => {
  const p = detectProfile(files, deps)!;
  return { name, label: p.label, checks: planRules(p).length };
});

const out = {
  version: RULESET_VERSION, thresholds: THRESHOLDS, globs: G, stackCounts,
  exclude: { mobile: excludeFor({ mobile: true, web: false }), web: excludeFor({ mobile: false, web: true }) },
  categories: CATEGORIES.map(c => ({ id: c.id, name: c.name, rules: ALL_RULES.filter(r => r.category === c.id).map(r => ({
    id: r.id, severity: r.severity, title: r.title, check: r.check, failIf: r.failIf, passIf: r.passIf, variants: r.variants,
    founder: r.founder, fix: r.fix, refs: r.refs, level: r.level, standards: r.standards || [],
    platforms: r.platforms, web: r.web || null,
    highValueOnly: !!r.highValueOnly, serverEvaluated: !!r.serverEvaluated, registryCheck: !!r.registryCheck })) })),
};
console.log(JSON.stringify(out, null, 1));
