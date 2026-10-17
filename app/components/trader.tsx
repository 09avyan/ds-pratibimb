"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Mode, News, Player, PublicWorld, Stock, Trade } from "@/game/types";
import { equity, performance, shortValue } from "@/game/engine";
import { DalaalMark, Logo } from "@/components/trader-parts";
import { UI_OPTIONS, type UiVariant } from "@/ui-options";

type Props = { mode?: Mode; audienceOnly?: boolean; terminal?: number; uiVariant?: UiVariant; preview?: boolean };
type TradeSide = "Buy" | "Sell" | "Short";
const money = (n: number, digits = 2) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const changePct = (s: Stock) => (s.price / s.previousClose - 1) * 100;
const newsScope = (news: Pick<News, "scope" | "symbols" | "sector">) => {
  const scope = news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
  return scope === "economy" ? "Economy · all stocks" : scope === "stock" ? (news.symbols?.join(", ") ?? news.sector) : `${news.sector} sector`;
};
function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const previous = points[Math.max(0, i - 1)];
    const start = points[i];
    const end = points[i + 1];
    const next = points[Math.min(points.length - 1, i + 2)];
    const c1x = start.x + (end.x - previous.x) / 6;
    const c1y = start.y + (end.y - previous.y) / 6;
    const c2x = end.x - (next.x - start.x) / 6;
    const c2y = end.y - (next.y - start.y) / 6;
    path += ` C${c1x},${c1y} ${c2x},${c2y} ${end.x},${end.y}`;
  }
  return path;
}
const sessionStorageKey = (mode: Mode, terminal?: number, preview = false) => {
  const device = terminal ? `device-${String(terminal).padStart(2, "0")}` : "device";
  return preview ? `ds-ui-preview-${device}` : mode === "test" ? `ds-practice-${device}` : `ds-${device}`;
};
const initialSession = (mode: Mode, terminal?: number, preview = false) => {
  if (typeof window === "undefined") return "";
  const key = sessionStorageKey(mode, terminal, preview);
  let saved = window.localStorage.getItem(key);
  if (!saved) { saved = crypto.randomUUID(); window.localStorage.setItem(key, saved); }
  return saved;
};

function mergeChartData(nextWorld: PublicWorld, previousWorld: PublicWorld | null, symbol: string, includeCandles: boolean) {
  if (includeCandles && previousWorld?.batch === nextWorld.batch) {
    const currentCandles = previousWorld.stocks.find(stock => stock.symbol === symbol)?.candles ?? [];
    const updates = nextWorld.stocks.find(stock => stock.symbol === symbol)?.candles ?? [];
    if (currentCandles.length && updates.length) {
      const byTime = new Map(currentCandles.map(candle => [candle.time, candle] as const));
      for (const candle of updates) byTime.set(candle.time, candle);
      const merged = [...byTime.values()].sort((a, b) => a.time - b.time).slice(-600);
      return { ...nextWorld, stocks: nextWorld.stocks.map(stock => stock.symbol === symbol ? { ...stock, candles: merged } : stock) };
    }
  } else if (!includeCandles && previousWorld?.batch === nextWorld.batch) {
    const cached = previousWorld.stocks.find(stock => stock.symbol === symbol);
    if (cached?.candles.length) return { ...nextWorld, stocks: nextWorld.stocks.map(stock => stock.symbol === symbol ? { ...stock, candles: cached.candles } : stock) };
  }
  return nextWorld;
}

function MiniChart({ stock }: { stock: Stock }) {
  const values = stock.trend?.length ? stock.trend : stock.candles.slice(-18).map(c => c.close);
  if (values.length < 2) return <svg className="mini-chart" viewBox="0 0 100 28" aria-hidden="true"><line x1="0" x2="100" y1="14" y2="14" stroke="var(--line)" /></svg>;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const points = values.map((v, i) => ({ x: i * 100 / (values.length - 1), y: 25 - ((v - lo) / span) * 21 }));
  const up = values.at(-1)! >= values[0];
  return <svg className="mini-chart" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d={smoothPath(points)} fill="none" stroke={up ? "#1e9173" : "#d75a4e"} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>;
}

