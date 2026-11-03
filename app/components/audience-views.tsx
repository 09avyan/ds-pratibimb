"use client";

/*
  The audience wall's seven ways of showing the market. Every version reads the same live world; each
  arranges the 25 companies its own way and moves its own way:

  V2 Orbit      a giant index dial, the day's leaders and laggards either side, the rest below
  V3 Clay       companies as clay pebbles sized by their weight in the index
  V4 Chroma     a live bar race of the day's moves, rows sliding to their new rank
  V5 Signal     a departure board, every price on split-flap characters that flip as they change
  V6 Vinyl      companies filed in racks by sector, each sector's record turning
  V7 Tangram    a treemap: area by index weight, colour by the move

  V1 keeps its 25-panel wall (in audience-stage.tsx) with the news running along the bottom.
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PublicWorld, Stock } from "@/game/types";
import { Logo } from "@/components/trader-parts";
import { changePct, money, smoothPath } from "./market-parts";

export const SHORT_NAME: Record<string, string> = {
  RELIANCE: "Reliance", TCS: "TCS", HDFCBANK: "HDFC Bank", INFY: "Infosys", ICICIBANK: "ICICI Bank",
  BHARTIARTL: "Airtel", ITC: "ITC", LT: "L&T", SBIN: "SBI", HINDUNILVR: "HUL", TATAMOTORS: "Tata Motors",
  MARUTI: "Maruti", SUNPHARMA: "Sun Pharma", CIPLA: "Cipla", BAJFINANCE: "Bajaj Fin", AXISBANK: "Axis Bank",
  WIPRO: "Wipro", ADANIPORTS: "Adani Ports", NTPC: "NTPC", ONGC: "ONGC", "M&M": "Mahindra", TITAN: "Titan",
  ULTRACEMCO: "UltraTech", DRREDDY: "Dr Reddy's", APOLLOHOSP: "Apollo",
};
export const shortName = (symbol: string) => SHORT_NAME[symbol] ?? symbol;

const pct = (move: number) => `${move >= 0 ? "▲" : "▼"} ${Math.abs(move).toFixed(2)}%`;
const tone = (move: number) => move > .004 ? "up" : move < -.004 ? "down" : "flat";
const priceParts = (price: number) => money(price, 2).replace("₹", "").split(".");

/** "up" or "down" for 700 ms after a value changes, for a flash. */
function useTick(value: number) {
  const last = useRef(value);
  const [tick, setTick] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const before = last.current;
    last.current = value;
    if (value === before) return;
    setTick(value > before ? "up" : "down");
    const timer = window.setTimeout(() => setTick(null), 700);
    return () => window.clearTimeout(timer);
  }, [value]);
  return tick;
}

function Price({ price }: { price: number }) {
  const [rupees, paise] = priceParts(price);
  return <strong className="mv-price"><i>₹</i>{rupees}<em>.{paise}</em></strong>;
}
function Chip({ move }: { move: number }) {
  return <span className={`mv-chip ${tone(move)}`}>{pct(move)}</span>;
}
function Trend({ stock, className = "mv-trend" }: { stock: Stock; className?: string }) {
  const values = stock.trend?.length ? stock.trend : stock.candles.slice(-18).map(candle => candle.close);
  if (values.length < 2) return <svg className={className} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"/>;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const line = smoothPath(values.map((value, i) => ({ x: i * 100 / (values.length - 1), y: 27 - ((value - lo) / span) * 24 })));
  return <svg className={className} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d={line} vectorEffect="non-scaling-stroke"/></svg>;
}

/** Slides each keyed child from where it was to where it is now, whenever the order changes. */
function useFlip(order: string, root: React.RefObject<HTMLElement | null>) {
  const places = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, DOMRect>();
    host.querySelectorAll<HTMLElement>("[data-key]").forEach(node => {
      const key = node.dataset.key!, rect = node.getBoundingClientRect(), before = places.current.get(key);
      next.set(key, rect);
      if (!before || reduce) return;
      const dx = before.left - rect.left, dy = before.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      node.animate([{ transform: `translate(${dx}px, ${dy}px)`, zIndex: 3 }, { transform: "none", zIndex: 3 }], { duration: 900, easing: "cubic-bezier(.2, .9, .2, 1)" });
    });
    places.current = next;
  }, [order, root]);
}

