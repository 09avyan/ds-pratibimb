"use client";

import { useState } from "react";
import type { Stock } from "@/game/types";

const colors: Record<string, string> = { Energy: "gold", Technology: "blue", Banking: "violet", Consumer: "coral", Industrial: "teal", Auto: "slate", Healthcare: "green" };

export function DalaalMark({ className = "" }: { className?: string }) {
  return <svg className={`dalaal-mark ${className}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <path d="M7 5h15c8.3 0 14 5.9 14 15S30.3 35 22 35H7z" fill="currentColor" opacity=".16"/>
    <path d="M10 8h11c7.3 0 12 4.6 12 12s-4.7 12-12 12H10z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round"/>
    <path d="M15 25v-7m6 7V13m6 12v-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <path d="m14 15 6-5 5 2 5-5" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

function CompanyGlyph({ sector }: { sector: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (sector === "Energy") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m14 2-9 12h7l-2 8 9-12h-7z"/></svg>;
  if (sector === "Technology") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M8 5h8v14H8zM4 8h4m-4 8h4m8-8h4m-4 8h4M11 9h2m-2 6h2"/></svg>;
  if (sector === "Banking") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m3 8 9-5 9 5M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M4 19h16"/></svg>;
  if (sector === "Consumer") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m12 3 2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6-4.8 2.6.9-5.5-4-3.9 5.5-.8z"/></svg>;
  if (sector === "Industrial") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 21V9l6 3V8l6 4V5h4v16zM8 17h2m4 0h2"/></svg>;
  if (sector === "Auto") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m4 14 2-6h12l2 6v5h-2v-2H6v2H4zm2 0h12l-1.5-4h-9zM7 14v.1M17 14v.1"/></svg>;
  if (sector === "Healthcare") return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M4 18V8m5 10V5m5 13v-7m5 7V3"/></svg>;
}

export function Logo({ stock, compact = false }: { stock: Stock; compact?: boolean }) {
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(stock.domain)}&sz=64`;
  const logoReady = loadedFor === stock.symbol && failedFor !== stock.symbol;
  return <span className={`company-mark ${colors[stock.sector] || "blue"} ${compact ? "compact" : ""} ${logoReady ? "logo-loaded" : ""}`} role="img" aria-label={`${stock.name} logo`}>
    {failedFor !== stock.symbol && <img key={stock.symbol} src={logoUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setLoadedFor(stock.symbol)} onError={() => setFailedFor(stock.symbol)} />}
    <span aria-hidden="true"><CompanyGlyph sector={stock.sector}/></span>
  </span>;
}
