"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Mode, Player, PublicWorld, Stock } from "@/game/types";
import { equity, performance, shortValue } from "@/game/engine";
import { Logo } from "@/components/trader-parts";

type Props = { mode?: Mode; audienceOnly?: boolean };
type TradeSide = "Buy" | "Sell" | "Short";
const money = (n: number, digits = 2) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const changePct = (s: Stock) => (s.price / s.previousClose - 1) * 100;
const initialSession = () => {
  if (typeof window === "undefined") return "";
  let saved = window.localStorage.getItem("ds-device");
  if (!saved) { saved = crypto.randomUUID(); window.localStorage.setItem("ds-device", saved); }
  return saved;
};

function MiniChart({ stock }: { stock: Stock }) {
  const values = stock.trend?.length ? stock.trend : stock.candles.slice(-18).map(c => c.close);
  if (values.length < 2) return <svg className="mini-chart" viewBox="0 0 100 28" aria-hidden="true"><line x1="0" x2="100" y1="14" y2="14" stroke="var(--line)" /></svg>;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const points = values.map((v, i) => `${i * 100 / (values.length - 1)},${25 - ((v - lo) / span) * 21}`).join(" ");
  const up = values.at(-1)! >= values[0];
  return <svg className="mini-chart" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke={up ? "#1e9173" : "#d75a4e"} strokeWidth="1.7" vectorEffect="non-scaling-stroke" /></svg>;
}

