import type { Metadata } from "next";
import { CSS } from "@/lib/styles";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: `${BRAND} — Mobile app security audit`,
  description: "A security audit of your mobile app's code, run by the coding agent you already use.",
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
