"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PublicLeaderboardEntry, PublicNews, PublicWorld, Stock } from "@/game/types";
import { DalaalMark, DalaalWordmark, Logo } from "@/components/trader-parts";
import { animationOffClasses, animationOn } from "@/game/animations";
import { changePct, fmtTime, latestNewsSet, money, smoothPath, useSmoothRemaining } from "./market-parts";

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
    // The first tap or key press unlocks sound; a short chime confirms the bells will be heard.
    const unlock = () => {
      const ctx = context();
      if (!ctx) return;
      const wasLocked = ctx.state !== "running";
      void ctx.resume().then(() => {
        if (ctx.state !== "running") return;
        setNeedsTap(false);
        if (wasLocked) strike(ctx, ctx.destination, ctx.currentTime + .05, 1180, .12, .9);
      });
    };
    const events = ["pointerdown", "touchstart", "click", "keydown"] as const;
    events.forEach(name => window.addEventListener(name, unlock));
    return () => events.forEach(name => window.removeEventListener(name, unlock));
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

/** Rolling digits, like a stadium scoreboard: each digit slides to its new value. */
const DIGITS = "0123456789".split("");
export function Odometer({ text }: { text: string }) {
  const chars = [...text];
  return <span className="odo" aria-label={text}>{chars.map((ch, i) => {
    const key = chars.length - i; // keyed from the right so digits keep their place as the number grows
    return /\d/.test(ch)
      ? <span className="odo-d" key={key} aria-hidden="true"><span className="odo-strip" style={{ transform: `translateY(-${Number(ch) * 10}%)` }}>{DIGITS.map(d => <span key={d}>{d}</span>)}</span></span>
      : <span className="odo-c" key={`c${key}`} aria-hidden="true">{ch}</span>;
  })}</span>;
}

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

/* ---------- The Dalaal-10, drawn live ---------- */