function MainChart({ stock, kind }: { stock: Stock; kind: "Line" | "Candles" }) {
  const data = stock.candles.slice(-36);
  if (data.length < 2) return <div className="chart-loading">Building the first market bars…</div>;
  const w = 760, h = 250, pad = { l: 8, r: 68, t: 15, b: 24 };
  const values = data.flatMap(c => [c.high, c.low]);
  const min = Math.min(...values) * .9985, max = Math.max(...values) * 1.0015;
  const x = (i: number) => pad.l + i * (w - pad.l - pad.r) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (max - v) * (h - pad.t - pad.b) / (max - min || 1);
  const path = data.map((c, i) => `${i ? "L" : "M"}${x(i)},${y(c.close)}`).join(" ");
  const ticks = [0, .25, .5, .75, 1].map(f => max - f * (max - min));
  return <svg className="price-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${stock.name} ${kind.toLowerCase()} price chart`}>
    <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9ee4cc" stopOpacity=".28"/><stop offset="1" stopColor="#9ee4cc" stopOpacity="0"/></linearGradient></defs>
    {ticks.map((v, i) => <g key={i}><line x1={pad.l} x2={w - pad.r + 8} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 5"/><text x={w - pad.r + 14} y={y(v) + 4} fill="var(--muted)" fontSize="11">{v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</text></g>)}
    {kind === "Line" ? <><path d={`${path} L${x(data.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`} fill="url(#chartFill)"/><path d={path} fill="none" stroke="#087c66" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/></> : data.map((c, i) => {
      const color = c.close >= c.open ? "#168b70" : "#d75a4e";
      const bodyTop = Math.min(y(c.open), y(c.close)), bodyHeight = Math.max(2, Math.abs(y(c.open) - y(c.close)));
      return <g key={c.time}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.2"/><rect x={x(i) - 3.2} y={bodyTop} width="6.4" height={bodyHeight} rx="1" fill={color}/></g>;
    })}
    <circle cx={x(data.length - 1)} cy={y(stock.price)} r="3.5" fill="#1247d2"/><line x1={x(data.length - 1) + 8} x2={w - pad.r + 4} y1={y(stock.price)} y2={y(stock.price)} stroke="#1247d2" strokeDasharray="3 3"/>
    <text x={pad.l} y={h - 4} fill="var(--muted)" fontSize="10">{new Date(data[0].time).toLocaleTimeString("en-IN", { minute: "2-digit", second: "2-digit" })}</text>
    <text x={w - pad.r - 20} y={h - 4} fill="var(--muted)" fontSize="10">LIVE</text>
  </svg>;
}

function Header({ world, player, onTheme }: { world: PublicWorld | null; player: Player | null; onTheme: () => void }) {
  const value = world && player ? equity(world as never, player) : 1_000_000;
  const pnl = value - (player?.initialCash ?? 1_000_000);
  return <header className="topbar">
    <div className="topbar-brand"><span className="pulse-dot"/> DALAA<span>L</span> STREET</div>
    <div className="market-ribbon"><span className="ribbon-label">DALAAL-10</span><strong>{world?.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "10,000.00"}</strong><span className={world && world.indexChange >= 0 ? "positive" : "negative"}>{world ? `${world.indexChange >= 0 ? "+" : ""}${world.indexChange.toFixed(2)}%` : "0.00%"}</span></div>
    <div className="topbar-metrics"><div><small>SESSION</small><b className="timer-value">{world?.mode === "test" ? "AUTONOMOUS" : world ? fmtTime(world.remaining) : "08:00"}</b></div><div><small>CASH</small><b>{money(player?.cash ?? 1_000_000, 0)}</b></div><div><small>PORTFOLIO</small><b>{money(value, 0)}</b></div><div><small>DAY P&amp;L</small><b className={pnl >= 0 ? "positive" : "negative"}>{pnl >= 0 ? "+" : ""}{money(pnl, 0)}</b></div></div>
    <button className="theme-button" onClick={onTheme} aria-label="Toggle theme">◐</button>
  </header>;
}
function fmtTime(seconds: number) { const s = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }

export function Trader({ mode = "live", audienceOnly = false }: Props) {
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
  const [theme, setTheme] = useState("light");
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const lastNews = useRef<string | null>(null);
  const inFlight = useRef(false);
  const submitting = useRef(false);
  const readController = useRef<AbortController | null>(null);
  const mutationVersion = useRef(0);
  const failures = useRef(0);
  const nextSyncAt = useRef(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const newsTimeout = useRef<number | null>(null);

  useEffect(() => { if (!audienceOnly) setSessionId(initialSession()); }, [audienceOnly]);
  const sync = useCallback(async () => {
    if ((!audienceOnly && !sessionId) || inFlight.current || submitting.current || document.hidden || !navigator.onLine || Date.now() < nextSyncAt.current) return;
    inFlight.current = true;
    const controller = new AbortController();
    readController.current = controller;
    const revision = mutationVersion.current;
    const requestedStock = selectedRef.current;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`/api/game?mode=${mode}&selected=${encodeURIComponent(requestedStock)}${sessionId ? `&session=${encodeURIComponent(sessionId)}` : ""}`, { cache: "no-store", signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Market data is unavailable.");
      if (revision !== mutationVersion.current || requestedStock !== selectedRef.current) return;
      failures.current = 0;
      setWorld(data);
      const headline = data.latestNewsId;
      if (headline && headline !== lastNews.current) {
        lastNews.current = headline;
        if (!audienceOnly) { setBreaking(true); if (newsTimeout.current) window.clearTimeout(newsTimeout.current); newsTimeout.current = window.setTimeout(() => setBreaking(false), 30_000); }
      }
    } catch (err) { if (!controller.signal.aborted) { failures.current += 1; nextSyncAt.current = Date.now() + Math.min(15000, 1000 * 2 ** failures.current); if (failures.current === 1) setToast(err instanceof Error ? err.message : "Reconnecting to the market…"); } }
    finally { clearTimeout(timeout); if (readController.current === controller) { inFlight.current = false; readController.current = null; } }
  }, [sessionId, mode, audienceOnly]);
  useEffect(() => { if (!sessionId && !audienceOnly) return; void sync(); const timer = window.setInterval(sync, world?.controls.tickRate === .5 ? 500 : 1000); return () => window.clearInterval(timer); }, [sessionId, audienceOnly, sync, world?.controls.tickRate]);
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
  const blocked = busy || !player || player.ended || (world?.mode === "live" && (world.status !== "live" || world.controls.paused || player.paused || !player.included));

  useEffect(() => { if (toast) { const t = window.setTimeout(() => setToast(""), 3600); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => () => { if (newsTimeout.current) window.clearTimeout(newsTimeout.current); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; return () => { delete document.documentElement.dataset.theme; }; }, [theme]);
  useEffect(() => { if (world?.mode === "live" && world.status === "closed" && player?.ended) setView("report"); }, [world?.mode, world?.status, player?.ended]);

  async function send(action: string, payload: Record<string, unknown> = {}) {
    if (!sessionId || submitting.current) return;
    submitting.current = true;
    mutationVersion.current += 1;
    readController.current?.abort();
    setBusy(true);
    try {
      const res = await fetch("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, sessionId, action, selectedStock: selectedRef.current, requestId: crypto.randomUUID(), ...payload }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trade could not be completed.");
      setWorld(data);
      if (action === "trade") setToast(data.result?.note ? `Trade complete · ${data.result.note}` : `${payload.side} order executed · ${payload.quantity} ${payload.symbol}`);
      else if (action === "end") setView("report");
      return data;
    } catch (err) { setToast(err instanceof Error ? err.message : "The market could not complete that action."); }
    finally { submitting.current = false; nextSyncAt.current = Date.now() + 500; setBusy(false); }
  }

  if (audienceOnly) return <Audience world={world} />;
  const report = world && player ? performance(world as never, player) : null;
  const isTest = mode === "test";
  const activeNews = world?.headlines.find(n => n.id === world.latestNewsId);
  return <div className="terminal">
    <Header world={world} player={player} onTheme={() => setTheme(theme === "light" ? "dark" : "light")} />
    <nav className="terminal-tabs" aria-label="Primary navigation">
      {([ ["markets", "Markets"], ["portfolio", "Portfolio"], ["news", "News desk"] ] as const).map(([key, label]) => <button key={key} onClick={() => setView(key)} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""}>{label}{key === "news" && Boolean(world?.headlines.length) && <span>{world!.headlines.length}</span>}</button>)}
      <span className="terminal-context">{isTest ? "TEST MARKET" : `BATCH ${String(world?.batch || 1).padStart(2, "0")}`}</span>
    </nav>

    <main className={`workspace ${view === "markets" ? "workspace-markets" : "workspace-wide"}`}>
      {isTest && <div className="autonomous-band"><span className="live-dot"/> TEST MARKET · ISOLATED SIMULATION <span>Market state advances from elapsed time, even between visits.</span></div>}
      {world?.mode === "live" && world.status !== "live" && view === "markets" && <div className="market-state-banner"><span className="state-orb"/>{world.status === "countdown" ? `The market opens in ${Math.max(0, Math.ceil((world.startedAt - Date.now()) / 1000))} seconds` : world.status === "closed" ? "The batch has ended" : "The market is ready"}<span>{world.status === "countdown" ? "The shared market is starting on every device." : world.status === "closed" ? "Review your report to return to the ready state." : "The host will start the shared batch shortly."}</span></div>}
      {view === "markets" && stock && <>
        {breaking && activeNews && <div className="breaking-alert" role="status"><div className="breaking-mark">!</div><div><small>{activeNews.type.toUpperCase()} NEWS · {activeNews.sector} · JUST NOW</small><strong>{activeNews.headline}</strong></div><button onClick={() => setBreaking(false)} aria-label="Minimize headline">×</button><span className="breaking-progress"/></div>}
        <div className="trading-grid">
          <section className="watch-area">
            <div className="watch-controls"><div className="sector-scroll">{sectors.map(s => <button key={s} className={`filter-chip ${sector === s ? "active" : ""}`} onClick={() => setSector(s)}>{s}</button>)}</div><label className="search-field"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search companies" aria-label="Search stocks"/><kbd>⌘ K</kbd></label></div>
            <div className="stock-grid">{shownStocks.map(s => <button key={s.symbol} className={`stock-card ${selected === s.symbol ? "selected" : ""}`} onClick={() => { setSelected(s.symbol); setQuantity("10"); setAmount(""); }}>
              <div className="stock-card-top"><Logo stock={s}/><div className="stock-id"><strong>{s.symbol}</strong><span>{s.name}</span></div></div>
              <div className="stock-card-bottom"><strong>{money(s.price)}</strong><span className={`stock-change ${changePct(s) >= 0 ? "positive" : "negative"}`}>{changePct(s) >= 0 ? "↗" : "↘"} {changePct(s) >= 0 ? "+" : ""}{changePct(s).toFixed(2)}%</span></div>
              <MiniChart stock={s}/>
              <div className="stock-card-foot"><span>{s.sector}</span><span>{(player?.holdings[s.symbol]?.qty ?? 0) > 0 ? `${player!.holdings[s.symbol].qty} shares` : (player?.shorts[s.symbol]?.qty ?? 0) > 0 ? `${player!.shorts[s.symbol].qty} short` : "No position"}</span></div>
            </button>)}</div>
            {!shownStocks.length && <div className="empty-state">No companies match that search.</div>}
            {activeNews && <div className="latest-brief"><span className="brief-icon">◉</span><span><small>LATEST BULLETIN · {activeNews.sector}</small><b>{activeNews.headline}</b></span><button onClick={() => setView("news")}>News desk →</button></div>}
          </section>

          <aside className="trade-column">
            <div className="focus-card"><div className="focus-company"><Logo stock={stock}/><span><small>{stock.sector} · NSE</small><b>{stock.name}</b></span><button className="ellipsis" onClick={() => setDrawer(true)} aria-label="Open news">···</button></div>
              <div className="focus-price-row"><strong>{money(stock.price)}</strong><span className={`stock-change ${changePct(stock) >= 0 ? "positive" : "negative"}`}>{changePct(stock) >= 0 ? "+" : ""}{changePct(stock).toFixed(2)}%</span><small>SESSION</small></div>
              <MainChart stock={stock} kind={chartType}/>
              <div className="chart-toolbar"><span>INTRADAY <b>·</b> {world?.controls.tickRate ?? 1} SEC</span><div className="chart-toggle">{(["Line", "Candles"] as const).map(t => <button key={t} onClick={() => setChartType(t)} className={chartType === t ? "active" : ""}>{t === "Line" ? "⌁" : "▥"} {t}</button>)}</div></div>
              <div className="chart-foot"><span><i/> Open <b>{money(stock.candles[0]?.open ?? stock.price)}</b></span><span>High <b>{money(Math.max(stock.price, ...stock.candles.slice(-36).map(c => c.high)))}</b></span><span>Low <b>{money(Math.min(stock.price, ...stock.candles.slice(-36).map(c => c.low)))}</b></span></div>
            </div>
            <div className="order-card"><div className="order-title"><div><span className="eyebrow">ORDER TICKET</span><h2>Place a trade</h2></div><span className="order-live"><i/> LIVE PRICE</span></div>
              <div className="side-switch">{(["Buy", "Sell", "Short"] as const).map(t => <button key={t} onClick={() => setSide(t)} className={`${side === t ? `active ${t.toLowerCase()}` : ""}`} disabled={t === "Sell" && !ownedQty}>{t}</button>)}</div>
              {side === "Sell" && <div className="context-hint">You hold {ownedQty} {selected} shares. Sell closes owned shares only.</div>}
              {side === "Short" && <div className="context-hint short-hint">Short exposure is capped at 30% of your starting portfolio. A buy covers open shorts first.</div>}
              {side === "Buy" && shortQty > 0 && <div className="context-hint cover-hint">Your buy will cover up to {shortQty} open short shares first.</div>}
              <div className="quantity-row"><label><span>QUANTITY</span><div><input inputMode="numeric" type="number" min="1" step="1" value={quantity} onChange={e => { setQuantity(e.target.value); setAmount(""); }}/><span>SHARES</span></div></label><label><span>ORDER VALUE</span><div><span className="currency-prefix">₹</span><input inputMode="decimal" type="number" min="0" step="1" value={amount || (calculatedAmount ? calculatedAmount.toFixed(2) : "")} onChange={e => { setAmount(e.target.value); setQuantity(String(Math.floor((Number(e.target.value) || 0) / stock.price))); }}/></div></label></div>
              <div className="order-estimate"><span>Est. order value</span><b>{money(calculatedAmount)}</b></div>
              <button className={`execute-button ${side.toLowerCase()}`} disabled={blocked || qty < 1 || (side === "Sell" && qty > ownedQty)} onClick={() => void send("trade", { side, symbol: stock.symbol, quantity: qty })}>{busy ? "Submitting order…" : blocked ? world?.status === "closed" ? "Market closed" : "Waiting for the batch" : `${side} ${qty || "—"} ${stock.symbol}`}</button>
              <div className="available-row"><span>Available cash</span><b>{money(player?.cash ?? 1_000_000, 0)}</b></div>
            </div>
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
        <div className="portfolio-summary"><Metric label="TOTAL EQUITY" value={money(world && player ? equity(world as never, player) : 1_000_000, 0)} note="Cash + long shares − short liabilities"/><Metric label="AVAILABLE CASH" value={money(player?.cash ?? 1_000_000, 0)} note="Includes proceeds from open shorts"/><Metric label="OPEN LONGS" value={money(totalLong, 0)} note={`${invested.length} company positions`}/><Metric label="SHORT EXPOSURE" value={money(totalShort, 0)} note="Marked to current prices"/></div>
        <div className="page-tabs"><button className={menu ? "" : "active"} onClick={() => setMenu(false)}>Holdings <span>{invested.length + shorts.length}</span></button><button className={menu ? "active" : ""} onClick={() => setMenu(true)}>History <span>{player?.history.length ?? 0}</span></button></div>
        {!menu ? <div className="table-card">{invested.length + shorts.length === 0 ? <div className="empty-state roomy"><span>▧</span><b>No holdings yet</b><p>Choose a company from Markets to place your first order.</p><button className="outline-button" onClick={() => setView("markets")}>Browse markets</button></div> : <table><thead><tr><th>COMPANY</th><th>POSITION</th><th>AVG. PRICE</th><th>LAST PRICE</th><th>MARKET VALUE</th><th>UNREALISED P&amp;L</th><th>ACTION</th></tr></thead><tbody>{[...invested.map(([symbol, p]) => ({ symbol, ...p, short: false })), ...shorts.map(([symbol, p]) => ({ symbol, ...p, short: true }))].map(p => {const s = world?.stocks.find(x => x.symbol === p.symbol); const mark = s?.price ?? 0; const pl = (p.short ? p.avg - mark : mark - p.avg) * p.qty;return <tr key={p.symbol} onClick={() => {setSelected(p.symbol);setView("markets");}}><td><span className="table-company"><Logo stock={s!} compact/><span><b>{s?.name}</b><small>{p.symbol} · {s?.sector}</small></span></span></td><td><span className={`position-pill ${p.short ? "short" : "long"}`}>{p.short ? "Short" : "Long"} · {p.qty}</span></td><td>{money(p.avg)}</td><td>{money(mark)}</td><td>{money(mark * p.qty, 0)}</td><td className={pl >= 0 ? "positive" : "negative"}>{pl >= 0 ? "+" : ""}{money(pl, 0)}</td><td><button className={`position-close ${p.short ? "cover" : "sell"}`} disabled={blocked} onClick={e => { e.stopPropagation(); void send("trade", { side: p.short ? "Buy" : "Sell", symbol: p.symbol, quantity: p.qty }); }}>{busy ? "Submitting…" : p.short ? "Cover short" : "Sell holding"}</button></td></tr>;})}</tbody></table>}</div> : <div className="table-card">{!player?.history.length ? <div className="empty-state roomy"><span>↻</span><b>No trades yet</b><p>Every order and short-cover is recorded here.</p></div> : <table><thead><tr><th>TIME</th><th>COMPANY</th><th>ORDER</th><th>QUANTITY</th><th>EXECUTION</th><th>REALIZED P&amp;L</th></tr></thead><tbody>{player.history.map(t => {const s = world?.stocks.find(x => x.symbol === t.symbol);return <tr key={t.id}><td>{new Date(t.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td><td><span className="table-company"><Logo stock={s!} compact/><span><b>{s?.name ?? t.symbol}</b><small>{t.symbol}</small></span></span></td><td><span className={`position-pill ${t.side === "Short" ? "short" : t.side === "Sell" || t.side === "Auto-cover" ? "sell" : "long"}`}>{t.side}</span></td><td>{t.qty}</td><td>{money(t.price)}</td><td className={t.realized >= 0 ? "positive" : "negative"}>{t.realized ? `${t.realized > 0 ? "+" : ""}${money(t.realized, 0)}` : "—"}</td></tr>;})}</tbody></table>}</div>}</section>}

      {view === "news" && <section className="wide-page"><div className="section-heading"><div><div className="eyebrow">DALAA<span>L</span> STREET / NEWS</div><h1>Market news<span className="heading-period">.</span></h1><p>Company and sector bulletins shape the fictional market through the same price model as trading.</p></div></div><div className="news-list">{world?.headlines.map((n, i) => <article className={`news-item ${i === 0 ? "newest" : ""}`} key={n.id}><div className="news-meta"><span className={`news-tag ${n.type}`}>{n.type}</span><span>{n.sector === "ALL" ? "Market-wide" : n.sector}</span><time>{new Date(n.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</time></div><h2>{n.headline}</h2><span className={n.direction > 0 ? "positive" : "negative"}>{n.direction > 0 ? "↗" : "↘"} {n.direction > 0 ? "Positive" : "Negative"} sentiment · Severity {n.severity.toFixed(1)}</span></article>) ?? null}{!world?.headlines.length && <div className="empty-state">No bulletins yet. Headlines triggered during this batch will appear here.</div>}</div></section>}

      {view === "report" && report && <section className="results-view"><div className="results-heading"><span className="eyebrow">SESSION COMPLETE · BATCH {world?.batch}</span><h1>That’s a wrap<span>.</span></h1><p>Here’s what your decisions added up to. This is a fictional learning simulation, not investment advice.</p></div><div className="results-value"><small>FINAL PORTFOLIO VALUE</small><strong>{money(report.value, 0)}</strong><span className={report.pnl >= 0 ? "positive" : "negative"}>{report.pnl >= 0 ? "+" : ""}{money(report.pnl, 0)} · {report.returnPct >= 0 ? "+" : ""}{report.returnPct.toFixed(2)}%</span></div><div className="portfolio-summary report-metrics"><Metric label="AVAILABLE CASH" value={money(report.cash, 0)}/><Metric label="COMPLETED TRADES" value={String(report.tradeCount)}/><Metric label="WIN / LOSS" value={`${report.winners} / ${report.losers}`}/><Metric label="DIVERSIFICATION" value={`${report.sectors} sectors`}/></div>
        <div className="report-panels"><div className="report-panel"><span className="eyebrow">YOUR LEARNING NOTES</span>{report.lessons.map((l, i) => <p key={i}><i>{String(i + 1).padStart(2, "0")}</i>{l}</p>)}</div><div className="report-panel"><span className="eyebrow">EARNED BADGES · {report.badges.length}</span><div className="badge-grid">{report.badges.length ? report.badges.map(b => <span className="achievement" key={b.name}><i>✳</i><b>{b.name}</b><small>{b.detail}</small></span>) : <p>Keep learning—badges appear when your actions earn them.</p>}</div></div></div><button className="execute-button report-ready" onClick={() => { const next = crypto.randomUUID(); localStorage.setItem("ds-device", next); setSessionId(next); setView("markets"); setToast("You’re ready for the next batch."); }}>Return to ready state <span>→</span></button>
      </section>}
      <footer className="workspace-footer"><span>SIMULATED MARKET · FICTIONAL PRICES · NO REAL TRADES</span><span>© PULSE / DALAA<span>L</span> STREET</span></footer>
    </main>
    {!audienceOnly && world?.status === "live" && player && !player.ended && <button className="end-session" onClick={() => { if (window.confirm("End your trading session now? Open shorts will be settled at the current simulated price.")) void send("end"); }}>Finish session <span>↗</span></button>}
    {toast && <div className="toast-message" role="status"><span>✓</span>{toast}<button onClick={() => setToast("")}>×</button></div>}
    {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)}><section className="news-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">MARKET BULLETINS</span><h2>News desk</h2></div><button onClick={() => setDrawer(false)}>×</button></div>{world?.headlines.slice(0, 12).map(n => <article key={n.id}><small className={`news-tag ${n.type}`}>{n.type}</small><b>{n.headline}</b><span>{n.sector}</span></article>)}</section></div>}
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) { return <div className="summary-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>; }

function Audience({ world }: { world: PublicWorld | null }) {
  const [fullscreen, setFullscreen] = useState(false);
  const latest = world?.headlines.find(n => n.id === world.latestNewsId);
  const movers = [...(world?.stocks ?? [])].sort((a, b) => Math.abs(changePct(b)) - Math.abs(changePct(a))).slice(0, 3);
  useEffect(() => { const done = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", done); return () => document.removeEventListener("fullscreenchange", done); }, []);
  return <main className="audience-wall">
    <header className="wall-header"><div className="wall-brand"><span className="brand-glyph">D</span><span><small>PRATIBIMB · INTERACTIVE MARKET</small><b>DALAA<span>L</span> STREET</b></span></div><div className="wall-index"><small>DALAAL-10</small><strong>{world?.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "10,000.00"}</strong><span className={world && world.indexChange >= 0 ? "positive" : "negative"}>{world ? `${world.indexChange >= 0 ? "+" : ""}${world.indexChange.toFixed(2)}%` : "0.00%"}</span></div><div className="wall-status"><span className="live-dot"/>{world?.status === "live" && !world.controls.paused ? "MARKET LIVE" : world?.status === "closed" ? "MARKET CLOSED" : "MARKET READY"}<b>{world?.status === "live" ? fmtTime(world.remaining) : `BATCH ${String(world?.batch || 1).padStart(2, "0")}`}</b></div><button className="wall-fullscreen" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen()}>{fullscreen ? "Exit full screen" : "Full screen"} ↗</button></header>
    {world?.status === "closed" ? <section className="wall-close"><span className="eyebrow">BATCH {world.batch} · MARKET CLOSE</span><h1>That’s a wrap.</h1><div className="close-index">{world.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className={world.indexChange >= 0 ? "positive" : "negative"}>{world.indexChange >= 0 ? "+" : ""}{world.indexChange.toFixed(2)}%</span></div><div className="mover-row">{movers.map(s => <span key={s.symbol}><b>{s.symbol}</b><small>{changePct(s) >= 0 ? "+" : ""}{changePct(s).toFixed(2)}%</small></span>)}</div><p>{latest?.headline ?? "The batch has closed. Thank you for trading."}</p></section> : <>
      <div className="wall-news"><div className={`wall-news-label ${latest?.type === "major" ? "major" : ""}`}>{latest?.type === "major" ? "MAJOR NEWS" : "LATEST NEWS"}</div><strong>{latest?.headline ?? "The opening bell is close. Markets are ready for the next batch."}</strong><small>{latest ? latest.sector.toUpperCase() : "DALAA L STREET"}</small></div>
      <section className="wall-grid">{world?.stocks.map(s => <article className="wall-stock" key={s.symbol}><div className="wall-stock-top"><Logo stock={s} compact/><span><b>{s.symbol}</b><small>{s.name}</small></span></div><div className="wall-price"><strong>{money(s.price, s.price < 100 ? 2 : 0)}</strong><span className={changePct(s) >= 0 ? "positive" : "negative"}>{changePct(s) >= 0 ? "+" : ""}{changePct(s).toFixed(2)}%</span></div></article>)}</section>
    </>}
    <footer className="wall-footer"><span>FICTIONAL PRICES · LEARNING EXPERIENCE · NO REAL TRADES</span><span>{world?.participants ?? 0} PARTICIPANTS <i/> {world?.stocks.length ?? 28} LISTED COMPANIES</span></footer>
  </main>;
}
