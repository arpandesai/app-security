"use client";

import { useEffect } from "react";

/** Opens every collapsed section before printing so the PDF contains the full report. */
export function PrintExpander() {
  useEffect(() => {
    const open = () => document.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
    window.addEventListener("beforeprint", open);
    return () => window.removeEventListener("beforeprint", open);
  }, []);
  return null;
}

/** Opens the browser's print dialog, where the report can be saved as a PDF. */
export function PrintButton({ className = "btn ghost" }: { className?: string }) {
  return (
    <button className={className} type="button" onClick={() => window.print()}>
      Save as PDF
    </button>
  );
}
