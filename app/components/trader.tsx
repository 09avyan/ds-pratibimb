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

function MainChart({ stock, kind, trades }: { stock: Stock; kind: "Line" | "Candles"; trades: Trade[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const data = stock.candles.slice(-600);
  if (data.length < 2) return <div className="chart-loading">Building the first market bars…</div>;
  const w = 760, h = 250, pad = { l: 8, r: 68, t: 15, b: 24 };
  const values = data.flatMap(c => [c.high, c.low]);
  const min = Math.min(...values) * .9985, max = Math.max(...values) * 1.0015;
  const plotWidth = w - pad.l - pad.r;
  const x = (i: number) => pad.l + i * plotWidth / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (max - v) * (h - pad.t - pad.b) / (max - min || 1);
  const path = smoothPath(data.map((c, i) => ({ x: x(i), y: y(c.close) })));
  const ticks = [0, .25, .5, .75, 1].map(f => max - f * (max - min));
  const visibleTrades = trades.flatMap(trade => {
    if (trade.symbol !== stock.symbol || trade.time < data[0].time - 1500 || trade.time > data.at(-1)!.time + 1500) return [];
    let index = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(data[i].time - trade.time) < Math.abs(data[index].time - trade.time)) index = i;
    return [{ trade, index }];
  });
  const activeHover = hoveredIndex === null ? null : Math.max(0, Math.min(data.length - 1, hoveredIndex));
  const hoveredTrades = activeHover === null ? [] : visibleTrades.filter(item => item.index === activeHover);
  const formatTime = (time: number) => new Date(time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return <><div className="price-chart-frame"><svg className="price-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${stock.name} ${kind.toLowerCase()} price chart. Hover over the chart for timestamp, OHLC, volume, and trade details.`} onPointerMove={event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const chartX = (event.clientX - bounds.left) / bounds.width * w;
    const nearest = Math.round((chartX - pad.l) / plotWidth * (data.length - 1));
    const next = Math.max(0, Math.min(data.length - 1, nearest));
    setHoveredIndex(current => current === next ? current : next);
  }} onPointerLeave={() => setHoveredIndex(null)}>
    <title>{stock.name} {kind.toLowerCase()} chart with buy, sell, short and cover markers</title>
    <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9ee4cc" stopOpacity=".28"/><stop offset="1" stopColor="#9ee4cc" stopOpacity="0"/></linearGradient></defs>
    {ticks.map((v, i) => <g key={i}><line x1={pad.l} x2={w - pad.r + 8} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 5"/><text x={w - pad.r + 14} y={y(v) + 5} fill="var(--muted)" fontSize="16">{v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</text></g>)}
    {kind === "Line" ? <><path d={`${path} L${x(data.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`} fill="url(#chartFill)"/><path d={path} fill="none" stroke="#087c66" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/></> : data.map((c, i) => {
      const color = c.close >= c.open ? "#168b70" : "#d75a4e";
      const bodyTop = Math.min(y(c.open), y(c.close)), bodyHeight = Math.max(1.25, Math.abs(y(c.open) - y(c.close)));
      const bodyWidth = Math.min(9, plotWidth / (data.length - 1) * .55);
      return <g key={c.time}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.4"/><rect x={x(i) - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color}/></g>;
    })}
    {visibleTrades.map(({ trade, index }, markIndex) => {
      const sameBarBefore = visibleTrades.slice(0, markIndex).filter(mark => mark.index === index).length;
      const markerY = Math.max(pad.t + 5, Math.min(h - pad.b - 5, y(trade.price) - sameBarBefore * 11));
      const marker = trade.side === "Buy" ? { label: "B", color: "#087c66" }
        : trade.side === "Sell" ? { label: "S", color: "#cf781d" }
          : trade.side === "Short" ? { label: "SH", color: "#bd4b42" }
            : { label: "C", color: "#475dd1" };
      return <g key={trade.id} data-trade-marker={trade.side} transform={`translate(${x(index)},${markerY})`}><circle r="6" fill={marker.color}/><text x="0" y="2.4" textAnchor="middle" fill="white" fontSize={marker.label.length > 1 ? "5.2" : "6.5"} fontWeight="800">{marker.label}</text><title>{trade.side} {trade.qty} {stock.symbol} at {money(trade.price)} · {new Date(trade.time).toLocaleString("en-IN")}</title></g>;
    })}
    <circle cx={x(data.length - 1)} cy={y(stock.price)} r="3.5" fill="#1247d2"/><line x1={x(data.length - 1) + 8} x2={w - pad.r + 4} y1={y(stock.price)} y2={y(stock.price)} stroke="#1247d2" strokeDasharray="3 3"/>
    <text x={pad.l} y={h - 4} fill="var(--muted)" fontSize="13">{formatTime(data[0].time)}</text><text x={x(Math.floor((data.length - 1) / 2))} y={h - 4} textAnchor="middle" fill="var(--muted)" fontSize="13">{formatTime(data[Math.floor((data.length - 1) / 2)].time)}</text>
    <text x={w - pad.r - 20} y={h - 4} fill="var(--muted)" fontSize="13">{formatTime(data.at(-1)!.time)}</text>
    {activeHover !== null && <><line x1={x(activeHover)} x2={x(activeHover)} y1={pad.t} y2={h - pad.b} stroke="var(--muted)" strokeDasharray="3 3" opacity=".65"/><circle cx={x(activeHover)} cy={y(data[activeHover].close)} r="4" fill="#1247d2" stroke="white" strokeWidth="1.5"/>
    </>}
  </svg>{activeHover !== null && <div className="chart-hover-card chart-hover-overlay" style={activeHover > data.length * .58 ? { left: 8 } : { right: 8 }}><b>{new Date(data[activeHover].time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}</b><span>O {money(data[activeHover].open)} · H {money(data[activeHover].high)}</span><span>L {money(data[activeHover].low)} · C {money(data[activeHover].close)}</span><span>Volume {data[activeHover].volume.toLocaleString("en-IN")}</span>{hoveredTrades.slice(0, 3).map(({ trade }) => <span key={trade.id} className={`trade-detail ${trade.side.toLowerCase().replace("-", "")}`}>{trade.side.toUpperCase()} {trade.qty} @ {money(trade.price)} · {formatTime(trade.time)}</span>)}{hoveredTrades.length > 3 && <span>+{hoveredTrades.length - 3} more markers on this candle</span>}</div>}</div>{visibleTrades.length > 0 && <div className="chart-marker-legend"><span><i className="buy">B</i> Buy</span><span><i className="sell">S</i> Sell</span><span><i className="short">SH</i> Short</span><span><i className="cover">C</i> Cover</span><small>Hover for exact trade time and price</small></div>}</>;
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
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeReady, setThemeReady] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now);
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const tradeDialogRef = useRef<HTMLDialogElement>(null);
  const lastNews = useRef<string | null>(null);
  const inFlight = useRef(false);
  const submitting = useRef(false);
  const readController = useRef<AbortController | null>(null);
  const mutationVersion = useRef(0);
  const failures = useRef(0);
  const nextSyncAt = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const viewRef = useRef(view);
  viewRef.current = view;
  const worldRef = useRef<PublicWorld | null>(world);
  worldRef.current = world;
  const chartSymbol = useRef<string | null>(null);
  const chartLastTime = useRef(0);
  const newsTimeout = useRef<number | null>(null);

  useEffect(() => { if (!audienceOnly) setSessionId(initialSession(mode, terminal, preview)); }, [audienceOnly, mode, preview, terminal]);
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ds-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    setThemeReady(true);
  }, []);
  const sync = useCallback(async () => {
    if ((!audienceOnly && !sessionId) || inFlight.current || submitting.current || document.hidden || !navigator.onLine || Date.now() < nextSyncAt.current) return;
    inFlight.current = true;
    const controller = new AbortController();
    readController.current = controller;
    const revision = mutationVersion.current;
    const requestedStock = selectedRef.current;
    const currentWorld = worldRef.current;
    const includeCandles = !audienceOnly && viewRef.current === "markets";
    const canReuseChart = includeCandles && chartSymbol.current === requestedStock && chartLastTime.current > 0;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const terminalQuery = terminal ? `&terminal=${terminal}` : "";
      const previewQuery = preview ? "&preview=1" : "";
      const revisionQuery = currentWorld && (!includeCandles || canReuseChart) ? `&revision=${currentWorld.revision}` : "";
      const chartQuery = includeCandles ? `${canReuseChart ? `&candlesSince=${Math.max(0, chartLastTime.current - 2000)}` : ""}` : "&chart=0";
      const res = await fetch(`/api/game?mode=${mode}&selected=${encodeURIComponent(requestedStock)}${sessionId ? `&session=${encodeURIComponent(sessionId)}` : ""}${terminalQuery}${previewQuery}${revisionQuery}${chartQuery}`, { cache: "no-store", signal: controller.signal });
      if (res.status === 304) { failures.current = 0; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Market data is unavailable.");
      if (revision !== mutationVersion.current || requestedStock !== selectedRef.current) return;
      failures.current = 0;
      let nextWorld = mergeChartData(data as PublicWorld, worldRef.current, requestedStock, includeCandles);
      if (includeCandles) {
        chartSymbol.current = requestedStock;
        chartLastTime.current = nextWorld.stocks.find(stock => stock.symbol === requestedStock)?.candles.at(-1)?.time ?? 0;
      }
      worldRef.current = nextWorld;
      setWorld(nextWorld);
      const headline = data.latestNewsId;
      if (headline && headline !== lastNews.current) {
        lastNews.current = headline;
        if (!audienceOnly) { setBreaking(true); if (newsTimeout.current) window.clearTimeout(newsTimeout.current); newsTimeout.current = window.setTimeout(() => setBreaking(false), 30_000); }
      }
    } catch (err) { if (!controller.signal.aborted) { failures.current += 1; nextSyncAt.current = Date.now() + Math.min(15000, 1000 * 2 ** failures.current); if (failures.current === 1) setToast(err instanceof Error ? err.message : "Reconnecting to the market…"); } }
    finally { clearTimeout(timeout); if (readController.current === controller) { inFlight.current = false; readController.current = null; } }
  }, [sessionId, mode, audienceOnly, terminal, uiVariant, preview]);
  useEffect(() => { if (!sessionId && !audienceOnly) return; void sync(); const timer = window.setInterval(sync, world?.controls.tickRate === .5 ? 500 : 1000); return () => window.clearInterval(timer); }, [sessionId, audienceOnly, sync, world?.controls.tickRate]);
  useEffect(() => {
    if (world?.status !== "countdown") return;
    setClockNow(Date.now());
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [world?.status, world?.startedAt]);
  useEffect(() => { readController.current?.abort(); nextSyncAt.current = 0; void sync(); }, [selected, sync]);
  useEffect(() => { const resume = () => { if (!document.hidden && navigator.onLine) { nextSyncAt.current = 0; void sync(); } else readController.current?.abort(); }; document.addEventListener("visibilitychange", resume); window.addEventListener("online", resume); window.addEventListener("offline", resume); return () => { document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); window.removeEventListener("offline", resume); readController.current?.abort(); }; }, [sync]);

  const player = world?.player ?? null;
  const stock = world?.stocks.find(s => s.symbol === selected) ?? world?.stocks[0];
  const sectors = useMemo(() => ["All sectors", ...Array.from(new Set(world?.stocks.map(s => s.sector) ?? []))], [world?.stocks]);
  const shownStocks = useMemo(() => (world?.stocks ?? []).filter(s => (sector === "All sectors" || s.sector === sector) && (!query || `${s.symbol} ${s.name} ${s.sector}`.toLowerCase().includes(query.toLowerCase()))), [world?.stocks, sector, query]);
  const invested = useMemo(() => Object.entries(player?.holdings ?? {}).filter(([, p]) => p.qty > 0), [player?.holdings]);
  const shorts = useMemo(() => Object.entries(player?.shorts ?? {}).filter(([, p]) => p.qty > 0), [player?.shorts]);
  const totalLong = world && player ? invested.reduce((sum, [symbol, p]) => sum + p.qty * (world.stocks.find(s => s.symbol === symbol)?.price ?? 0), 0) : 0;
  const totalShort = world && player ? shortValue(world as never, player.shorts) : 0;
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const calculatedAmount = qty * (stock?.price ?? 0);
  const ownedQty = player?.holdings[selected]?.qty ?? 0;
  const shortQty = player?.shorts[selected]?.qty ?? 0;
  const blocked = busy || !player || player.ended || !world || world.status !== "live" || world.controls.paused || (world.mode === "live" && (player.paused || !player.included));

  useEffect(() => { if (toast) { const t = window.setTimeout(() => setToast(""), 3600); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => () => { if (newsTimeout.current) window.clearTimeout(newsTimeout.current); }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (themeReady) window.localStorage.setItem("ds-theme", theme);
    return () => { delete document.documentElement.dataset.theme; };
  }, [theme, themeReady]);
  useEffect(() => {
    const dialog = tradeDialogRef.current;
    if (!dialog) return;
    if (tradeOpen && !dialog.open) dialog.showModal();
    if (!tradeOpen && dialog.open) dialog.close();
  }, [tradeOpen]);
  useEffect(() => { if (view === "portfolio") setMenu(false); }, [view]);
  useEffect(() => { if (player?.ended && (world?.mode === "test" || world?.status === "closed")) setView("report"); }, [world?.mode, world?.status, player?.ended]);

  async function send(action: string, payload: Record<string, unknown> = {}) {
    if (!sessionId || submitting.current) return;
    submitting.current = true;
    mutationVersion.current += 1;
    readController.current?.abort();
    setBusy(true);
    try {
      const requestedStock = selectedRef.current;
      const includeCandles = !audienceOnly && (viewRef.current === "markets" || action === "sandbox-start");
      const canReuseChart = includeCandles && action !== "sandbox-start" && chartSymbol.current === requestedStock && chartLastTime.current > 0;
      const candlesSince = canReuseChart ? Math.max(0, chartLastTime.current - 2000) : undefined;
      const res = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, sessionId, terminal, localPreview: preview, action, selectedStock: requestedStock, includeCandles, candlesSince, requestId: crypto.randomUUID(), ...payload }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trade could not be completed.");
      const nextWorld = mergeChartData(data as PublicWorld, worldRef.current, requestedStock, includeCandles);
      if (includeCandles) {
        chartSymbol.current = requestedStock;
        chartLastTime.current = nextWorld.stocks.find(stock => stock.symbol === requestedStock)?.candles.at(-1)?.time ?? 0;
      }
      worldRef.current = nextWorld;
      setWorld(nextWorld);
      if (action === "trade") setToast(data.result?.note ? `Trade complete · ${data.result.note}` : `${payload.side} order executed · ${payload.quantity} ${payload.symbol}`);
      else if (action === "end") setView("report");
      else if (action === "sandbox-start") { setView("markets"); setToast("Your next practice round is starting."); }
      return data;
    } catch (err) { setToast(err instanceof Error ? err.message : "The market could not complete that action."); }
    finally { submitting.current = false; nextSyncAt.current = Date.now() + 500; setBusy(false); }
  }

  if (audienceOnly) return <Audience world={world} uiVariant={uiVariant} preview={preview} theme={theme} onTheme={() => setTheme(current => current === "light" ? "dark" : "light")} />;
  const report = world && player ? performance(world as never, player) : null;
  const isTest = mode === "test";
  const activeNews = world?.headlines.find(n => n.id === world.latestNewsId);
  const previewOption = uiVariant ? UI_OPTIONS.find(option => option.slug === uiVariant) : null;
  const inlineTrade = uiVariant === "arcade";
  const orderTicket = stock && <div className="order-card"><div className="order-title"><div><span className="eyebrow">ORDER TICKET · {stock.symbol}</span><h2>Place a trade</h2></div><span className="order-live"><i/> LIVE PRICE</span></div>
    <div className="side-switch">{(["Buy", "Sell", "Short"] as const).map(t => <button key={t} onClick={() => setSide(t)} className={`${side === t ? `active ${t.toLowerCase()}` : ""}`} disabled={t === "Sell" && !ownedQty}>{t}</button>)}</div>
    {side === "Sell" && <div className="context-hint">You hold {ownedQty} {selected} shares. Sell closes owned shares only.</div>}
    {side === "Short" && <div className="context-hint short-hint">Short exposure is capped at 30% of your starting portfolio. A buy covers open shorts first.</div>}
    {side === "Buy" && shortQty > 0 && <div className="context-hint cover-hint">Your buy will cover up to {shortQty} open short shares first.</div>}
    <div className="quantity-row"><label><span>QUANTITY</span><div><input autoFocus={!inlineTrade} inputMode="numeric" type="number" min="1" step="1" value={quantity} onChange={e => { setQuantity(e.target.value); setAmount(""); }}/><span>SHARES</span></div></label><label><span>ORDER VALUE</span><div><span className="currency-prefix">₹</span><input inputMode="decimal" type="number" min="0" step="1" value={amount || (calculatedAmount ? calculatedAmount.toFixed(2) : "")} onChange={e => { setAmount(e.target.value); setQuantity(String(Math.floor((Number(e.target.value) || 0) / stock.price))); }}/></div></label></div>
    <div className="order-estimate"><span>Est. order value</span><b>{money(calculatedAmount)}</b></div>
    <button className={`execute-button ${side.toLowerCase()}`} disabled={blocked || qty < 1 || (side === "Sell" && qty > ownedQty)} onClick={() => void send("trade", { side, symbol: stock.symbol, quantity: qty })}>{busy ? "Submitting order…" : blocked ? world?.status === "closed" ? "Market closed" : "Waiting for the batch" : `${side} ${qty || "—"} ${stock.symbol}`}</button>
    <div className="available-row"><span>Available cash</span><b>{money(player?.cash ?? 1_000_000, 0)}</b></div>
  </div>;
  return <div className={`terminal${uiVariant ? ` ui-${uiVariant}` : ""}`}>
    {preview && previewOption && <div className="ui-preview-strip"><a className="preview-back" href="/ui-preview">← Compare all</a><div className="preview-option-title"><b>VERSION {previewOption.number} · {previewOption.name}</b><small>{previewOption.tagline}</small></div><span className="preview-sandbox">ISOLATED PREVIEW MARKET · NO LIVE TRADES</span><nav className="preview-switcher" aria-label="Switch design preview">{UI_OPTIONS.map(option => <a key={option.slug} aria-current={option.slug === uiVariant ? "page" : undefined} href={`/ui-preview/${option.slug}/play/${String(terminal ?? 1).padStart(2, "0")}`}>V{option.number}</a>)}<a href={`/ui-preview/${uiVariant}/audience`}>Audience</a></nav></div>}
    <Header world={world} player={player} clockNow={clockNow} theme={theme} onTheme={() => setTheme(current => current === "light" ? "dark" : "light")} />
    <nav className="terminal-tabs" aria-label="Primary navigation">
      {([ ["markets", "Markets"], ["portfolio", "Portfolio"], ["news", "News desk"] ] as const).map(([key, label]) => <button key={key} onClick={() => { if (key === "portfolio") setMenu(false); setTradeOpen(false); setView(key); }} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""}>{label}{key === "news" && Boolean(world?.headlines.length) && <span>{world!.headlines.length}</span>}</button>)}
      <span className="terminal-context">{terminal ? `TERMINAL ${String(terminal).padStart(2, "0")}` : isTest ? "TEST MARKET" : `BATCH ${String(world?.batch || 1).padStart(2, "0")}`}</span>
    </nav>

    <main className={`workspace ${view === "markets" ? "workspace-markets" : "workspace-wide"}`}>
      {isTest && <div className="autonomous-band"><span className="live-dot"/> TEST MARKET · ISOLATED PRACTICE <span>Six minute rounds use the same rules as a live session.</span></div>}
      {world && world.status !== "live" && view === "markets" && <div className="market-state-banner"><span className="state-orb"/>{world.status === "countdown" ? `The market opens in ${Math.max(0, Math.ceil((world.startedAt - clockNow) / 1000))} seconds` : world.status === "closed" ? isTest ? "Practice round complete" : "The batch has ended" : isTest ? "Practice round ready" : "The market is ready"}<span>{world.status === "countdown" ? "The market is starting on every device." : world.status === "closed" ? isTest ? "Start another isolated practice round when you’re ready." : "Review your report to return to the ready state." : isTest ? "Your isolated practice market is ready." : "The host will start the shared batch shortly."}</span>{isTest && (world.status === "closed" || world.status === "ready") && <button type="button" className="outline-button" disabled={busy} onClick={() => void send("sandbox-start")}>Start practice round</button>}</div>}
      {view === "markets" && stock && <>
        {breaking && activeNews && <div className="breaking-alert" role="status"><div className="breaking-mark">!</div><div><small>{activeNews.type.toUpperCase()} NEWS · {newsScope(activeNews)} · JUST NOW</small><strong>{activeNews.headline}</strong></div><button onClick={() => setBreaking(false)} aria-label="Minimize headline">×</button><span className="breaking-progress"/></div>}
        <div className="trading-grid">
          <section className="watch-area">
            <div className="watch-controls"><div className="sector-scroll">{sectors.map(s => <button key={s} className={`filter-chip ${sector === s ? "active" : ""}`} onClick={() => setSector(s)}>{s}</button>)}</div><label className="search-field"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search companies" aria-label="Search stocks"/><kbd>⌘ K</kbd></label></div>
            <div className="stock-grid">{shownStocks.map(s => <button key={s.symbol} className={`stock-card ${selected === s.symbol ? "selected" : ""}`} onClick={() => { setSelected(s.symbol); setQuantity("10"); setAmount(""); if (!inlineTrade) setTradeOpen(true); }} aria-label={`Select ${s.name}${inlineTrade ? " for the inline order panel" : " and open its trade panel"}`}>
              <div className="stock-card-top"><Logo stock={s}/><div className="stock-id"><strong>{s.symbol}</strong><span>{s.name}</span></div></div>
              <div className="stock-card-bottom"><strong>{money(s.price)}</strong><span className={`stock-change ${changePct(s) >= 0 ? "positive" : "negative"}`}>{changePct(s) >= 0 ? "+" : ""}{changePct(s).toFixed(2)}%</span></div>
              <MiniChart stock={s}/>
              <div className="stock-card-foot"><span>{s.sector}</span><span>{(player?.holdings[s.symbol]?.qty ?? 0) > 0 ? `${player!.holdings[s.symbol].qty} shares` : (player?.shorts[s.symbol]?.qty ?? 0) > 0 ? `${player!.shorts[s.symbol].qty} short` : "No position"}</span></div>
            </button>)}</div>
            {!shownStocks.length && <div className="empty-state">No companies match that search.</div>}
            {activeNews && <div className="latest-brief"><span className="brief-icon">◉</span><span><small>LATEST BULLETIN · {newsScope(activeNews)}</small><b>{activeNews.headline}</b></span><button onClick={() => setView("news")}>News desk →</button></div>}
          </section>

          <aside className="trade-column">
            <div className="focus-card"><div className="focus-company"><Logo stock={stock}/><span><small>{stock.sector} · NSE</small><b>{stock.name}</b></span><button className="focus-trade-button" onClick={() => inlineTrade ? document.getElementById("inline-order-ticket")?.scrollIntoView({ behavior: "smooth", block: "nearest" }) : setTradeOpen(true)}>Trade {stock.symbol}</button><button className="ellipsis" onClick={() => setDrawer(true)} aria-label="Open news">···</button></div>
              <div className="focus-price-row"><strong>{money(stock.price)}</strong><span className={`stock-change ${changePct(stock) >= 0 ? "positive" : "negative"}`}>{changePct(stock) >= 0 ? "+" : ""}{changePct(stock).toFixed(2)}%</span><small>SESSION</small></div>
              <MainChart key={stock.symbol} stock={stock} kind={chartType} trades={world?.player?.history ?? []}/>
              <div className="chart-toolbar"><span>INTRADAY <b>·</b> {world?.controls.tickRate ?? 1} SEC</span><div className="chart-toggle">{(["Line", "Candles"] as const).map(t => <button key={t} onClick={() => setChartType(t)} className={chartType === t ? "active" : ""}>{t === "Line" ? "⌁" : "▥"} {t}</button>)}</div></div>
              <div className="chart-foot"><span><i/> Open <b>{money(stock.candles[0]?.open ?? stock.price)}</b></span><span>High <b>{money(Math.max(stock.price, ...stock.candles.map(c => c.high)))}</b></span><span>Low <b>{money(Math.min(stock.price, ...stock.candles.map(c => c.low)))}</b></span></div>
            </div>
            {inlineTrade && <section id="inline-order-ticket" className="inline-order-ticket"><div className="inline-order-heading"><span className="eyebrow">TRADE {stock.symbol} · {stock.sector.toUpperCase()}</span><small>ORDER PANEL</small></div>{orderTicket}</section>}
            <div className="holdings-card"><div><span className="eyebrow">YOUR HOLDINGS</span><button onClick={() => setView("portfolio")}>Portfolio →</button></div>
              {invested.length + shorts.length === 0 ? <p>Build your first position from the watchlist.</p> : [...invested.map(([symbol, p]) => ({ symbol, ...p, short: false })), ...shorts.map(([symbol, p]) => ({ symbol, ...p, short: true }))].slice(0, 4).map(p => {
                const found = world?.stocks.find(s => s.symbol === p.symbol); const val = (found?.price ?? 0) * p.qty;
                return <div className="holding-row" key={p.symbol}><span className="holding-code">{p.symbol}<small>{p.short ? "SHORT" : `${p.qty} shares`}</small></span><span>{money(val, 0)}</span><span className={p.short ? "negative" : "positive"}>{p.short ? "−" : "+"}{money((found?.price ?? 0) * p.qty - p.avg * p.qty, 0)}</span></div>;
              })}
              <div className="holding-total"><span>Net positions</span><b>{money(totalLong - totalShort, 0)}</b></div>
            </div>
          </aside>
        </div>
      </>}

      {view === "portfolio" && <section className="wide-page"><div className="section-heading"><div><div className="eyebrow">DALAA<span>L</span> STREET / ACCOUNT</div><h1>Your portfolio<span className="heading-period">.</span></h1><p>Open exposure and completed orders, updated against the shared market.</p></div></div>
        <div className="portfolio-summary"><Metric label="TOTAL EQUITY" value={money(world && player ? equity(world as never, player) : 1_000_000, 0)} note="Free cash + long value + short P&L"/><Metric label="AVAILABLE CASH" value={money(player?.cash ?? 1_000_000, 0)} note="Short-sale proceeds are not spendable cash"/><Metric label="OPEN LONGS" value={money(totalLong, 0)} note={`${invested.length} company positions`}/><Metric label="SHORT EXPOSURE" value={money(totalShort, 0)} note="Marked to current prices"/></div>
        <div className="page-tabs"><button className={menu ? "" : "active"} onClick={() => setMenu(false)}>Holdings <span>{invested.length + shorts.length}</span></button><button className={menu ? "active" : ""} onClick={() => setMenu(true)}>History <span>{player?.history.length ?? 0}</span></button></div>
        {!menu ? <div className="table-card">{invested.length + shorts.length === 0 ? <div className="empty-state roomy"><span>▧</span><b>No holdings yet</b><p>Choose a company from Markets to place your first order.</p><button className="outline-button" onClick={() => setView("markets")}>Browse markets</button></div> : <table><thead><tr><th>COMPANY</th><th>POSITION</th><th>AVG. PRICE</th><th>LAST PRICE</th><th>MARKET VALUE</th><th>UNREALISED P&amp;L</th><th>ACTION</th></tr></thead><tbody>{[...invested.map(([symbol, p]) => ({ symbol, ...p, short: false })), ...shorts.map(([symbol, p]) => ({ symbol, ...p, short: true }))].map(p => {const s = world?.stocks.find(x => x.symbol === p.symbol); const mark = s?.price ?? 0; const pl = (p.short ? p.avg - mark : mark - p.avg) * p.qty;return <tr key={p.symbol} onClick={() => {setSelected(p.symbol);setView("markets");}}><td><span className="table-company"><Logo stock={s!} compact/><span><b>{s?.name}</b><small>{p.symbol} · {s?.sector}</small></span></span></td><td><span className={`position-pill ${p.short ? "short" : "long"}`}>{p.short ? "Short" : "Long"} · {p.qty}</span></td><td>{money(p.avg)}</td><td>{money(mark)}</td><td>{money(mark * p.qty, 0)}</td><td className={pl >= 0 ? "positive" : "negative"}>{pl >= 0 ? "+" : ""}{money(pl, 0)}</td><td><button className={`position-close ${p.short ? "cover" : "sell"}`} disabled={blocked} onClick={e => { e.stopPropagation(); void send("trade", { side: p.short ? "Buy" : "Sell", symbol: p.symbol, quantity: p.qty }); }}>{busy ? "Submitting…" : p.short ? "Cover short" : "Sell holding"}</button></td></tr>;})}</tbody></table>}</div> : <div className="table-card">{!player?.history.length ? <div className="empty-state roomy"><span>↻</span><b>No trades yet</b><p>Every order and short-cover is recorded here.</p></div> : <table><thead><tr><th>TIME</th><th>COMPANY</th><th>ORDER</th><th>QUANTITY</th><th>EXECUTION</th><th>REALIZED P&amp;L</th></tr></thead><tbody>{player.history.map(t => {const s = world?.stocks.find(x => x.symbol === t.symbol);return <tr key={t.id}><td>{new Date(t.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td><td><span className="table-company"><Logo stock={s!} compact/><span><b>{s?.name ?? t.symbol}</b><small>{t.symbol}</small></span></span></td><td><span className={`position-pill ${t.side === "Short" ? "short" : t.side === "Sell" || t.side === "Auto-cover" ? "sell" : "long"}`}>{t.side}</span></td><td>{t.qty}</td><td>{money(t.price)}</td><td className={t.realized >= 0 ? "positive" : "negative"}>{t.realized ? `${t.realized > 0 ? "+" : ""}${money(t.realized, 0)}` : "—"}</td></tr>;})}</tbody></table>}</div>}</section>}

      {view === "news" && <section className="wide-page"><div className="section-heading"><div><div className="eyebrow">DALAA<span>L</span> STREET / NEWS</div><h1>Market news<span className="heading-period">.</span></h1><p>Company and sector bulletins shape the fictional market through the same price model as trading.</p></div></div><div className="news-list">{world?.headlines.map((n, i) => <article className={`news-item ${i === 0 ? "newest" : ""}`} key={n.id}><div className="news-meta"><span className={`news-tag ${n.type}`}>{n.type}</span><span>{newsScope(n)}</span><time>{new Date(n.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</time></div><h2>{n.headline}</h2></article>) ?? null}{!world?.headlines.length && <div className="empty-state">No bulletins yet. Headlines triggered during this batch will appear here.</div>}</div></section>}

      {view === "report" && report && <section className="results-view"><div className="results-heading"><span className="eyebrow">SESSION COMPLETE · BATCH {world?.batch}</span><h1>That’s a wrap<span>.</span></h1><p>Here’s what your decisions added up to. This is a fictional learning simulation, not investment advice.</p></div><div className="results-value"><small>FINAL PORTFOLIO VALUE</small><strong>{money(report.value, 0)}</strong><span className={report.pnl >= 0 ? "positive" : "negative"}>{report.pnl >= 0 ? "+" : ""}{money(report.pnl, 0)} · {report.returnPct >= 0 ? "+" : ""}{report.returnPct.toFixed(2)}%</span></div><div className="portfolio-summary report-metrics"><Metric label="AVAILABLE CASH" value={money(report.cash, 0)}/><Metric label="ORDERS PLACED" value={String(report.tradeCount)}/><Metric label="WIN / LOSS CLOSES" value={`${report.winners} / ${report.losers}`}/><Metric label="DIVERSIFICATION" value={`${report.sectors} sectors`}/></div>
        <div className="report-trade-pair">{([["BEST CLOSED TRADE", report.bestTrade], ["TOUGHEST CLOSED TRADE", report.worstTrade]] as const).map(([label, trade]) => <article className={`report-trade-card${trade ? trade.realized >= 0 ? " positive-result" : " negative-result" : " empty-result"}`} key={label}><span className="eyebrow">{label}</span>{trade ? <><div className="report-trade-title"><b>{trade.symbol}</b><span>{trade.side} · {trade.qty} shares</span></div><strong className={trade.realized >= 0 ? "positive" : "negative"}>{trade.realized > 0 ? "+" : ""}{money(trade.realized, 0)} <small>realised</small></strong><small className="report-trade-meta">{money(trade.price)} per share · {new Date(trade.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></> : <p>No closed trades yet. Best and toughest realized trades will appear here.</p>}</article>)}</div>
        <div className="report-panels"><div className="report-panel"><span className="eyebrow">YOUR LEARNING NOTES</span>{report.lessons.map((l, i) => <p key={i}><i>{String(i + 1).padStart(2, "0")}</i>{l}</p>)}</div><div className="report-panel"><span className="eyebrow">BADGES EARNED FROM YOUR ACTIONS · {report.badges.length}</span><div className="badge-grid">{report.badges.length ? report.badges.map(b => <span className="achievement" key={b.name}><i>✳</i><b>{b.name}</b><small>{b.detail}</small></span>) : <p>Place an order, explore another part of the market, or try a short to earn a badge.</p>}</div></div></div><button className="execute-button report-ready" onClick={() => { if (isTest && world?.status === "closed") { void send("sandbox-start"); return; } const next = crypto.randomUUID(); localStorage.setItem(sessionStorageKey(mode, terminal, preview), next); setSessionId(next); setView("markets"); setToast(isTest ? "You’re ready to rejoin this practice round." : "You’re ready for the next batch."); }}>{isTest && world?.status === "closed" ? "Start another practice round" : isTest ? "Return to practice market" : "Return to ready state"} <span>→</span></button>
      </section>}
      <footer className="workspace-footer"><span>SIMULATED MARKET · FICTIONAL PRICES · NO REAL TRADES</span><span>© PULSE / DALAA<span>L</span> STREET</span></footer>
    </main>
    {tradeOpen && stock && !inlineTrade && <dialog ref={tradeDialogRef} className={`trade-dialog${uiVariant ? ` ui-${uiVariant}` : ""}`} aria-labelledby="trade-dialog-title" onCancel={event => { event.preventDefault(); setTradeOpen(false); }} onClick={event => { if (event.target === event.currentTarget) setTradeOpen(false); }}>
      <div className="trade-dialog-panel">
        <header className="trade-dialog-heading"><div><span className="eyebrow">QUICK TRADE · {stock?.sector?.toUpperCase()}</span><h2 id="trade-dialog-title">{stock?.symbol} <span>{stock?.name}</span></h2><p>{stock ? money(stock.price) : "—"} <b className={stock && changePct(stock) >= 0 ? "positive" : "negative"}>{stock ? `${changePct(stock) >= 0 ? "+" : ""}${changePct(stock).toFixed(2)}%` : ""}</b></p></div><button className="trade-dialog-close" type="button" onClick={() => setTradeOpen(false)} aria-label="Close quick trade panel">×</button></header>
        {orderTicket}
      </div>
    </dialog>}
    {!audienceOnly && world?.status === "live" && player && !player.ended && <button className="end-session" onClick={() => { if (window.confirm("End your trading session now? Open shorts will be settled at the current simulated price.")) void send("end"); }}>Finish session <span>↗</span></button>}
    {toast && <div className="toast-message" role="status"><span>✓</span>{toast}<button onClick={() => setToast("")}>×</button></div>}
    {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)}><section className="news-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">MARKET BULLETINS</span><h2>News desk</h2></div><button onClick={() => setDrawer(false)}>×</button></div>{world?.headlines.slice(0, 12).map(n => <article key={n.id}><small className={`news-tag ${n.type}`}>{n.type}</small><b>{n.headline}</b><span>{newsScope(n)}</span></article>)}</section></div>}
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) { return <div className="summary-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>; }

function Audience({ world, uiVariant, preview, theme, onTheme }: { world: PublicWorld | null; uiVariant?: UiVariant; preview?: boolean; theme: "light" | "dark"; onTheme: () => void }) {
  const [fullscreen, setFullscreen] = useState(false);
  const latestItems = world ? (world.latestNewsIds?.length ? world.latestNewsIds : world.latestNewsId ? [world.latestNewsId] : [])
    .map(id => world.headlines.find(news => news.id === id))
    .filter((news): news is PublicWorld["headlines"][number] => Boolean(news)) : [];
  const stocks = world?.stocks ?? [];
  const batchHeadlines = [...(world?.headlines ?? [])].sort((a, b) => b.createdAt - a.createdAt);
  const rankedStocks = useMemo(() => [...stocks].sort((a, b) => changePct(b) - changePct(a)), [stocks]);
  const bestStock = rankedStocks[0];
  const worstStock = rankedStocks.at(-1);
  const rising = stocks.filter(stock => changePct(stock) > 0).length;
  const falling = stocks.filter(stock => changePct(stock) < 0).length;
  const returnPct = world?.indexChange ?? 0;
  const isClosed = world?.status === "closed";
  const statusText = world?.status === "live" && !world.controls.paused ? "MARKET LIVE" : isClosed ? "MARKET CLOSED" : "MARKET READY";
  const signReturn = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  const indexText = world?.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "10,000.00";
  const indexTakeaway = isClosed
    ? `closed at ${indexText}, returning ${signReturn(returnPct)} for the batch`
    : world?.status === "live"
      ? `is at ${indexText}, returning ${signReturn(returnPct)} so far`
      : `opens at ${indexText}, the 10,000-point reference`;
  const learningNotes = [
    `The Dalaal-10 ${indexTakeaway}.`,
    `${rising} of ${stocks.length || 28} companies are up${falling ? `, while ${falling} are down` : ""}. This shows whether the move was broad across the market.`,
    bestStock && worstStock ? `${bestStock.symbol} is the strongest mover (${signReturn(changePct(bestStock))}); ${worstStock.symbol} is the weakest (${signReturn(changePct(worstStock))}). Single stocks can move differently from the index.` : "Compare individual stock moves with the index to see how one company can differ from the wider market.",
  ];
  useEffect(() => { const done = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", done); return () => document.removeEventListener("fullscreenchange", done); }, []);
  return <main className={`audience-wall ui-${uiVariant ?? "default"}`}>
    <header className="wall-header">
      <div className="wall-brand"><span className="brand-glyph"><DalaalMark/></span><span><small>PRATIBIMB · INTERACTIVE MARKET</small><b>DALAA<span>L</span> STREET</b></span></div>
      <div className="wall-status"><span className="live-dot"/>{statusText}<b>{world?.status === "live" ? fmtTime(world.remaining) : `BATCH ${String(world?.batch || 1).padStart(2, "0")}`}</b></div>
      <button className="theme-button wall-theme-button" onClick={onTheme} aria-pressed={theme === "dark"} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? "☾" : "☀"}</button>
      <button className="wall-fullscreen" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen()}>{fullscreen ? "Exit full screen" : "Full screen"} ↗</button>
    </header>
    <section className="wall-overview" aria-label="Batch market summary">
      <article className="wall-index-card"><div><small>DALAAL-10 · {isClosed ? "CLOSING LEVEL" : world?.status === "live" ? "LIVE LEVEL" : "REFERENCE LEVEL"}</small><span>{isClosed ? "BATCH CLOSE" : isClosed === false && world?.status === "live" ? "SO FAR" : "BATCH START"}</span></div><strong>{indexText}</strong><b className={returnPct >= 0 ? "positive" : "negative"}>{signReturn(returnPct)} <small>RETURN</small></b><p>Return from the 10,000-point reference</p></article>
      <article className="wall-mover-card best"><span className="mover-label">{isClosed ? "BEST STOCK" : "BEST SO FAR"}</span>{bestStock ? <><div className="mover-company"><Logo stock={bestStock} compact/><b>{bestStock.symbol}</b><small>{bestStock.name}</small></div><strong>{signReturn(changePct(bestStock))}</strong></> : <p>Stock data will appear when the market loads.</p>}</article>
      <article className="wall-mover-card worst"><span className="mover-label">{isClosed ? "WORST STOCK" : "WORST SO FAR"}</span>{worstStock ? <><div className="mover-company"><Logo stock={worstStock} compact/><b>{worstStock.symbol}</b><small>{worstStock.name}</small></div><strong>{signReturn(changePct(worstStock))}</strong></> : <p>Stock data will appear when the market loads.</p>}</article>
      <article className="wall-breadth-card"><span className="mover-label">MARKET BREADTH</span><strong><i className="positive">{rising} up</i><i className="negative">{falling} down</i></strong><small>{world?.participants ?? 0} participants · {stocks.length || 28} companies</small></article>
    </section>
    <div className="wall-news"><div className={`wall-news-label ${latestItems.some(item => item.type === "major") ? "major" : ""}`}>{latestItems.length > 1 ? `${latestItems.length} NEW HEADLINES` : latestItems[0]?.type === "major" ? "MAJOR NEWS" : "LATEST NEWS"}</div><div className="wall-news-headlines">{latestItems.length ? latestItems.map(item => <strong key={item.id}>{item.headline}</strong>) : <strong>The opening bell is close. Markets are ready for the next batch.</strong>}</div><small>{latestItems.length ? [...new Set(latestItems.map(newsScope))].join(" · ").toUpperCase() : "DALAA L STREET"}</small></div>
    <section className="wall-market-section"><div className="wall-section-heading"><div><span className="eyebrow">BATCH {String(world?.batch || 1).padStart(2, "0")} · MARKET BOARD</span><h1>Every stock, at a glance<span>.</span></h1></div><span>Prices and returns are measured against the previous close</span></div>
      <section className="wall-grid" aria-label="All listed stocks">{stocks.map(stock => <article className="wall-stock" key={stock.symbol}><div className="wall-stock-top"><Logo stock={stock} compact/><span><b>{stock.symbol}</b><small>{stock.name}</small></span></div><div className="wall-price"><strong>{money(stock.price, stock.price < 100 ? 2 : 0)}</strong><span className={changePct(stock) >= 0 ? "positive" : "negative"}>{signReturn(changePct(stock))}</span></div></article>)}</section>
    </section>
    <section className="wall-learning"><div className="wall-section-heading"><div><span className="eyebrow">QUICK TAKEAWAYS · BATCH {String(world?.batch || 1).padStart(2, "0")}</span><h2>What the market showed</h2></div><span>Observed moves, without guessing what caused them</span></div><div className="wall-learning-grid">{learningNotes.map((note, index) => <article key={index}><i>{String(index + 1).padStart(2, "0")}</i><p>{note}</p></article>)}</div></section>
    <section className="wall-news-archive"><div className="wall-section-heading"><div><span className="eyebrow">BATCH {String(world?.batch || 1).padStart(2, "0")} · FULL NEWS FEED</span><h2>Every headline this batch</h2></div><span>{batchHeadlines.length} headlines · newest first</span></div><div className="wall-news-list">{batchHeadlines.length ? batchHeadlines.map((news, index) => <article className={index === 0 ? "current" : ""} key={news.id}><div><span className={`news-tag ${news.type}`}>{news.type}</span><small>{newsScope(news)}</small><time>{new Date(news.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</time></div><strong>{news.headline}</strong></article>) : <div className="wall-news-empty">No headlines have been released in this batch yet.</div>}</div></section>
    <footer className="wall-footer"><span>{preview && uiVariant && <><a href="/ui-preview">PREVIEW V{uiVariant.toUpperCase()} · COMPARE ALL</a> · </>}FICTIONAL PRICES · LEARNING EXPERIENCE · NO REAL TRADES</span><span>{stocks.length || 28} LISTED COMPANIES</span></footer>
  </main>;
}
