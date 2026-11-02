"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PublicLeaderboardEntry, PublicNews, PublicWorld, Stock } from "@/game/types";
import { DalaalMark, DalaalWordmark, Logo } from "@/components/trader-parts";
import { changePct, fmtTime, latestNewsSet, money, smoothPath } from "./market-parts";

/*
  Audience stage for every version: a 100" smart board read from 12–15 feet, and a 24" monitor.
  Behaviour is unchanged from the original wall; this file adds presentation only: short brand names,
  price-tick flashes, filled sparklines, a clock bar, a price tape, the countdown scene, gliding
  standings and a short celebration at the closing bell.
  The leaderboard ranks only terminals that have bought or shorted at least once.
*/

const pad2 = (n: number) => String(n).padStart(2, "0");
const signedPct = (value: number) => Math.abs(value) < .005 ? "0.00%" : `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
const signedMoney = (value: number) => `${value >= 0 ? "+" : "−"}${money(Math.abs(value), 0)}`;
const STATUS_LABEL: Record<PublicLeaderboardEntry["status"], string> = { live: "Trading", paused: "Paused", ready: "Ready", finished: "Finished", offline: "Offline" };

/* ---------- Market bells (synthesised, no audio files) ---------- */

type BellKind = "open" | "close";
function strike(ctx: AudioContext, out: AudioNode, at: number, base: number, level: number, decay: number) {
  // Inharmonic partials give a bell rather than a beep.
  const partials: [number, number][] = [[1, 1], [2.01, .55], [2.76, .5], [4.07, .28], [5.4, .18], [6.8, .1]];
  for (const [ratio, amp] of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = base * ratio;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level * amp, at + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, at + decay / Math.sqrt(ratio));
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + decay + .1);
  }
}
function ringBell(ctx: AudioContext, kind: BellKind) {
  const master = ctx.createGain();
  master.gain.value = .9;
  const limiter = ctx.createDynamicsCompressor();
  master.connect(limiter).connect(ctx.destination);
  const now = ctx.currentTime + .05;
  if (kind === "open") {
    // Opening bell: a bright, rapid ring for about three seconds.
    for (let i = 0; i < 26; i++) strike(ctx, master, now + i * .11, 1180, i === 0 ? .3 : .17, 1.4);
  } else {
    // Closing bell: three slow, deep strikes.
    for (let i = 0; i < 3; i++) strike(ctx, master, now + i * 1.15, 440, .34, 3.2);
  }
}
function useMarketBells(world: PublicWorld | null, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const previous = useRef<{ batch: number; status: PublicWorld["status"] } | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const context = () => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    return ctxRef.current;
  };
  // Browsers only allow sound after a tap or key press on the page.
  useEffect(() => {
    const unlock = () => { const ctx = context(); if (ctx && ctx.state !== "running") void ctx.resume().then(() => setNeedsTap(false)); else setNeedsTap(false); };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);
  useEffect(() => {
    if (!enabled) { setNeedsTap(false); return; }
    const ctx = context();
    if (ctx && ctx.state !== "running") setNeedsTap(true);
  }, [enabled]);
  useEffect(() => {
    if (!world) return;
    const before = previous.current;
    previous.current = { batch: world.batch, status: world.status };
    if (!before || !enabled) return;
    const opened = world.status === "live" && (before.status === "countdown" || before.status === "ready" || before.status === "closed" || before.batch !== world.batch);
    const closed = world.status === "closed" && before.status === "live" && before.batch === world.batch;
    if (!opened && !closed) return;
    const ctx = context();
    if (!ctx) return;
    const play = () => ringBell(ctx, opened ? "open" : "close");
    if (ctx.state === "running") play(); else void ctx.resume().then(() => { if (ctx.state === "running") play(); else setNeedsTap(true); });
  }, [world?.status, world?.batch, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return { needsTap, test: (kind: BellKind) => { const ctx = context(); if (ctx) void ctx.resume().then(() => ringBell(ctx, kind)); } };
}

/* ---------- Leaderboard ---------- */

/** Remember recent rank changes so the board can show ▲/▼ for a few seconds. */
function useRankMoves(entries: PublicLeaderboardEntry[]) {
  const last = useRef(new Map<number, number>());
  const [moves, setMoves] = useState<Record<number, { delta: number; until: number }>>({});
  const key = entries.map(entry => `${entry.terminalNumber}:${entry.rank}`).join(",");
  useEffect(() => {
    const now = Date.now();
    const next: Record<number, { delta: number; until: number }> = {};
    for (const entry of entries) {
      const before = last.current.get(entry.terminalNumber);
      if (before !== undefined && before !== entry.rank) next[entry.terminalNumber] = { delta: before - entry.rank, until: now + 9_000 };
    }
    last.current = new Map(entries.map(entry => [entry.terminalNumber, entry.rank]));
    if (Object.keys(next).length) setMoves(current => ({ ...Object.fromEntries(Object.entries(current).filter(([, move]) => move.until > now)), ...next }));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setInterval(() => setMoves(current => {
      const now = Date.now();
      const kept = Object.fromEntries(Object.entries(current).filter(([, move]) => move.until > now));
      return Object.keys(kept).length === Object.keys(current).length ? current : kept;
    }), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return moves;
}

function MoveBadge({ delta }: { delta?: number }) {
  if (!delta) return null;
  return <span className={`stage-move ${delta > 0 ? "up" : "down"}`} aria-label={`${delta > 0 ? "up" : "down"} ${Math.abs(delta)} places`}>{delta > 0 ? "▲" : "▼"}{Math.abs(delta)}</span>;
}

/* ---------- Names the room says out loud ---------- */

const SHORT_NAME: Record<string, string> = {
  RELIANCE: "Reliance", TCS: "TCS", HDFCBANK: "HDFC Bank", INFY: "Infosys", ICICIBANK: "ICICI Bank",
  BHARTIARTL: "Airtel", ITC: "ITC", LT: "L&T", SBIN: "SBI", HINDUNILVR: "HUL", TATAMOTORS: "Tata Motors",
  MARUTI: "Maruti", SUNPHARMA: "Sun Pharma", CIPLA: "Cipla", BAJFINANCE: "Bajaj Fin", AXISBANK: "Axis Bank",
  WIPRO: "Wipro", ADANIPORTS: "Adani Ports", NTPC: "NTPC", ONGC: "ONGC", "M&M": "Mahindra", TITAN: "Titan",
  ULTRACEMCO: "UltraTech", DRREDDY: "Dr Reddy's", APOLLOHOSP: "Apollo",
};
const shortName = (symbol: string) => SHORT_NAME[symbol] ?? symbol;
const scopeText = (news: Pick<PublicNews, "scope" | "symbols" | "sector">) => {
  const scope = news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
  return scope === "economy" ? "Economy · all stocks" : scope === "stock" ? (news.symbols?.map(shortName).join(", ") ?? news.sector) : `${news.sector} sector`;
};

/** Marks a value as having just ticked up or down, for a brief flash. */
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

/* ---------- Standings ---------- */

function Leaderboard({ world, final, onShowMarket }: { world: PublicWorld | null; final: boolean; onShowMarket?: () => void }) {
  const entries = world?.leaderboard ?? [];
  const moves = useRankMoves(entries);
  const rows = useRef(new Map<number, HTMLElement>());
  const tops = useRef(new Map<number, number>());
  const orderKey = entries.map(entry => entry.terminalNumber).join(",");
  // Rows glide from where they were to their new place, so the room can follow who moved.
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<number, number>();
    rows.current.forEach((row, terminal) => {
      const top = row.getBoundingClientRect().top;
      next.set(terminal, top);
      const before = tops.current.get(terminal);
      if (reduce || !tops.current.size) return;
      if (before === undefined) { row.animate([{ opacity: 0, transform: "translateX(28px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "cubic-bezier(.2,.8,.2,1)" }); return; }
      if (Math.abs(before - top) > 1) row.animate([{ transform: `translateY(${before - top}px)`, filter: "brightness(1.35)" }, { transform: "none", filter: "none" }], { duration: 750, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
    tops.current = next;
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const leader = entries[0];
  return <section className={`stage-board${final ? " is-final" : ""}`} aria-label={final ? "Final standings" : "Standings"}>
    <header className="stage-board-head">
      <h2>{final ? "Final standings" : "Standings"}</h2>
      <span className="stage-board-meta">{final ? `Batch ${pad2(world?.batch ?? 1)} · closed` : entries.length ? `${entries.length} ${entries.length === 1 ? "terminal" : "terminals"} trading` : "No trades yet"}</span>
    </header>
    {entries.length === 0 ? <div className="stage-board-empty"><strong>Waiting for the first trade</strong><span>A terminal joins the board with its first buy or short.</span></div> : <>
      <div className="stage-board-cols" aria-hidden="true"><span>Rank</span><span>Terminal</span><span>Portfolio</span><span>Return</span></div>
      <ol className="stage-board-rows" style={{ "--rows": entries.length } as React.CSSProperties}>
        {entries.map((entry, index) => <li key={entry.terminalNumber} ref={element => { if (element) rows.current.set(entry.terminalNumber, element); else rows.current.delete(entry.terminalNumber); }} className={`stage-standing${index === 0 ? " is-leader" : ""} medal-${Math.min(entry.rank, 4)} status-${entry.status}`} style={{ "--i": index } as React.CSSProperties}>
          <b className="stage-standing-rank"><span>{entry.rank}</span></b>
          <span className="stage-standing-name"><strong>{pad2(entry.terminalNumber)}</strong><MoveBadge delta={moves[entry.terminalNumber]?.delta}/>{!final && entry.status !== "live" && <small>{STATUS_LABEL[entry.status]}</small>}</span>
          <span className="stage-standing-value">{money(entry.totalValue, 0)}</span>
          <span className={`stage-standing-return ${entry.pnl > .5 ? "up" : entry.pnl < -.5 ? "down" : "flat"}`}>{signedPct(entry.returnPct)}</span>
        </li>)}
      </ol>
      {final && leader && <p className="stage-winner-line">Terminal {pad2(leader.terminalNumber)} finishes first with {money(leader.totalValue, 0)}, {signedMoney(leader.pnl)} on the starting ₹10,00,000.</p>}
    </>}
    {!final && <p className="stage-board-foot">Every terminal starts with ₹10,00,000 and is ranked by portfolio value.</p>}
    {final && onShowMarket && <button type="button" className="stage-text-button" onClick={onShowMarket}>Show the market</button>}
  </section>;
}

/* ---------- Market board ---------- */

function Spark({ stock }: { stock: Stock }) {
  const values = stock.trend?.length ? stock.trend : stock.candles.slice(-18).map(candle => candle.close);
  if (values.length < 2) return <svg className="stage-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"/>;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const line = smoothPath(values.map((value, i) => ({ x: i * 100 / (values.length - 1), y: 27 - ((value - lo) / span) * 23 })));
  return <svg className="stage-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    <path className="stage-spark-area" d={`${line} L100,30 L0,30 Z`}/>
    <path className="stage-spark-line" d={line} vectorEffect="non-scaling-stroke"/>
  </svg>;
}

function StockTile({ stock, index }: { stock: Stock; index: number }) {
  const move = changePct(stock);
  const tick = useTick(stock.price);
  return <article className={`stage-tile ${move >= 0 ? "is-up" : "is-down"}`} data-tick={tick ?? undefined} style={{ "--i": index } as React.CSSProperties} title={stock.name}>
    <div className="stage-tile-top"><Logo stock={stock} compact/><b>{shortName(stock.symbol)}</b></div>
    <div className="stage-tile-price"><strong>{money(stock.price, stock.price < 100 ? 2 : 0)}</strong><span>{move >= 0 ? "▲" : "▼"}{Math.abs(move).toFixed(2)}%</span></div>
    <Spark stock={stock}/>
  </article>;
}

/** A tape of every price along the foot of the screen, like a business channel. */
function Ticker({ stocks, preview }: { stocks: Stock[]; preview?: boolean }) {
  const run = (copy: number) => <span className="stage-ticker-run" aria-hidden={copy === 1 || undefined} key={copy}>{stocks.map(stock => {
    const move = changePct(stock);
    return <span className={`stage-ticker-item ${move >= 0 ? "up" : "down"}`} key={stock.symbol}><b>{shortName(stock.symbol)}</b>{money(stock.price, stock.price < 100 ? 2 : 0)}<em>{move >= 0 ? "▲" : "▼"}{Math.abs(move).toFixed(2)}%</em></span>;
  })}</span>;
  return <footer className="stage-ticker">
    <span className="stage-ticker-label"><i aria-hidden="true"/>Live prices</span>
    <div className="stage-ticker-window">{stocks.length > 0 && <div className="stage-ticker-track">{run(0)}{run(1)}</div>}</div>
    <span className="stage-foot">{preview && <><a href="/ui-preview">Preview: compare all versions</a> · </>}Fictional prices, no real money</span>
  </footer>;
}

/* ---------- Opening countdown: a market building itself behind the number ---------- */

const CANDLES = Array.from({ length: 28 }, (_, i) => {
  const close = 22 + i * 2.35 + Math.sin(i * 1.9) * 6 + (i % 6 === 4 ? -7 : 0);
  const open = i === 0 ? 20 : 22 + (i - 1) * 2.35 + Math.sin((i - 1) * 1.9) * 6 + ((i - 1) % 6 === 4 ? -7 : 0);
  return { open, close, high: Math.max(open, close) + 3 + (i % 3), low: Math.min(open, close) - 3 - (i % 2) * 2 };
});
const CANDLE_LINE = smoothPath(CANDLES.map((candle, i) => ({ x: 18 + i * 35, y: 300 - candle.close * 3.4 })));
const CONFETTI = Array.from({ length: 46 }, (_, i) => ({ x: (i * 37) % 100, delay: (i % 9) * .16, drift: ((i * 53) % 40) - 20, spin: 280 + (i * 71) % 540, size: 8 + (i * 13) % 10, tone: i % 3 }));

function CountdownScene({ seconds, variant }: { seconds: number; variant: string }) {
  return <div className={`stage-countdown${seconds === 0 ? " is-go" : ""}`} role="status" aria-live="assertive">
    <div className="cd-scene" aria-hidden="true">
      <svg className="cd-chart" viewBox="0 0 1000 320" preserveAspectRatio="xMidYMax slice">
        {CANDLES.map((candle, i) => {
          const x = 18 + i * 35, top = 300 - Math.max(candle.open, candle.close) * 3.4, bottom = 300 - Math.min(candle.open, candle.close) * 3.4;
          return <g key={i} className={candle.close >= candle.open ? "cd-candle up" : "cd-candle down"} style={{ "--d": `${i * 120}ms` } as React.CSSProperties}>
            <line x1={x} x2={x} y1={300 - candle.high * 3.4} y2={300 - candle.low * 3.4}/>
            <rect x={x - 9} y={top} width="18" height={Math.max(4, bottom - top)} rx="2"/>
          </g>;
        })}
        <path className="cd-line" d={CANDLE_LINE} pathLength={1}/>
      </svg>
      {variant === "orbit" && <div className="cd-motif cd-orbit"><i/><i/><i/></div>}
      {variant === "gallery" && <div className="cd-motif cd-waves"><i/><i/><i/></div>}
      {variant === "broadcast" && <div className="cd-motif cd-scan"><i/></div>}
      {variant === "conservatory" && <div className="cd-motif cd-vinyl"><i/></div>}
      {variant === "tangram" && <div className="cd-motif cd-tangram"><i/><i/><i/><i/><i/></div>}
      {variant === "arcade" && <div className="cd-motif cd-beads"><i/><i/><i/><i/><i/><i/></div>}
      <i className="cd-pulse" key={`p${seconds}`}/>
      <i className="cd-pulse late" key={`q${seconds}`}/>
    </div>
    <div className="cd-dial">
      <svg className="cd-ring" viewBox="0 0 100 100" key={`r${seconds}`} aria-hidden="true"><circle className="cd-ring-track" cx="50" cy="50" r="46"/><circle className="cd-ring-sweep" cx="50" cy="50" r="46" pathLength={1}/></svg>
      <span>Trading opens in</span>
      <strong key={seconds}>{seconds || "GO"}</strong>
    </div>
  </div>;
}

/* ---------- Stage ---------- */

function Icon({ name }: { name: "sound" | "mute" | "moon" | "sun" | "expand" | "shrink" }) {
  const paths: Record<typeof name, string> = {
    sound: "M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z",
    mute: "M4 9v6h4l5 4V5L8 9zm12.6 3 2.7-2.7-1.3-1.3-2.7 2.7-2.7-2.7-1.3 1.3 2.7 2.7-2.7 2.7 1.3 1.3 2.7-2.7 2.7 2.7 1.3-1.3z",
    moon: "M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z",
    sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5 1 3h-2zm0 20-1-3h2zM2 12l3-1v2zm20 0-3 1v-2zM4.9 4.9l2.8 1.4-1.4 1.4zm14.2 14.2-2.8-1.4 1.4-1.4zm0-14.2-1.4 2.8-1.4-1.4zM4.9 19.1l1.4-2.8 1.4 1.4z",
    expand: "M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z",
    shrink: "M8 4h2v6H4V8h4zm6 0h2v4h4v2h-6zM4 14h6v6H8v-4H4zm10 0h6v2h-4v4h-2z",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]}/></svg>;
}


export function AudienceStage({ world, preview, theme, onTheme, variant = "gallery" }: { world: PublicWorld | null; preview?: boolean; theme: "light" | "dark"; onTheme: () => void; variant?: string }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [sound, setSound] = useState(true);
  const [dismissedSet, setDismissedSet] = useState("");
  const [marketAfterClose, setMarketAfterClose] = useState(-1);
  const [clock, setClock] = useState(() => Date.now());
  const bells = useMarketBells(world, sound);
  useEffect(() => { try { const saved = window.localStorage.getItem("ds-audience-sound"); if (saved === "off") setSound(false); } catch {} }, []);
  useEffect(() => { try { window.localStorage.setItem("ds-audience-sound", sound ? "on" : "off"); } catch {} }, [sound]);
  useEffect(() => { const done = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", done); return () => document.removeEventListener("fullscreenchange", done); }, []);
  const counting = world?.status === "countdown";
  useEffect(() => { if (!counting) return; const timer = window.setInterval(() => setClock(Date.now()), 200); return () => window.clearInterval(timer); }, [counting]);
  const indexTick = useTick(world?.index ?? 0);

  const visibleNews = latestNewsSet(world);
  const newsSetKey = `${world?.batch ?? 0}:${visibleNews.map(item => item.id).join(",")}`;
  const showNews = visibleNews.length > 0 && dismissedSet !== newsSetKey;
  const stocks = world?.stocks ?? [];
  const returnPct = world?.indexChange ?? 0;
  const status = world?.status ?? "ready";
  const statusText = status === "live" ? world?.controls.paused ? "Paused" : "Live" : status === "countdown" ? "Starting" : status === "closed" ? "Closed" : "Ready";
  const indexText = world?.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "10,000.00";
  // At the closing bell the leaderboard takes the whole stage until the next batch or a tap on "Show the market".
  const final = status === "closed" && (world?.leaderboard.length ?? 0) > 0 && marketAfterClose !== world?.batch;
  const countdownSeconds = counting && world ? Math.max(0, Math.ceil((world.startedAt - clock) / 1000)) : 0;
  const lowTime = status === "live" && (world?.remaining ?? 999) <= 30;
  const timeLeft = status === "live" && world ? Math.min(1, Math.max(0, world.remaining / (world.duration || 1))) : 0;

  return <main className={`stage stage-${theme} v-${variant}${final ? " is-final" : ""}${showNews ? " has-news" : ""}`} data-status={status}>
    <svg className="stage-defs" aria-hidden="true" focusable="false"><defs>
      <linearGradient id="stage-spark-up" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor: "var(--up)", stopOpacity: .34 }}/><stop offset="1" style={{ stopColor: "var(--up)", stopOpacity: 0 }}/></linearGradient>
      <linearGradient id="stage-spark-down" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor: "var(--down)", stopOpacity: .3 }}/><stop offset="1" style={{ stopColor: "var(--down)", stopOpacity: 0 }}/></linearGradient>
    </defs></svg>
    <header className="stage-head">
      <div className="stage-brand"><span className="stage-mark"><DalaalMark/></span><h1 className="stage-title"><small>Pratibimb live market</small><DalaalWordmark/></h1></div>
      <div className="stage-index" aria-label={`Dalaal-10 index ${indexText}, ${signedPct(returnPct)}`}><span className="stage-index-label">Dalaal-10</span><strong data-tick={indexTick ?? undefined}>{indexText}</strong><b className={returnPct >= 0 ? "up" : "down"}>{returnPct >= 0 ? "▲" : "▼"} {Math.abs(returnPct).toFixed(2)}%</b></div>
      <div className={`stage-status status-${status}${world?.controls.paused ? " is-paused" : ""}`}><i aria-hidden="true"/>{statusText}</div>
      <div className={`stage-clock${lowTime ? " is-low" : ""}`} aria-label="Time left">
        <span>{status === "live" ? fmtTime(world?.remaining ?? 0) : `BATCH ${pad2(world?.batch || 1)}`}</span>
        {status === "live" && <i className="stage-clock-bar" aria-hidden="true" style={{ transform: `scaleX(${timeLeft})` }}/>}
      </div>
      <div className="stage-tools">
        <button type="button" className={`stage-icon${bells.needsTap ? " needs-tap" : ""}`} onClick={() => setSound(value => !value)} aria-pressed={sound} title={sound ? "Bells on" : "Bells off"} aria-label={sound ? "Turn bells off" : "Turn bells on"}><Icon name={sound ? "sound" : "mute"}/></button>
        <button type="button" className="stage-icon" onClick={onTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><Icon name={theme === "light" ? "moon" : "sun"}/></button>
        <button type="button" className="stage-icon" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen()} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"}><Icon name={fullscreen ? "shrink" : "expand"}/></button>
      </div>
    </header>

    <div className="stage-body">
      {!final && <div className="stage-main">
        {showNews && <section className="stage-news" aria-label="Latest news">
          <header><span className="stage-kicker"><i className="stage-live-dot" aria-hidden="true"/>Latest news</span><button type="button" className="stage-close" aria-label="Hide latest news" onClick={() => setDismissedSet(newsSetKey)}>×</button></header>
          <div className={`stage-news-cards count-${visibleNews.length}`}>{visibleNews.map((item, index) => <article key={item.id} className={`type-${item.type}`} style={{ "--i": index } as React.CSSProperties}>
            <div className="stage-news-meta"><span className={`stage-tag ${item.type}`}>{item.type === "major" ? "Major" : "Minor"}</span><span className="stage-news-scope">{scopeText(item)}</span><time>T+{fmtTime(Math.max(0, (item.createdAt - (world?.startedAt ?? item.createdAt)) / 1000))}</time></div>
            <p>{item.headline}</p>
          </article>)}</div>
        </section>}
        <section className="stage-grid" aria-label="All 25 companies">{stocks.map((stock, index) => <StockTile key={stock.symbol} stock={stock} index={index}/>)}</section>
      </div>}
      <Leaderboard world={world} final={final} onShowMarket={() => setMarketAfterClose(world?.batch ?? 0)}/>
    </div>

    {final && <div className="stage-confetti" aria-hidden="true">{CONFETTI.map((piece, i) => <i key={i} className={`tone-${piece.tone}`} style={{ "--x": `${piece.x}%`, "--delay": `${piece.delay}s`, "--drift": `${piece.drift}vw`, "--spin": `${piece.spin}deg`, "--size": `${piece.size}px` } as React.CSSProperties}/>)}</div>}
    {counting && <CountdownScene seconds={countdownSeconds} variant={variant}/>}
    <Ticker stocks={stocks} preview={preview}/>
  </main>;
}
