import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import { CSS } from "@/lib/styles";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: `Free mobile app security report in 5 minutes | ${BRAND}`,
  description:
    "Your AI coding agent checks your React Native, Flutter, iOS or Android code against 46 security checks. Get a verdict, a score and the exact lines to fix. Free.",
  openGraph: {
    title: "Get your app security report in 5 minutes",
    description: "46 security checks mapped to OWASP, run by the coding agent you already use. Free. Your codebase never leaves your machine.",
    url: "https://app-security.mobilefirst.in",
    siteName: BRAND,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