/* ---------- V2 Orbit: the index dial ---------- */
function IndexDial({ index, change }: { index: number; change: number }) {
  // The needle points at the day's move on a −3% … +3% arc.
  const clamped = Math.max(-3, Math.min(3, change));
  const angle = clamped / 3 * 90;
  const ticks = Array.from({ length: 13 }, (_, i) => -90 + i * 15);
  return <div className={`mv-dial ${tone(change)}`} aria-label={`Dalaal-10 ${index.toFixed(2)}, ${change.toFixed(2)}% today`}>
    <i className="mv-dial-orbit one" aria-hidden="true"/><i className="mv-dial-orbit two" aria-hidden="true"/>
    <svg viewBox="-110 -110 220 130" aria-hidden="true">
      <path className="mv-dial-track" d="M -96 0 A 96 96 0 0 1 96 0"/>
      <path className="mv-dial-down" d="M -96 0 A 96 96 0 0 1 0 -96"/>
      <path className="mv-dial-up" d="M 0 -96 A 96 96 0 0 1 96 0"/>
      {ticks.map(t => <line key={t} className="mv-dial-tick" x1="0" y1="-84" x2="0" y2={t % 45 === 0 ? -72 : -78} transform={`rotate(${t})`}/>)}
      <g className="mv-dial-needle" style={{ transform: `rotate(${angle}deg)` }}><path d="M -4 0 L 0 -92 L 4 0 Z"/><circle r="9"/></g>
    </svg>
    <div className="mv-dial-read"><small>Dalaal-10</small><strong>{index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><Chip move={change}/></div>
  </div>;
}
function MoverRow({ stock }: { stock: Stock }) {
  const move = changePct(stock), tick = useTick(stock.price);
  return <div className={`mv-mover ${tone(move)}`} data-key={stock.symbol} data-tick={tick ?? undefined}>
    <Logo stock={stock} compact/><b>{shortName(stock.symbol)}</b><Price price={stock.price}/><Chip move={move}/>
  </div>;
}
export function DialView({ world }: { world: PublicWorld | null }) {
  const stocks = world?.stocks ?? [];
  const sorted = [...stocks].sort((a, b) => changePct(b) - changePct(a));
  const leaders = sorted.slice(0, 5), laggards = sorted.slice(-5).reverse(), rest = sorted.slice(5, -5);
  const root = useRef<HTMLElement>(null);
  useFlip(sorted.map(s => s.symbol).join(","), root);
  return <section ref={root} className="mv mv-dialview" aria-label="Index dial with the day's leaders and laggards">
    <div className="mv-side lead"><h3>Leading</h3>{leaders.map(stock => <MoverRow key={stock.symbol} stock={stock}/>)}</div>
    <IndexDial index={world?.index ?? 10000} change={world?.indexChange ?? 0}/>
    <div className="mv-side lag"><h3>Lagging</h3>{laggards.map(stock => <MoverRow key={stock.symbol} stock={stock}/>)}</div>
    <div className="mv-belt">{rest.map(stock => { const move = changePct(stock); return <span key={stock.symbol} data-key={stock.symbol} className={tone(move)}><b>{shortName(stock.symbol)}</b>{money(stock.price, 2)}<Chip move={move}/></span>; })}</div>
  </section>;
}

/* ---------- V3 Clay: pebbles ---------- */
function Pebble({ stock, index }: { stock: Stock; index: number }) {
  const move = changePct(stock), tick = useTick(stock.price);
  const size = stock.weight >= .1 ? "xl" : stock.weight >= .05 ? "lg" : "md";
  return <article className={`mv-pebble ${size} ${tone(move)}`} data-tick={tick ?? undefined} style={{ "--i": index } as React.CSSProperties} aria-label={`${stock.name} ${money(stock.price, 2)} ${pct(move)}`}>
    <span className="mv-pebble-name"><Logo stock={stock} compact/><b>{shortName(stock.symbol)}</b></span><Price price={stock.price}/><Chip move={move}/>
  </article>;
}
export function PebbleView({ stocks }: { stocks: Stock[] }) {
  const ordered = [...stocks].sort((a, b) => b.weight - a.weight || stocks.indexOf(a) - stocks.indexOf(b));
  return <section className="mv mv-pebbles" aria-label="All 25 companies">{ordered.map((stock, i) => <Pebble key={stock.symbol} stock={stock} index={i}/>)}</section>;
}

/* ---------- V4 Chroma: the bar race ---------- */
function RaceRow({ stock, rank, scale }: { stock: Stock; rank: number; scale: number }) {
  const move = changePct(stock), tick = useTick(stock.price);
  const width = Math.min(100, Math.abs(move) / scale * 100);
  return <div className={`mv-race-row ${tone(move)}`} data-key={stock.symbol} data-tick={tick ?? undefined}>
    <span className="mv-rank">{rank}</span><Logo stock={stock} compact/><b>{shortName(stock.symbol)}</b>
    <span className="mv-bar" aria-hidden="true"><i style={{ width: `${width}%` }}/></span>
    <Price price={stock.price}/><Chip move={move}/>
  </div>;
}
export function RaceView({ stocks }: { stocks: Stock[] }) {
  const sorted = [...stocks].sort((a, b) => changePct(b) - changePct(a));
  const scale = Math.max(1, ...sorted.map(s => Math.abs(changePct(s))));
  const root = useRef<HTMLElement>(null);
  useFlip(sorted.map(s => s.symbol).join(","), root);
  const half = Math.ceil(sorted.length / 2);
  return <section ref={root} className="mv mv-race" aria-label="All 25 companies ranked by today's move">
    {[sorted.slice(0, half), sorted.slice(half)].map((column, c) => <div className="mv-race-col" key={c}>{column.map((stock, i) => <RaceRow key={stock.symbol} stock={stock} rank={c * half + i + 1} scale={scale}/>)}</div>)}
  </section>;
}

/* ---------- V5 Signal: split-flap departure board ---------- */
function Flaps({ text, className }: { text: string; className?: string }) {
  // Each character is its own flap; a changed character remounts (new key) and plays its flip.
  return <span className={`mv-flaps ${className ?? ""}`} aria-label={text}>{[...text].map((ch, i) => <span key={`${text.length - i}:${ch}`} className={ch === "," || ch === "." ? "mv-flap sep" : "mv-flap"} aria-hidden="true">{ch}</span>)}</span>;
}
function FlapRow({ stock }: { stock: Stock }) {
  const move = changePct(stock), tick = useTick(stock.price);
  return <div className={`mv-flap-row ${tone(move)}`} data-tick={tick ?? undefined}>
    <b>{shortName(stock.symbol).toUpperCase()}</b>
    <Flaps text={money(stock.price, 2).replace("₹", "")} className="price"/>
    <Flaps text={`${move >= 0 ? "+" : "-"}${Math.abs(move).toFixed(2)}`} className={`move ${tone(move)}`}/>
  </div>;
}
export function FlapView({ stocks }: { stocks: Stock[] }) {
  return <section className="mv mv-flapboard" aria-label="All 25 companies">
    <header className="mv-flap-head"><span>Company</span><span>Last price ₹</span><span>Change %</span><span>Company</span><span>Last price ₹</span><span>Change %</span><span>Company</span><span>Last price ₹</span><span>Change %</span></header>
    {stocks.map(stock => <FlapRow key={stock.symbol} stock={stock}/>)}
  </section>;
}

/* ---------- V6 Vinyl: sector racks ---------- */
const SECTOR_SHORT: Record<string, string> = { Telecommunications: "Telecom", Healthcare: "Health", Industrial: "Industry", Technology: "Tech" };
export function RackView({ stocks }: { stocks: Stock[] }) {
  const sectors = useMemo(() => {
    const map = new Map<string, Stock[]>();
    for (const stock of stocks) map.set(stock.sector, [...(map.get(stock.sector) ?? []), stock]);
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [stocks]);
  return <section className="mv mv-racks" aria-label="Companies by sector">{sectors.map(([sector, list], s) => {
    const average = list.reduce((sum, stock) => sum + changePct(stock), 0) / list.length;
    return <div key={sector} className={`mv-rack ${tone(average)}`} style={{ "--s": s, "--rows": list.length } as React.CSSProperties}>
      <header><i className="mv-record" aria-hidden="true"/><span><b>{SECTOR_SHORT[sector] ?? sector}</b><Chip move={average}/></span></header>
      {list.map(stock => <RackSleeve key={stock.symbol} stock={stock}/>)}
    </div>;
  })}</section>;
}
function RackSleeve({ stock }: { stock: Stock }) {
  const move = changePct(stock), tick = useTick(stock.price);
  return <div className={`mv-sleeve ${tone(move)}`} data-tick={tick ?? undefined}><Logo stock={stock} compact/><b>{shortName(stock.symbol)}</b><Price price={stock.price}/><Chip move={move}/></div>;
}

/* ---------- V7 Tangram: treemap ---------- */
type Box = { x: number; y: number; w: number; h: number };
/** Squarified treemap: rows of cells laid along the shorter side, keeping cells close to square. */
function squarify(values: number[], box: Box): Box[] {
  const total = values.reduce((a, b) => a + b, 0), out: Box[] = new Array(values.length);
  const scale = box.w * box.h / total;
  const items = values.map((v, i) => ({ i, a: v * scale }));
  let rest = { ...box }, row: typeof items = [];
  const worst = (r: typeof items, side: number) => { const s = r.reduce((a, b) => a + b.a, 0); const mx = Math.max(...r.map(x => x.a)), mn = Math.min(...r.map(x => x.a)); return Math.max(side * side * mx / (s * s), (s * s) / (side * side * mn)); };
  const layout = (r: typeof items) => {
    const s = r.reduce((a, b) => a + b.a, 0);
    if (rest.w >= rest.h) { const w = s / rest.h; let y = rest.y; for (const it of r) { const h = it.a / w; out[it.i] = { x: rest.x, y, w, h }; y += h; } rest = { x: rest.x + w, y: rest.y, w: rest.w - w, h: rest.h }; }
    else { const h = s / rest.w; let x = rest.x; for (const it of r) { const w = it.a / h; out[it.i] = { x, y: rest.y, w, h }; x += w; } rest = { x: rest.x, y: rest.y + h, w: rest.w, h: rest.h - h }; }
  };
  for (const item of items) {
    const side = Math.min(rest.w, rest.h);
    if (!row.length || worst([...row, item], side) <= worst(row, side)) row.push(item);
    else { layout(row); row = [item]; }
  }
  if (row.length) layout(row);
  return out;
}
export function TreemapView({ stocks }: { stocks: Stock[] }) {
  const ordered = [...stocks].sort((a, b) => b.weight - a.weight || stocks.indexOf(a) - stocks.indexOf(b));
  // Every company keeps a readable minimum; the index heavyweights take the most room.
  const boxes = useMemo(() => squarify(ordered.map(s => .052 + s.weight), { x: 0, y: 0, w: 160, h: 100 }), [ordered.map(s => s.symbol).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="mv mv-treemap" aria-label="All 25 companies sized by index weight">{ordered.map((stock, i) => {
    const b = boxes[i], move = changePct(stock);
    return <TreeCell key={stock.symbol} stock={stock} move={move} style={{ left: `${b.x / 1.6}%`, top: `${b.y}%`, width: `${b.w / 1.6}%`, height: `${b.h}%`, "--heat": Math.min(1, Math.abs(move) / 4).toFixed(3) } as React.CSSProperties}/>;
  })}</section>;
}
function TreeCell({ stock, move, style }: { stock: Stock; move: number; style: React.CSSProperties }) {
  const tick = useTick(stock.price);
  return <article className={`mv-cell ${tone(move)}`} style={style} data-tick={tick ?? undefined}><div><Logo stock={stock} compact/><b>{shortName(stock.symbol)}</b></div><Price price={stock.price}/><Chip move={move}/></article>;
}

/** V1: the latest headlines running along the bottom of the wall, like a news channel. */
export function NewsCrawl({ items }: { items: { id: string; headline: string; type: string }[] }) {
  const loop = [...items, ...items];
  return <section className="mv-crawl" aria-label="Latest news">
    <span className="mv-crawl-tag">Latest news</span>
    <div className="mv-crawl-track"><div style={{ "--n": Math.max(1, items.length) } as React.CSSProperties}>{loop.map((item, i) => <span key={`${item.id}-${i}`} className={item.type}><b>{item.type === "major" ? "Major" : "News"}</b>{item.headline}</span>)}</div></div>
  </section>;
}