function StockPriceTicker({ stocks }: { stocks: Stock[] }) {
  if (!stocks.length) return null;
  const copies = [...stocks, ...stocks];
  const duration = `${Math.max(26, stocks.length * 2.1)}s`;
  return <section className="stock-price-ticker" aria-label={`Live stock prices: ${stocks.map(stock => `${stock.name} ${money(stock.price, stock.price < 100 ? 2 : 0)}`).join(", ")}`}>
    <span className="ticker-label"><i/> LIVE PRICES</span>
    <div className="ticker-window"><div className="ticker-track" style={{ animationDuration: duration }} aria-hidden="true">
      {copies.map((stock, index) => <span className="ticker-quote" key={`${stock.symbol}-${index}`}><b>{stock.symbol}</b><strong>{money(stock.price, stock.price < 100 ? 2 : 0)}</strong><em className={changePct(stock) >= 0 ? "positive" : "negative"}>{changePct(stock) >= 0 ? "+" : ""}{changePct(stock).toFixed(2)}%</em></span>)}
    </div></div>
  </section>;
}

function MainChart({ stock, kind, trades, startedAt, position }: { stock: Stock; kind: "Line" | "Candles"; trades: Trade[]; startedAt: number; position?: { side: "Long" | "Short"; avg: number; qty: number } }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const data = stock.candles.slice(-600);
  if (data.length < 2) return <div className="chart-loading">Building the first market bars…</div>;
  const w = 760, h = 250, pad = { l: 8, r: 68, t: 15, b: 24 };
  const values = [...data.flatMap(c => [c.high, c.low]), ...(position ? [position.avg] : [])];
  const min = Math.min(...values) * .9985, max = Math.max(...values) * 1.0015;
  const plotWidth = w - pad.l - pad.r;
  const firstTime = data[0].time, lastTime = data.at(-1)!.time;
  const xTime = (time: number) => pad.l + Math.max(0, Math.min(1, (time - firstTime) / Math.max(1, lastTime - firstTime))) * plotWidth;
  const x = (i: number) => xTime(data[i].time);
  const y = (v: number) => pad.t + (max - v) * (h - pad.t - pad.b) / (max - min || 1);
  const path = smoothPath(data.map((c, i) => ({ x: x(i), y: y(c.close) })));
  const ticks = [0, .25, .5, .75, 1].map(f => max - f * (max - min));
  const visibleTrades = trades.flatMap(trade => {
    if (trade.symbol !== stock.symbol || trade.time < firstTime || trade.time > lastTime + 1500 || (startedAt > 0 && trade.time < startedAt)) return [];
    let index = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(data[i].time - trade.time) < Math.abs(data[index].time - trade.time)) index = i;
    return [{ trade, index }];
  });
  const activeHover = hoveredIndex === null ? null : Math.max(0, Math.min(data.length - 1, hoveredIndex));
  const hoveredTrades = activeHover === null ? [] : visibleTrades.filter(item => item.index === activeHover);
  const formatTime = (time: number) => {
    if (!startedAt) return "PRE-START";
    const seconds = Math.round((time - startedAt) / 1000);
    return `${seconds < 0 ? "−" : "+"}${String(Math.floor(Math.abs(seconds) / 60)).padStart(2, "0")}:${String(Math.abs(seconds) % 60).padStart(2, "0")}`;
  };
  return <><div className="price-chart-frame"><svg className="price-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${stock.name} ${kind.toLowerCase()} price chart with this terminal's own trades. Hover over the chart for timestamp, OHLC, volume, and trade details.`} onPointerMove={event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const chartX = (event.clientX - bounds.left) / bounds.width * w;
    const pointerTime = firstTime + (chartX - pad.l) / plotWidth * (lastTime - firstTime);
    let next = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(data[i].time - pointerTime) < Math.abs(data[next].time - pointerTime)) next = i;
    setHoveredIndex(current => current === next ? current : next);
  }} onPointerLeave={() => setHoveredIndex(null)}>
    <title>{stock.name} {kind.toLowerCase()} chart with your buy, sell, short and cover markers</title>
    <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9ee4cc" stopOpacity=".28"/><stop offset="1" stopColor="#9ee4cc" stopOpacity="0"/></linearGradient></defs>
    {ticks.map((v, i) => <g key={i}><line x1={pad.l} x2={w - pad.r + 8} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 5"/><text x={w - pad.r + 14} y={y(v) + 5} fill="var(--muted)" fontSize="16">{v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</text></g>)}
    {kind === "Line" ? <><path d={`${path} L${x(data.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`} fill="url(#chartFill)"/><path d={path} fill="none" stroke="#087c66" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/></> : data.map((c, i) => {
      const color = c.close >= c.open ? "#168b70" : "#d75a4e";
      const bodyTop = Math.min(y(c.open), y(c.close)), bodyHeight = Math.max(1.25, Math.abs(y(c.open) - y(c.close)));
      const bodyWidth = Math.min(9, plotWidth / (data.length - 1) * .55);
      return <g key={c.time}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.4"/><rect x={x(i) - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color}/></g>;
    })}
    {position && <g className="chart-entry-line"><line x1={pad.l} x2={w - pad.r + 8} y1={y(position.avg)} y2={y(position.avg)} stroke={position.side === "Short" ? "#bd4b42" : "#087c66"} strokeWidth="1.6" strokeDasharray="6 4"/><text x={pad.l + 5} y={Math.max(pad.t + 12, y(position.avg) - 5)} fill={position.side === "Short" ? "#bd4b42" : "#087c66"} fontSize="13" fontWeight="700">{position.side === "Short" ? "SHORT AVG" : "BUY AVG"} {money(position.avg)}</text></g>}
    {visibleTrades.map(({ trade, index }, markIndex) => {
      const sameBarBefore = visibleTrades.slice(0, markIndex).filter(mark => mark.index === index).length;
      const markerY = Math.max(pad.t + 12, Math.min(h - pad.b - 12, y(trade.price) - sameBarBefore * 22));
      const covered = trade.side === "Buy" ? (trade.coveredQty ?? (trade.note?.startsWith("Covered") ? trade.qty : 0)) : 0;
      const marker = covered ? { label: covered < trade.qty ? "C+B" : "C", color: "#475dd1" } : trade.side === "Buy" ? { label: "B", color: "#087c66" }
        : trade.side === "Sell" ? { label: "S", color: "#cf781d" }
          : trade.side === "Short" ? { label: "SH", color: "#bd4b42" }
            : trade.side === "Auto-sell" ? { label: "S", color: "#cf781d" } : { label: "C", color: "#475dd1" };
      const markerRadius = marker.label.length > 2 ? 12 : marker.label.length > 1 ? 10 : 9;
      const markerFont = marker.label.length > 2 ? 8 : marker.label.length > 1 ? 9 : 10;
      return <g key={trade.id} data-trade-marker={covered ? "Cover" : trade.side} transform={`translate(${xTime(trade.time)},${markerY})`}><circle r={markerRadius} fill={marker.color}/><text x="0" y="3.2" textAnchor="middle" fill="white" fontSize={markerFont} fontWeight="800">{marker.label}</text><title>{trade.note ?? `${trade.side} ${trade.qty} ${stock.symbol}`} at {money(trade.price)} · {formatTime(trade.time)}</title></g>;
    })}
    <circle cx={x(data.length - 1)} cy={y(stock.price)} r="3.5" fill="#1247d2"/><line x1={x(data.length - 1) + 8} x2={w - pad.r + 4} y1={y(stock.price)} y2={y(stock.price)} stroke="#1247d2" strokeDasharray="3 3"/>
    <text x={pad.l} y={h - 4} fill="var(--muted)" fontSize="13">{formatTime(data[0].time)}</text><text x={x(Math.floor((data.length - 1) / 2))} y={h - 4} textAnchor="middle" fill="var(--muted)" fontSize="13">{formatTime(data[Math.floor((data.length - 1) / 2)].time)}</text>
    <text x={w - pad.r - 20} y={h - 4} fill="var(--muted)" fontSize="13">{formatTime(data.at(-1)!.time)}</text>
    {activeHover !== null && <><line x1={x(activeHover)} x2={x(activeHover)} y1={pad.t} y2={h - pad.b} stroke="var(--muted)" strokeDasharray="3 3" opacity=".65"/><circle cx={x(activeHover)} cy={y(data[activeHover].close)} r="4" fill="#1247d2" stroke="white" strokeWidth="1.5"/>
    </>}
    </svg>{activeHover !== null && <div className="chart-hover-card chart-hover-overlay" style={x(activeHover) > w * .58 ? { left: 8 } : { right: 8 }}><b>{formatTime(data[activeHover].time)} from batch open</b><span>O {money(data[activeHover].open)} · H {money(data[activeHover].high)}</span><span>L {money(data[activeHover].low)} · C {money(data[activeHover].close)}</span><span>Volume {data[activeHover].volume.toLocaleString("en-IN")}</span>{hoveredTrades.slice(0, 3).map(({ trade }) => <span key={trade.id} className={`trade-detail ${trade.side.toLowerCase().replace("-", "")}`}>{trade.side === "Buy" && (trade.coveredQty ?? 0) ? "COVER" : trade.side.toUpperCase()} {trade.qty} @ {money(trade.price)} · {formatTime(trade.time)}</span>)}{hoveredTrades.length > 3 && <span>+{hoveredTrades.length - 3} more markers on this candle</span>}</div>}</div>{visibleTrades.length > 0 && <div className="chart-marker-legend"><span><i className="buy">B</i> Buy</span><span><i className="sell">S</i> Sell</span><span><i className="short">SH</i> Short</span><span><i className="cover">C</i> Cover</span><small>Your trades · Hover for batch time and price</small></div>}</>;
}

function Header({ world, player, onTheme, theme, clockNow }: { world: PublicWorld | null; player: Player | null; onTheme: () => void; theme: "light" | "dark"; clockNow: number }) {
  const value = world && player ? equity(world as never, player) : 1_000_000;
  const pnl = value - (player?.initialCash ?? 1_000_000);
  return <header className="topbar">
    <div className="topbar-brand"><DalaalMark/><span>DALAA<span>L</span> STREET</span></div>
    <div className="market-ribbon"><span className="ribbon-label">DALAAL-10</span><strong>{world?.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "10,000.00"}</strong><span className={world && world.indexChange >= 0 ? "positive" : "negative"}>{world ? `${world.indexChange >= 0 ? "+" : ""}${world.indexChange.toFixed(2)}%` : "0.00%"}</span></div>
    <div className="topbar-metrics"><div><small>SESSION</small><b className="timer-value">{world?.status === "countdown" ? fmtTime(Math.ceil((world.startedAt - clockNow) / 1000)) : world ? fmtTime(world.remaining) : "06:00"}</b></div><div><small>FREE CASH</small><b>{money(player?.cash ?? 1_000_000, 0)}</b></div><div><small>PORTFOLIO</small><b>{money(value, 0)}</b></div><div><small>DAY P&amp;L</small><b className={pnl >= 0 ? "positive" : "negative"}>{pnl >= 0 ? "+" : ""}{money(pnl, 0)}</b></div></div>
    <button className="theme-button" onClick={onTheme} aria-pressed={theme === "dark"} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? "☾" : "☀"}</button>
  </header>;
}
function fmtTime(seconds: number) { const s = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }

export function Trader({ mode = "live", audienceOnly = false, terminal, uiVariant, preview = false }: Props) {
  const [sessionId, setSessionId] = useState("");
  const [world, setWorld] = useState<PublicWorld | null>(null);
  const [view, setView] = useState<"markets" | "portfolio" | "report" | "news">("markets");
  const [selected, setSelected] = useState("RELIANCE");
  const [side, setSide] = useState<TradeSide>("Buy");
  const [chartType, setChartType] = useState<"Line" | "Candles">("Line");
  const [quantity, setQuantity] = useState("10");
  const [amount, setAmount] = useState("");
  const [sector, setSector] = useState("All sectors");
  const [query, setQuery] = useState("");
  const [toast, setToast]