/** The index's recent path, kept on this screen (the last 90 updates of this batch). */
function IndexSpark({ value, batch, up }: { value: number; batch: number; up: boolean }) {
  const history = useRef<{ batch: number; points: number[] }>({ batch, points: [] });
  if (history.current.batch !== batch) history.current = { batch, points: [] };
  const points = history.current.points;
  if (value && points.at(-1) !== value) { points.push(value); if (points.length > 90) points.shift(); }
  if (points.length < 2) return <svg className="stage-index-spark" viewBox="0 0 100 40" aria-hidden="true"/>;
  const lo = Math.min(...points), hi = Math.max(...points), span = hi - lo || 1;
  const xy = points.map((p, i) => ({ x: i * 100 / (points.length - 1), y: 36 - (p - lo) / span * 32 }));
  const end = xy[xy.length - 1];
  return <svg className={`stage-index-spark ${up ? "up" : "down"}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d={smoothPath(xy)}/><circle cx={end.x} cy={end.y} r="3"/></svg>;
}

/* ---------- Standings ---------- */

/*
  A rank change: each row that moved breaks into pixels in its own colours, the pixels scatter, then
  fly to the row's new place and reassemble there while the row fades back in. Canvas over the board;
  about 1,200 pixels per row at 1080p, gone in 1.3 seconds.
*/
function disperse(board: HTMLElement, moved: { row: HTMLElement; from: number }[]) {
  const box = board.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.className = "stage-disperse";
  canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
  board.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }
  ctx.scale(dpr, dpr);
  const css = getComputedStyle(board);
  const accent = css.getPropertyValue("--accent").trim() || "#a993ff";
  const gold = css.getPropertyValue("--gold").trim() || "#f3c74f";
  type Pixel = { sx: number; sy: number; mx: number; my: number; ex: number; ey: number; color: string; size: number; delay: number };
  const pixels: Pixel[] = [];
  const step = Math.max(5, Math.round(box.width / 95));
  for (const { row, from } of moved) {
    const style = getComputedStyle(row);
    const tones = [style.backgroundColor, style.color, accent, style.color, gold];
    const rect = { width: row.offsetWidth, height: row.offsetHeight };
    const oldTop = from, newTop = row.offsetTop, left = row.offsetLeft;
    for (let y = 0; y < rect.height; y += step) for (let x = 0; x < rect.width; x += step) {
      const angle = Math.random() * Math.PI * 2, spread = 30 + Math.random() * 90;
      pixels.push({ sx: left + x, sy: oldTop + y, mx: left + x + Math.cos(angle) * spread, my: (oldTop + newTop) / 2 + y + Math.sin(angle) * spread * .7, ex: left + x, ey: newTop + y, color: tones[Math.floor(Math.random() * tones.length)], size: step * (.7 + Math.random() * .5), delay: (x / rect.width) * .18 });
    }
    row.animate([{ opacity: 0, filter: "blur(6px)" }, { opacity: 0, offset: .72 }, { opacity: 1, filter: "brightness(1.6)", offset: .86 }, { opacity: 1, filter: "none" }], { duration: 1300, easing: "ease-out" });
  }
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const start = performance.now();
  const frame = (now: number) => {
    const t = (now - start) / 1300;
    ctx.clearRect(0, 0, box.width, box.height);
    for (const p of pixels) {
      const local = Math.min(1, Math.max(0, (t - p.delay) / (1 - p.delay)));
      let x: number, y: number;
      if (local < .38) { const k = ease(local / .38); x = p.sx + (p.mx - p.sx) * k; y = p.sy + (p.my - p.sy) * k; }
      else { const k = ease((local - .38) / .62); x = p.mx + (p.ex - p.mx) * k; y = p.my + (p.ey - p.my) * k; }
      ctx.globalAlpha = local > .85 ? (1 - local) / .15 : 1;
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, p.size, p.size);
    }
    if (t < 1) requestAnimationFrame(frame); else canvas.remove();
  };
  requestAnimationFrame(frame);
}

function Leaderboard({ world, final, onShowMarket }: { world: PublicWorld | null; final: boolean; onShowMarket?: () => void }) {
  const entries = world?.leaderboard ?? [];
  const moves = useRankMoves(entries);
  const rows = useRef(new Map<number, HTMLElement>());
  const tops = useRef(new Map<number, number>());
  const board = useRef<HTMLElement>(null);
  const orderKey = entries.map(entry => entry.terminalNumber).join(",");
  // Rows glide from where they were to their new place, so the room can follow who moved.
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<number, number>();
    const moved: { row: HTMLElement; from: number }[] = [];
    rows.current.forEach((row, terminal) => {
      // Layout position, which ignores the rows' own entrance transforms.
      const top = row.offsetTop;
      next.set(terminal, top);
      const before = tops.current.get(terminal);
      if (reduce || !tops.current.size || row.closest(".no-motion, .off-rankChange")) return;
      if (before === undefined) { row.animate([{ opacity: 0, transform: "translateX(28px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "cubic-bezier(.2,.8,.2,1)" }); return; }
      if (Math.abs(before - top) > 1) moved.push({ row, from: before });
    });
    tops.current = next;
    if (moved.length && board.current) disperse(board.current, moved);
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const leader = entries[0];
  // When first place changes hands, a banner names the new leader for a few seconds.
  const lastLeader = useRef<number | null>(null);
  const [leadBanner, setLeadBanner] = useState<{ terminal: number; key: number } | null>(null);
  useEffect(() => {
    const now = leader?.terminalNumber ?? null;
    const before = lastLeader.current;
    lastLeader.current = now;
    if (final || now === null || before === null || before === now) return;
    setLeadBanner({ terminal: now, key: Date.now() });
    const timer = window.setTimeout(() => setLeadBanner(null), 3600);
    return () => window.clearTimeout(timer);
  }, [leader?.terminalNumber, final]);
  return <section ref={board} className={`stage-board${final ? " is-final" : ""}`} aria-label={final ? "Final standings" : "Standings"} style={{ "--count": entries.length } as React.CSSProperties}>
    {leadBanner && <div className="stage-lead" key={leadBanner.key} role="status"><span>New leader</span><strong>Terminal {pad2(leadBanner.terminal)} takes the lead</strong></div>}
    <header className="stage-board-head">
      <h2>{final ? "Final standings" : "Standings"}</h2>
      <span className="stage-board-meta">{final ? `Batch ${pad2(world?.batch ?? 1)} · closed` : entries.length ? `${entries.length} ${entries.length === 1 ? "terminal" : "terminals"} trading` : "No trades yet"}</span>
    </header>
    {entries.length === 0 ? <div className="stage-board-empty"><strong>Waiting for the first trade</strong><span>A terminal joins the board with its first buy or short.</span></div> : <>
      <div className="stage-board-cols" aria-hidden="true"><span>Rank</span><span>Terminal</span><span>Portfolio</span><span>Return</span></div>
      <ol className="stage-board-rows" style={{ "--rows": entries.length } as React.CSSProperties}>
        {entries.map((entry, index) => <li key={entry.terminalNumber} ref={element => { if (element) rows.current.set(entry.terminalNumber, element); else rows.current.delete(entry.terminalNumber); }} className={`stage-standing${index === 0 ? " is-leader" : ""} medal-${Math.min(entry.rank, 4)} status-${entry.status}`} style={{ "--i": index, "--reveal": entries.length - 1 - index } as React.CSSProperties}>
          {index === 0 && <svg className="stage-crown" viewBox="0 0 34 24" aria-hidden="true"><path d="M2 22 0 6l9 7 8-12 8 12 9-7-2 16z"/></svg>}
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

function StockTile({ stock, index, news }: { stock: Stock; index: number; news?: boolean }) {
  const move = changePct(stock);
  const tick = useTick(stock.price);
  // The size of the last price change, shown floating up from the panel.
  const lastPrice = useRef(stock.price);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  useEffect(() => {
    const change = stock.price - lastPrice.current;
    lastPrice.current = stock.price;
    if (Math.abs(change) < .001) return;
    setDelta({ value: change, key: Date.now() });
  }, [stock.price]);
  const ring = Math.max(Math.abs((index % 5) - 2), Math.abs(Math.floor(index / 5) - 2));
  const heat = Math.min(1, Math.abs(move) / 4);
  const [rupees, paise] = money(stock.price, 2).replace("₹", "").split(".");
  return <article className={`stage-tile ${move >= 0 ? "is-up" : "is-down"}${news ? " is-news" : ""}`} data-tick={tick ?? undefined} data-sector={stock.sector} style={{ "--i": index, "--ring": ring, "--heat": heat.toFixed(3) } as React.CSSProperties} title={stock.name} aria-label={`${stock.name} ${money(stock.price, 2)}, ${move >= 0 ? "up" : "down"} ${Math.abs(move).toFixed(2)}%`}>
    <div className="stage-tile-top"><Logo stock={stock} compact/><b>{shortName(stock.symbol)}</b><small className="stage-tile-sector">{stock.sector}</small></div>
    <div className="stage-tile-price"><strong><i>₹</i>{rupees}<em>.{paise}</em></strong><span>{move >= 0 ? "▲" : "▼"} {Math.abs(move).toFixed(2)}%</span></div>
    <Spark stock={stock}/>
    {delta && <span className={`stage-delta ${delta.value > 0 ? "up" : "down"}`} key={delta.key} aria-hidden="true">{delta.value > 0 ? "+" : "−"}{Math.abs(delta.value).toFixed(2)}</span>}
  </article>;
}

/* ---------- Opening countdown: a market building itself behind the number ---------- */

const CANDLES = Array.from({ length: 28 }, (_, i) => {
  const close = 22 + i * 2.35 + Math.sin(i * 1.9) * 6 + (i % 6 === 4 ? -7 : 0);
  const open = i === 0 ? 20 : 22 + (i - 1) * 2.35 + Math.sin((i - 1) * 1.9) * 6 + ((i - 1) % 6 === 4 ? -7 : 0);
  return { open, close, high: Math.max(open, close) + 3 + (i % 3), low: Math.min(open, close) - 3 - (i % 2) * 2 };
});
const CANDLE_LINE = smoothPath(CANDLES.map((candle, i) => ({ x: 18 + i * 35, y: 300 - candle.close * 3.4 })));
const CONFETTI = Array.from({ length: 140 }, (_, i) => ({ x: (i * 37.7) % 100, delay: (i % 14) * .13, drift: ((i * 53) % 40) - 20, spin: 280 + (i * 71) % 720, size: 14 + (i * 13) % 16, tone: i % 3 }));

/*
  The particle field behind the countdown. Glowing points swirl round the dial and gather into each
  number; on GO they form the word and burst like a firework. Canvas 2D, one pre-rendered glow sprite,
  about 1,600 points, capped device-pixel ratio so a 4K board keeps 60 fps.
*/
type Particle = { x: number; y: number; vx: number; vy: number; tx: number | null; ty: number | null; size: number; tone: number; phase: number; orbit: number; spin: number };
function glyphPoints(text: string, w: number, h: number, step: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (!g) return [];
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${Math.round(h * (text.length > 1 ? .5 : .74))}px "Archivo Stage", system-ui, sans-serif`;
  g.fillText(text, w / 2, h * .53);
  const data = g.getImageData(0, 0, w, h).data;
  const points: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] > 140) points.push({ x, y });
  for (let i = points.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [points[i], points[j]] = [points[j], points[i]]; }
  return points;
}
function sprite(color: string, size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(.22, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}
function ParticleField({ text, light }: { text: string; light: boolean }) {
  const speed = useRef(1);
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ particles: Particle[]; w: number; h: number; burst: boolean; step: number } | null>(null);
  // Build the field once.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Rendered at about 60% resolution and scaled up: the glow is soft and the crisp number is ordinary text.
    const dpr = Math.min(1.2, (window.devicePixelRatio || 1) * .62);
    const css = getComputedStyle(canvas);
    const colors = [css.getPropertyValue("--accent").trim() || "#a993ff", css.getPropertyValue("--gold").trim() || "#f3c74f", css.getPropertyValue("--up").trim() || "#2fd68f"];
    const sprites = colors.map(color => sprite(color, 48));
    const ink = css.getPropertyValue("--ink").trim() || "#111";
    let w = 0, h = 0, raf = 0, last = performance.now();
    // Adaptive quality: measure the first frames and draw fewer points on a slow machine.
    let stride = 1, frames = 0, spent = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width * dpr)); h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w; canvas.height = h;
      if (state.current) { state.current.w = w; state.current.h = h; }
    };
    resize();
    const count = Math.round(Math.min(2800, Math.max(1400, (w * h) / 900)));
    const particles: Particle[] = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2, r = (.25 + Math.random() * .6) * Math.min(w, h);
      return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, vx: 0, vy: 0, tx: null, ty: null, size: .5 + Math.random() * 1.1, tone: Math.random() < .55 ? 0 : Math.random() < .6 ? 1 : 2, phase: Math.random() * Math.PI * 2, orbit: (.3 + Math.random() * .55) * Math.min(w, h), spin: (Math.random() < .5 ? -1 : 1) * (.15 + Math.random() * .35) };
    });
    state.current = { particles, w, h, burst: false, step: 8 };
    // Hyperspace: streaks rush out from the centre, faster as the count falls.
    const stars = Array.from({ length: 420 }, () => ({ a: Math.random() * Math.PI * 2, z: Math.random(), tone: Math.floor(Math.random() * 3) }));
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    const frame = (now: number) => {
      const gap = now - last;
      const dt = Math.min(2, gap / 16.7);
      last = now;
      if (frames < 90) { frames++; spent += gap; if (frames === 45 || frames === 90) { const fps = 1000 / (spent / frames); if (fps < 42 && stride < 4) stride *= 2; if (fps < 30) canvas.parentElement?.classList.add("is-lite"); } }
      const st = state.current!;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${light ? .45 : .34})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      const cx = w / 2, cy = h / 2, t = now / 1000;
      const reach = Math.hypot(w, h) / 2;
      // Four stage spotlights sweep up from the floor.
      for (let b = 0; b < 4; b++) {
        const ox = w * (b < 2 ? (b === 0 ? .04 : .3) : (b === 2 ? .7 : .96)), oy = h * 1.06;
        const swing = Math.sin(t * .9 + b * 1.7) * .32 + (b < 2 ? .22 : -.22);
        const len = h * 1.25, spread = .085;
        const ax = ox + Math.sin(swing - spread) * len, ay = oy - Math.cos(swing - spread) * len;
        const bx = ox + Math.sin(swing + spread) * len, by = oy - Math.cos(swing + spread) * len;
        const grad = ctx.createLinearGradient(ox, oy, (ax + bx) / 2, (ay + by) / 2);
        grad.addColorStop(0, colors[b === 1 ? 1 : b === 2 ? 2 : 0]);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = light ? .12 : .2;
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ax, ay); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
      }
      ctx.lineCap = "round";
      for (let si = 0; si < stars.length; si += stride) {
        const star = stars[si];
        const before = star.z;
        star.z += .0042 * speed.current * dt * (.4 + star.z);
        if (star.z > 1) { star.z = Math.random() * .05; star.a = Math.random() * Math.PI * 2; continue; }
        const r0 = Math.pow(before, 2.2) * reach, r1 = Math.pow(star.z, 2.2) * reach;
        if (r1 < 40 * dpr) continue;
        ctx.globalAlpha = Math.min(1, star.z * 1.6) * (light ? .5 : .85);
        ctx.strokeStyle = colors[star.tone];
        ctx.lineWidth = (.6 + star.z * 3.2) * dpr;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(star.a) * r0, cy + Math.sin(star.a) * r0);
        ctx.lineTo(cx + Math.cos(star.a) * r1, cy + Math.sin(star.a) * r1);
        ctx.stroke();
      }
      for (let pi = 0; pi < st.particles.length; pi++) {
        const p = st.particles[pi];
        if (st.burst) { p.vy += .06 * dt * dpr; p.vx *= .985; p.vy *= .985; }
        else if (p.tx !== null && p.ty !== null) {
          // Ease straight onto the target so each digit is readable within about half a second.
          const pull = Math.min(.5, .16 * dt);
          p.x += (p.tx - p.x) * pull; p.y += (p.ty - p.y) * pull;
          p.vx = 0; p.vy = 0;
        } else {
          // Drift on a slow orbit round the dial.
          const a = Math.atan2(p.y - cy, p.x - cx) + p.spin * .006 * dt;
          const r = p.orbit + Math.sin(t * .8 + p.phase) * 18 * dpr;
          p.vx += (cx + Math.cos(a) * r - p.x) * .02 * dt; p.vy += (cy + Math.sin(a) * r * .62 - p.y) * .02 * dt;
          p.vx *= .9; p.vy *= .9;
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (pi % stride !== 0 && p.tx === null) continue; // on a slow machine, skip some drifting points but keep every point of the number
        const twinkle = .55 + .45 * Math.sin(t * 3 + p.phase);
        const formed = p.tx !== null;
        if (formed) {
          // The number is a matrix of square pixels, like a stadium LED board: a glow square, then a bright core.
          const cell = st.step * .74;
          ctx.globalAlpha = .5;
          ctx.fillStyle = colors[0];
          ctx.fillRect(p.x - cell * .6, p.y - cell * .6, cell * 1.2, cell * 1.2);
          ctx.globalAlpha = .95;
          ctx.fillStyle = light ? ink : "#ffffff";
          ctx.fillRect(p.x - cell / 2, p.y - cell / 2, cell, cell);
          continue;
        }
        const size = 10 * p.size * dpr * (st.burst ? 1.3 : 1);
        ctx.globalAlpha = .4 * twinkle;
        ctx.drawImage(sprites[p.tone], p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [light]);
  // Gather the points into each new number, with a swirl as they travel.
  useEffect(() => {
    const st = state.current;
    if (!st) return;
    const step = Math.max(5, Math.round(Math.min(st.w, st.h) / 62));
    st.step = step;
    const points = glyphPoints(text, st.w, st.h, step);
    const cx = st.w / 2, cy = st.h / 2;
    st.burst = false;
    speed.current = !text ? 9 : Math.max(1, 6 - Number(text));
    st.particles.forEach((p, i) => {
      const point = points[i];
      if (point) { p.tx = point.x; p.ty = point.y; } else { p.tx = null; p.ty = null; }
      const a = Math.atan2(p.y - cy, p.x - cx);
      p.vx += -Math.sin(a) * 14 * p.spin; p.vy += Math.cos(a) * 14 * p.spin;
    });
    if (!text) {
      const timer = window.setTimeout(() => {
        st.burst = true;
        st.particles.forEach(p => { const a = Math.random() * Math.PI * 2, v = 6 + Math.random() * 22; p.tx = p.ty = null; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 6; });
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [text]);
  return <canvas className="cd-particles" ref={ref} aria-hidden="true"/>;
}

/** A number drawn as a matrix of square pixels (the last ten seconds' ghost). */
export function PixelText({ text, color }: { text: string; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = .5;
    const w = Math.max(1, Math.round(rect.width * scale)), h = Math.max(1, Math.round(rect.height * scale));
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const step = Math.max(4, Math.round(Math.min(w, h) / 48));
    const shade = getComputedStyle(canvas).getPropertyValue(color).trim() || "#ff5a5a";
    ctx.fillStyle = shade;
    for (const point of glyphPoints(text, w, h, step)) ctx.fillRect(point.x - step * .42, point.y - step * .42, step * .84, step * .84);
  }, [text, color]);
  return <canvas className="pixel-text" ref={ref} aria-hidden="true"/>;
}

export function CountdownScene({ seconds, variant, light }: { seconds: number; variant: string; light: boolean }) {
  const scene = useRef<HTMLDivElement>(null);
  // Every second lands like a beat: the whole scene punches in and settles.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    scene.current?.animate([{ transform: "scale(1.06)", opacity: .7 }, { transform: "none", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
  }, [seconds]);
  return <div className={`stage-countdown${seconds === 0 ? " is-go" : ""}`} role="status" aria-live="assertive">
    <div className="cd-scene" aria-hidden="true" ref={scene}>
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
    <ParticleField text={seconds ? String(seconds) : ""} light={light}/>
    {seconds === 0 && <i className="cd-flash" aria-hidden="true"/>}
    <div className="cd-dial">
      <svg className="cd-ring" viewBox="0 0 100 100" key={`r${seconds}`} aria-hidden="true"><circle className="cd-ring-track" cx="50" cy="50" r="46"/><circle className="cd-ring-sweep" cx="50" cy="50" r="46" pathLength={1}/></svg>
      {seconds > 0 && <strong key={seconds}>{seconds}</strong>}
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
  // The moment trading opens: a burst of light and "Market open".
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  // The host can switch animations off for every audience screen.
  const motion = world?.controls.animateAudience !== false;
  const flags = world?.controls.animations;
  const on = (key: string) => motion && animationOn(flags, key);
  const lastStatus = useRef(world?.status);
  useEffect(() => {
    const before = lastStatus.current;
    lastStatus.current = world?.status;
    if (before === "live" && world?.status === "closed") {
      // The closing bell: shutters slam shut on the market, then part on the final standings.
      setClosing(true);
      const timer = window.setTimeout(() => setClosing(false), 2600);
      return () => window.clearTimeout(timer);
    }
    if (before !== "countdown" || world?.status !== "live") return;
    setOpening(true);
    const timer = window.setTimeout(() => setOpening(false), 2800);
    return () => window.clearTimeout(timer);
  }, [world?.status]);

  const visibleNews = latestNewsSet(world);
  const newsSetKey = `${world?.batch ?? 0}:${visibleNews.map(item => item.id).join(",")}`;
  const showNews = visibleNews.length > 0 && dismissedSet !== newsSetKey;
  // When a set lands, the companies it touches light up for a few seconds (no direction is revealed).
  const [glowKey, setGlowKey] = useState("");
  const seenSet = useRef<string | null>(null);
  useEffect(() => {
    const first = seenSet.current === null;
    seenSet.current = newsSetKey;
    if (first || !visibleNews.length) return;
    setGlowKey(newsSetKey);
    const timer = window.setTimeout(() => setGlowKey(""), 9000);
    return () => window.clearTimeout(timer);
  }, [newsSetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const newsGlow = new Set<string>();
  if (glowKey === newsSetKey) for (const item of visibleNews) {
    const scope = item.scope ?? (item.symbols?.length ? "stock" : item.sector === "ALL" ? "economy" : "sector");
    for (const stock of world?.stocks ?? []) if (scope === "economy" || (scope === "sector" ? stock.sector === item.sector : item.symbols?.includes(stock.symbol))) newsGlow.add(stock.symbol);
  }
  const stocks = world?.stocks ?? [];
  // The record-shop version (V6) files its companies by sector, like the racks in a shop.
  const ordered = variant === "conservatory" ? [...stocks].sort((a, b) => a.sector.localeCompare(b.sector) || stocks.indexOf(a) - stocks.indexOf(b)) : stocks;
  const returnPct = world?.indexChange ?? 0;
  const status = world?.status ?? "ready";
  const indexText = world?.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "10,000.00";
  // At the closing bell the leaderboard takes the whole stage until the next batch or a tap on "Show the market".
  const final = status === "closed" && (world?.leaderboard.length ?? 0) > 0 && marketAfterClose !== world?.batch;
  const countdownSeconds = counting && world ? Math.max(0, Math.ceil((world.startedAt - clock) / 1000)) : 0;
  const remaining = useSmoothRemaining(world);
  const lowTime = status === "live" && (world ? remaining : 999) <= 30;
  const timeLeft = status === "live" && world ? Math.min(1, Math.max(0, remaining / (world.duration || 1))) : 0;

  const lastTen = status === "live" && !world?.controls.paused && remaining <= 10 && remaining > 0;
  // The clock always shows a time, and its label always says what that time is.
  const batchLabel = `Batch ${pad2(world?.batch || 1)}`;
  const clockLabel = status === "live" ? world?.controls.paused ? "Paused" : "Time left" : status === "countdown" ? "Starting" : status === "closed" ? `${batchLabel} · closed` : `${batchLabel} · ready`;
  const clockText = status === "live" ? fmtTime(remaining) : status === "closed" ? "00:00" : fmtTime(world?.duration ?? 300);
  const clockFill = status === "live" ? timeLeft : status === "closed" ? 0 : 1;
  return <main className={`stage stage-${theme} v-${variant}${final ? " is-final" : ""}${showNews ? " has-news" : ""}${motion ? animationOffClasses(flags) : " no-motion"}${lastTen ? " is-last-ten" : ""}`} data-status={status}>
    <svg className="stage-defs" aria-hidden="true" focusable="false"><defs>
      <linearGradient id="stage-spark-up" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor: "var(--up)", stopOpacity: .34 }}/><stop offset="1" style={{ stopColor: "var(--up)", stopOpacity: 0 }}/></linearGradient>
      <linearGradient id="stage-spark-down" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style={{ stopColor: "var(--down)", stopOpacity: .3 }}/><stop offset="1" style={{ stopColor: "var(--down)", stopOpacity: 0 }}/></linearGradient>
    </defs></svg>
    <header className="stage-head">
      <div className="stage-brand"><span className="stage-mark"><DalaalMark/></span><h1 className="stage-title"><small>Pratibimb live market</small><DalaalWordmark/></h1></div>
      <div className={`stage-clock state-${status}${world?.controls.paused ? " is-paused" : ""}${lowTime ? " is-low" : ""}`} role="timer" aria-label={`${clockLabel}, ${clockText}`}>
        <small><i aria-hidden="true"/>{clockLabel}</small>
        <span>{clockText}</span>
        <i className="stage-clock-bar" aria-hidden="true" style={{ transform: `scaleX(${clockFill})` }}/>
      </div>
      <div className="stage-index" aria-label={`Dalaal-10 index ${indexText}, ${signedPct(returnPct)}`}><span className="stage-index-label">Dalaal-10 index</span><strong data-tick={indexTick ?? undefined}>{indexText}</strong><b className={returnPct >= 0 ? "up" : "down"}>{returnPct >= 0 ? "▲" : "▼"} {Math.abs(returnPct).toFixed(2)}%</b><IndexSpark value={world?.index ?? 0} batch={world?.batch ?? 0} up={returnPct >= 0}/></div>
      <div className="stage-tools">
        <button type="button" className={`stage-icon${bells.needsTap ? " needs-tap" : ""}`} onClick={() => setSound(value => !value)} aria-pressed={sound} title={sound ? "Bells on" : "Bells off"} aria-label={sound ? "Turn bells off" : "Turn bells on"}><Icon name={sound ? "sound" : "mute"}/></button>
        <button type="button" className="stage-icon" onClick={onTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><Icon name={theme === "light" ? "moon" : "sun"}/></button>
        <button type="button" className="stage-icon" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen()} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"}><Icon name={fullscreen ? "shrink" : "expand"}/></button>
      </div>
    </header>

    <div className="stage-body">
      {!final && <section className="stage-grid" aria-label="All 25 companies">{ordered.map((stock, index) => <StockTile key={stock.symbol} stock={stock} index={index} news={newsGlow.has(stock.symbol)}/>)}</section>}
      {!final && <section className={`stage-news${showNews ? "" : " is-empty"}`} aria-label="Latest news">
        <header><span className="stage-kicker"><i className="stage-live-dot" aria-hidden="true"/>{showNews ? "Latest news" : "News"}</span>{showNews && <button type="button" className="stage-close" aria-label="Hide latest news" onClick={() => setDismissedSet(newsSetKey)}>×</button>}</header>
        {showNews ? <div className={`stage-news-cards count-${visibleNews.length}`}>{visibleNews.map((item, index) => <article key={item.id} className={`type-${item.type}`} style={{ "--i": index } as React.CSSProperties}>
          <div className="stage-news-meta"><span className={`stage-tag ${item.type}`}>{item.type === "major" ? "Major" : "Minor"}</span><span className="stage-news-scope">{scopeText(item)}</span><time>T+{fmtTime(Math.max(0, (item.createdAt - (world?.startedAt ?? item.createdAt)) / 1000))}</time></div>
          <p>{item.headline.split(" ").map((word, w) => <span className="stage-word" key={w} style={{ "--w": w } as React.CSSProperties}>{word} </span>)}</p>
        </article>)}</div> : <p className="stage-news-wait">{status === "live" ? "The next headlines are on their way." : "Headlines appear here once trading starts."}</p>}
      </section>}
      <Leaderboard world={world} final={final} onShowMarket={() => setMarketAfterClose(world?.batch ?? 0)}/>
    </div>

    {on("closing") && closing && <div className="stage-shutter" aria-hidden="true"><i/><i/><strong>Market closed</strong></div>}
    {final && on("confetti") && <div className="stage-confetti" aria-hidden="true">{CONFETTI.map((piece, i) => <i key={i} className={`tone-${piece.tone}`} style={{ "--x": `${piece.x}%`, "--delay": `${piece.delay}s`, "--drift": `${piece.drift}vw`, "--spin": `${piece.spin}deg`, "--size": piece.size } as React.CSSProperties}/>)}</div>}
    {counting && (on("countdown") ? <CountdownScene seconds={countdownSeconds} variant={variant} light={theme === "light"}/> : <div className="stage-countdown is-plain" role="status" aria-live="assertive"><div className="cd-dial">{countdownSeconds > 0 && <strong>{countdownSeconds}</strong>}</div></div>)}
    {lastTen && on("lastTen") && <div className="stage-last-ten" aria-hidden="true" key={Math.ceil(remaining)}><PixelText text={String(Math.ceil(remaining))} color="--down"/></div>}
    {opening && on("marketOpen") && <div className="stage-open" aria-hidden="true"><i className="stage-open-burst"/><i className="stage-open-ring"/><strong>Market open</strong></div>}
    {bells.needsTap && sound && <button type="button" className="stage-sound-prompt" onClick={() => undefined}><Icon name="sound"/><span><b>Tap to turn on the bells</b><small>Browsers keep sound off until the screen is touched once</small></span></button>}
    {preview && <a className="stage-preview-link" href="/ui-preview">Preview: compare all versions</a>}
  </main>;
}
