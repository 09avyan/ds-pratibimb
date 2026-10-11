"use client";

import { useState } from "react";
import type { Stock } from "@/game/types";

const colors: Record<string, string> = { Energy: "gold", Technology: "blue", Banking: "violet", Consumer: "coral", Industrial: "teal", Auto: "slate", Healthcare: "green" };
export function Logo({ stock, compact = false }: { stock: Stock; compact?: boolean }) {
  const [status, setStatus] = useState<{ domain: string; attempt: number; loaded: boolean }>({ domain: stock.domain, attempt: 0, loaded: false });
  const sources = [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(stock.domain)}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(stock.domain)}.ico`,
    `https://${stock.domain}/favicon.ico`,
  ];
  const current = status.domain === stock.domain ? status : { domain: stock.domain, attempt: 0, loaded: false };
  const label = stock.name.split(/\s+/).map(word => word.replace(/[^A-Za-z]/g, "")[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || stock.symbol.replace(/[^A-Z]/g, "").slice(0, 2);
  return <span className={`company-mark ${colors[stock.sector] || "blue"} ${compact ? "compact" : ""} ${current.loaded ? "logo-loaded" : ""}`} aria-label={`${stock.name} logo`}>
    {current.attempt < sources.length && <img key={`${stock.domain}-${current.attempt}`} src={sources[current.attempt]} loading="lazy" decoding="async" alt="" style={{ visibility: current.loaded ? "visible" : "hidden" }} onLoad={() => setStatus({ domain: stock.domain, attempt: current.attempt, loaded: true })} onError={() => setStatus({ domain: stock.domain, attempt: current.attempt + 1, loaded: false })}/>}
    {!current.loaded && <span>{label}</span>}
  </span>;
}
