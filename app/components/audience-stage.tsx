"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PublicLeaderboardEntry, PublicWorld, Stock } from "@/game/types";
import { DalaalMark, DalaalWordmark, Logo } from "@/components/trader-parts";
import { changePct, fmtTime, latestNewsSet, MiniChart, money, newsScope } from "./market-parts";

/*
  Audience stage for every version: a 100" smart board read from 12–15 feet, and a 24" monitor.
  Everything people must read is at least ~28px at 1080p; prices, ranks and the clock are far larger.
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

/*
  The standings board. The top three ranks sit in gold, silver and bronze blocks and the leader's
  row is a full field of the version's accent, so the room can see who is ahead from the back.
*/
function Leaderboard({ world, final, onShowMarket }: { world: PublicWorld | null; final: boolean; onShowMarket?: () => void }) {
  const entries = world?.leaderboard ?? [];
  const moves = useRankMoves(entries);
  const rows = useRef(new Map<number, HTMLElement>());
  const lastOrder = useRef<number[]>([]);
  const orderKey = entries.map(entry => entry.terminalNumber).join(",");
  // Rows glide to their new place when ranks change, so the room can follow who moved.
  useLayoutEffect(() => {
    const order = entries.map(entry => entry.terminalNumber);
    const previous = lastOrder.current;
    lastOrder.current = order;
    if (!previous.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    order.forEach((terminal, index) => {
      const before = previous.indexOf(terminal);
      const row = rows.current.get(terminal);
      if (!row || before === index) return;
      if (before < 0) { row.animate([{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" }); return; }
      row.animate([{ transform: `translateY(${(before - index) * 70}%)` }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const leader = entries[0];
  const ref = (terminal: number) => (element: HTMLElement | null) => { if (element) rows.current.set(terminal, element); else rows.current.delete(terminal); };
  const row = (entry: PublicLeaderboardEntry, index: number) => <li key={entry.terminalNumber} ref={ref(entry.terminalNumber)} className={`stage-standing rank-${Math.min(index + 1, 4)} status-${entry.status}`}>
    <b className="stage-standing-rank">{entry.rank}</b>
    <span className="stage-standing-name"><small>Terminal</small><strong>{pad2(entry.terminalNumber)}</strong><MoveBadge delta={moves[entry.terminalNumber]?.delta}/></span>
    <span className="stage-standing-figures">
      <span className="stage-standing-value">{money(entry.totalValue, 0)}</span>
      <span className={`stage-standing-return ${entry.pnl > .5 ? "up" : entry.pnl < -.5 ? "down" : "flat"}`}>{signedPct(entry.returnPct)}</span>
    </span>
    {!final && entry.status !== "live" && <small className="stage-standing-status">{STATUS_LABEL[entry.status]}</small>}
  </li>;

  if (final && leader) return <section className="stage-final" aria-label="Final standings">
    <div className="stage-champion" ref={ref(leader.terminalNumber)}>
      <h2>Batch {pad2(world?.batch ?? 1)} winner</h2>
      <p className="stage-champion-name"><small>Terminal</small><strong>{pad2(leader.terminalNumber)}</strong></p>
      <p className="stage-champion-value">{money(leader.totalValue, 0)}</p>
      <p className="stage-champion-gain">{signedMoney(leader.pnl)} · {signedPct(leader.returnPct)}</p>
    </div>
    <div className="stage-final-rest">
      <h2>Final standings</h2>
      {entries.length > 1 ? <ol className="stage-board-rows" start={2}>{entries.slice(1).map((entry, index) => row(entry, index + 1))}</ol> : <p className="stage-board-note">Only one terminal traded this batch.</p>}
      {onShowMarket && <button type="button" className="stage-text-button" onClick={onShowMarket}>Show the market</button>}
    </div>
  </section>;

  return <section className="stage-board" aria-label="Standings">
    <header className="stage-board-head">
      <h2>Standings</h2>
      <span className="stage-board-meta">{entries.length ? `${entries.length} trading` : "No trades yet"}</span>
    </header>
    {entries.length === 0
      ? <div className="stage-board-empty"><strong>Waiting for the first trade</strong><span>A terminal joins the board with its first buy or short. Everyone starts with ₹10,00,000.</span></div>
      : <ol className="stage-board-rows">{entries.map(row)}</ol>}
  </section>;
}

/* ---------- Market board ---------- */

function Arrow({ up }: { up: boolean }) {
  return <svg className="stage-arrow" viewBox="0 0 10 10" aria-hidden="true"><path d={up ? "M5 1 10 9H0z" : "M5 9 0 1h10z"}/></svg>;
}

/** One company as a lit panel: its fill deepens with the size of the move, and it flashes on each tick. */
function StockTile({ stock, startedAt }: { stock: Stock; startedAt?: number }) {
  const move = changePct(stock);
  const last = useRef(stock.price);
  const [tick, setTick] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const before = last.current;
    last.current = stock.price;
    if (stock.price === before) return;
    setTick(stock.price > before ? "up" : "down");
    const timer = window.setTimeout(() => setTick(null), 650);
    return () => window.clearTimeout(timer);
  }, [stock.price]);
  const direction = move > .005 ? "up" : move < -.005 ? "down" : "flat";
  const heat = .22 + .78 * Math.min(1, Math.abs(move) / 4);
  return <article className={`stage-tile is-${direction}`} data-tick={tick ?? undefined} style={{ "--heat": heat.toFixed(3) } as React.CSSProperties} aria-label={`${stock.name}, ${money(stock.price, 2)}, ${signedPct(move)}`}>
    <div className="stage-tile-top"><Logo stock={stock} compact/><b>{stock.symbol}</b></div>
    <strong className="stage-tile-price">{money(stock.price, stock.price < 100 ? 2 : 0)}</strong>
    <span className="stage-tile-move">{direction !== "flat" && <Arrow up={direction === "up"}/>}{Math.abs(move).toFixed(2)}%</span>
    <MiniChart stock={stock} startedAt={startedAt}/>
  </article>;
}

/* ---------- News ---------- */

const newsTime = (item: PublicWorld["headlines"][number], world: PublicWorld | null) => `T+${fmtTime(Math.max(0, (item.createdAt - (world?.startedAt ?? item.createdAt)) / 1000))}`;

function StoryMeta({ item, world }: { item: PublicWorld["headlines"][number]; world: PublicWorld | null }) {
  return <><span className="stage-tag">{item.type === "major" ? "Major" : "Minor"}</span><span className="stage-story-scope">{newsScope(item)}</span><time>{newsTime(item, world)}</time></>;
}

function NewsCards({ items, world }: { items: PublicWorld["headlines"]; world: PublicWorld | null }) {
  return <>{items.map(item => <article key={item.id} className={`stage-story type-${item.type}`}>
    <div className="stage-story-meta"><StoryMeta item={item} world={world}/></div>
    <p>{item.headline}</p>
  </article>)}</>;
}

/** Docked news: one story at a time in a single band, turning every seven seconds, so the board keeps its size. */
const TURN_MS = 7_000;
function NewsBand({ items, world, onClose }: { items: PublicWorld["headlines"]; world: PublicWorld | null; onClose: () => void }) {
  const [turn, setTurn] = useState(0);
  const key = items.map(item => item.id).join(",");
  useEffect(() => {
    setTurn(0);
    if (items.length < 2) return;
    const timer = window.setInterval(() => setTurn(value => value + 1), TURN_MS);
    return () => window.clearInterval(timer);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const index = turn % items.length;
  const item = items[index];
  return <section className="stage-news" aria-label="Latest news">
    <article key={item.id} className={`stage-story type-${item.type}`}>
      <div className="stage-story-meta">
        <h2 className="stage-news-label"><i className="stage-live-dot" aria-hidden="true"/>Latest news</h2>
        <StoryMeta item={item} world={world}/>
        {items.length > 1 && <span className="stage-news-count">{index + 1} of {items.length}</span>}
        <button type="button" className="stage-close" aria-label="Hide latest news" onClick={onClose}>×</button>
      </div>
      <p>{item.headline}</p>
      {items.length > 1 && <i className="stage-flash-timer" aria-hidden="true" style={{ animationDuration: `${TURN_MS}ms` }}/>}
    </article>
  </section>;
}

/** A new set of headlines takes the stage for a few seconds, then docks above the board. */
const FLASH_MS = 7_000;
function useNewsFlash(key: string, hasNews: boolean, ready: boolean) {
  const seen = useRef<string | null>(null);
  const [flashKey, setFlashKey] = useState("");
  useEffect(() => {
    if (!ready) return;
    const first = seen.current === null;
    seen.current = key;
    if (first || !hasNews) return; // nothing flashes for the set already on screen when the wall opens
    setFlashKey(key);
    const timer = window.setTimeout(() => setFlashKey(current => current === key ? "" : current), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [key, hasNews, ready]);
  return { flashing: flashKey === key && hasNews, dismiss: () => setFlashKey("") };
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

  const visibleNews = latestNewsSet(world);
  const newsSetKey = `${world?.batch ?? 0}:${visibleNews.map(item => item.id).join(",")}`;
  const showNews = visibleNews.length > 0 && dismissedSet !== newsSetKey;
  const flash = useNewsFlash(newsSetKey, visibleNews.length > 0, world !== null);
  const stocks = world?.stocks ?? [];
  const returnPct = world?.indexChange ?? 0;
  const status = world?.status ?? "ready";
  const paused = status === "live" && Boolean(world?.controls.paused);
  const statusText = status === "live" ? paused ? "Paused" : "Live" : status === "countdown" ? "Starting" : status === "closed" ? "Closed" : "Ready";
  const indexText = world?.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "10,000.00";
  // At the closing bell the winner takes the whole stage until the next batch or a tap on "Show the market".
  const final = status === "closed" && (world?.leaderboard.length ?? 0) > 0 && marketAfterClose !== world?.batch;
  const countdownSeconds = counting && world ? Math.max(0, Math.ceil((world.startedAt - clock) / 1000)) : 0;
  const lowTime = status === "live" && (world?.remaining ?? 999) <= 30;
  const up = returnPct >= 0;

  return <main className={`stage stage-${theme} v-${variant}${final ? " is-final" : ""}${showNews ? " has-news" : ""} news-${visibleNews.length}`} data-status={status}>
    <header className="stage-head">
      <div className="stage-brand"><span className="stage-mark"><DalaalMark/></span><h1 className="stage-title"><DalaalWordmark/><small>Pratibimb live market · fictional prices</small></h1></div>
      <div className="stage-index" aria-label={`Dalaal-10 index ${indexText}, ${signedPct(returnPct)}`}>
        <span className="stage-index-label">Dalaal-10</span>
        <strong>{indexText}</strong>
        <b className={up ? "up" : "down"}><Arrow up={up}/>{Math.abs(returnPct).toFixed(2)}%</b>
      </div>
      <div className={`stage-status status-${status}${paused ? " is-paused" : ""}`}><i aria-hidden="true"/>{statusText}</div>
      <div className={`stage-clock${lowTime ? " is-low" : ""}`} aria-label={status === "live" ? "Time left" : "Batch"}>{status === "live" ? fmtTime(world?.remaining ?? 0) : <><small>Batch</small>{pad2(world?.batch || 1)}</>}</div>
      <div className="stage-tools">
        <button type="button" className={`stage-icon${bells.needsTap ? " needs-tap" : ""}`} onClick={() => setSound(value => !value)} aria-pressed={sound} title={sound ? "Bells on" : "Bells off"} aria-label={sound ? "Turn bells off" : "Turn bells on"}><Icon name={sound ? "sound" : "mute"}/></button>
        <button type="button" className="stage-icon" onClick={onTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><Icon name={theme === "light" ? "moon" : "sun"}/></button>
        <button type="button" className="stage-icon" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen()} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"}><Icon name={fullscreen ? "shrink" : "expand"}/></button>
      </div>
    </header>

    <div className="stage-body">
      {!final && <div className="stage-main">
        {showNews && <NewsBand items={visibleNews} world={world} onClose={() => setDismissedSet(newsSetKey)}/>}
        <section className="stage-grid" aria-label={`All ${stocks.length} companies`}>{stocks.map(stock => <StockTile key={stock.symbol} stock={stock} startedAt={world?.startedAt}/>)}</section>
      </div>}
      <Leaderboard world={world} final={final} onShowMarket={() => setMarketAfterClose(world?.batch ?? 0)}/>
      {flash.flashing && !final && <section className={`stage-flash count-${visibleNews.length}`} role="status" aria-live="polite" onClick={flash.dismiss}>
        <h2><i className="stage-live-dot" aria-hidden="true"/>Breaking news</h2>
        <div className="stage-flash-stories"><NewsCards items={visibleNews} world={world}/></div>
        <i className="stage-flash-timer" aria-hidden="true" style={{ animationDuration: `${FLASH_MS}ms` }}/>
      </section>}
    </div>

    {counting && <div className="stage-countdown" role="status" aria-live="assertive"><span>Trading opens in</span><strong key={countdownSeconds}>{countdownSeconds || "Go"}</strong></div>}
    {preview && <footer className="stage-foot"><a href="/ui-preview">Preview: compare all versions</a></footer>}
  </main>;
}
