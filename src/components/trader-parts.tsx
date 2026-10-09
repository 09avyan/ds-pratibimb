"use client";

import { useState } from "react";
import type { Stock } from "@/game/types";

const colors: Record<string, string> = { Energy: "gold", Technology: "blue", Banking: "violet", Consumer: "coral", Industrial: "teal", Auto: "slate", Healthcare: "green" };
export function Logo({ stock, compact = false }: { stock: Stock; compact?: boolean }) {
  const [loadedDomain, setLoadedDomain] = useState<string | null>(null);
  const [failedDomain, setFailedDomain] = useState<string | null>(null);
  const label = stock.symbol.replace(/[^A-Z]/g, "").slice(0, stock.symbol.length > 6 ? 2 : 3);
  const loaded = loadedDomain === stock.domain;
  return <span className={`company-mark ${colors[stock.sector] || "blue"} ${compact ? "compact" : ""} ${loaded ? "logo-loaded" : ""}`} aria-label={`${stock.name} logo`}>
    {failedDomain !== stock.domain && <img key={stock.domain} src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(stock.domain)}&sz=64`} loading="lazy" decoding="async" alt="" style={{ visibility: loaded ? "visible" : "hidden" }} onLoad={() => setLoadedDomain(stock.domain)} onError={() => setFailedDomain(stock.domain)}/>}
    {!loaded && <span>{label}</span>}
  </span>;
}
