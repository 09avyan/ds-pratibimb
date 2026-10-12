import type { Stock } from "@/game/types";

const colors: Record<string, string> = { Energy: "gold", Technology: "blue", Banking: "violet", Consumer: "coral", Industrial: "teal", Auto: "slate", Healthcare: "green" };
export function Logo({ stock, compact = false }: { stock: Stock; compact?: boolean }) {
  const label = stock.name.split(/\s+/).map(word => word.replace(/[^A-Za-z]/g, "")[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || stock.symbol.replace(/[^A-Z]/g, "").slice(0, 2);
  return <span className={`company-mark ${colors[stock.sector] || "blue"} ${compact ? "compact" : ""}`} aria-label={`${stock.name} logo`}>
    <span>{label}</span>
  </span>;
}
