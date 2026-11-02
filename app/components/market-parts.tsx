"use client";

import { useEffect, useRef, useState } from "react";
import type { News, PublicWorld, Stock } from "@/game/types";

// Formatting and chart pieces shared by the trading screens and the audience walls.
export const money = (n: number, digits = 2) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
export const changePct = (s: Stock) => (s.price / s.previousClose - 1) * 100;
export const newsScope = (news: Pick<News, "scope" | "symbols" | "sector">) => {
  const scope = news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
  return scope === "economy" ? "Economy · all stocks" : scope === "stock" ? (news.symbols?.join(", ") ?? news.sector) : `${news.sector} sector`;
};
export function latestNewsSet(world: PublicWorld | null) {
  const news = world?.headlines ?? [];
  if (!news.length) return [];
  const latestAt = Math.max(...news.map(item => item.createdAt));
  const ids = new Set(world?.latestNewsIds ?? []);
  return news.filter(item => ids.size ? ids.has(item.id) : item.createdAt === latestAt).sort((a, b) => a.createdAt - b.createdAt);
}
export function smoothPath(points: { x: number; y: number }[]) {
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
export function useChartColour(stock: Stock, startedAt = 0) {
  const previous = useRef({ key: `${stock.symbol}:${startedAt}`, price: stock.price });
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const state = stock.price > stock.base ? "above" : stock.price < stock.base ? "below" : "at-open";
  const baseColor = state === "above" ? "var(--up)" : state === "below" ? "var(--down)" : "var(--muted)";
  useEffect(() => {
    const key = `${stock.symbol}:${startedAt}`;
    const old = previous.current;
    previous.current = { key, price: stock.price };
    const direction = old.key === key ? Math.sign(stock.price - old.price) : 0;
    const contrary = direction < 0 && stock.price > stock.base ? "down" : direction > 0 && stock.price < stock.base ? "up" : null;
    setFlash(contrary);
    if (contrary) {
      const timer = window.setTimeout(() => setFlash(null), 400);
      return () => window.clearTimeout(timer);
    }
  }, [stock.symbol, stock.price, stock.base, startedAt]);
  return { state, flash, baseColor, color: flash === "up" ? "var(--up)" : flash === "down" ? "var(--down)" : baseColor };
}

export function MiniChart({ stock, startedAt = 0 }: { stock: Stock; startedAt?: number }) {
  const chart = useChartColour(stock, startedAt);
  const values = stock.trend?.length ? stock.trend : stock.candles.slice(-18).map(c => c.close);
  if (values.length < 2) return <svg className="mini-chart" viewBox="0 0 100 28" aria-hidden="true"><line x1="0" x2="100" y1="14" y2="14" stroke="var(--line)" /></svg>;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const points = values.map((v, i) => ({ x: i * 100 / (values.length - 1), y: 25 - ((v - lo) / span) * 21 }));
  return <svg className="mini-chart" data-chart-state={chart.state} data-chart-flash={chart.flash ?? "none"} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d={smoothPath(points)} fill="none" className="chart-price-line" stroke={chart.color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>;
}

/**
 * The batch clock, counted down locally between updates. On a slow connection updates can arrive
 * every two or three seconds; the clock still moves every second and corrects itself on each update.
 * It never runs more than three seconds ahead of the last update, and stops while paused.
 */
export function useSmoothRemaining(world: PublicWorld | null) {
  const remaining = world?.remaining ?? 0;
  const live = world?.status === "live" && !world.controls.paused;
  const mark = useRef({ remaining, at: 0 });
  const [now, setNow] = useState(() => Date.now());
  if (mark.current.remaining !== remaining || !mark.current.at) mark.current = { remaining, at: Date.now() };
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [live]);
  if (!live) return remaining;
  return Math.max(0, remaining - Math.min(3, Math.max(0, now - mark.current.at) / 1000));
}

export function fmtTime(seconds: number) { const s = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
