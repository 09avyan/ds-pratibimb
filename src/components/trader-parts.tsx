import type { Stock } from "@/game/types";

const colors: Record<string, string> = { Energy: "gold", Technology: "blue", Banking: "violet", Consumer: "coral", Industrial: "teal", Auto: "slate", Healthcare: "green" };
export function Logo({ stock, compact = false }: { stock: Stock; compact?: boolean }) {
  const label = stock.symbol.replace(/[^A-Z]/g, "").slice(0, stock.symbol.length > 6 ? 2 : 3);
  return <span className={`company-mark ${colors[stock.sector] || "blue"} ${compact ? "compact" : ""}`} aria-label={`${stock.name} logo`}><img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(stock.domain)}&sz=64`} alt="" onError={e => { e.currentTarget.style.display = "none"; }}/><span>{label}</span></span>;
}
