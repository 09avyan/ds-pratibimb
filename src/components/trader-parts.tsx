import { useState } from "react";
import type { Stock } from "@/game/types";

const colors: Record<string, string> = { Energy: "gold", Technology: "blue", Banking: "violet", Consumer: "coral", Industrial: "teal", Auto: "slate", Healthcare: "green" };
export function Logo({ stock, compact = false }: { stock: Stock; compact?: boolean }) {
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const label = stock.name.split(/\s+/).map(word => word.replace(/[^A-Za-z]/g, "")[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || stock.symbol.replace(/[^A-Z]/g, "").slice(0, 2);
  const logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(stock.domain)}&sz=32`;
  const logoReady = loadedFor === stock.symbol && failedFor !== stock.symbol;
  return <span className={`company-mark ${colors[stock.sector] || "blue"} ${compact ? "compact" : ""} ${logoReady ? "logo-loaded" : ""}`} role="img" aria-label={`${stock.name} logo`}>
    {failedFor !== stock.symbol && <img key={stock.symbol} src={logoUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setLoadedFor(stock.symbol)} onError={() => setFailedFor(stock.symbol)} />}
    <span aria-hidden="true">{label}</span>
  </span>;
}
