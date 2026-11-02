"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PublicLeaderboardEntry, PublicWorld } from "@/game/types";
import { DalaalMark, DalaalWordmark, Logo } from "@/components/trader-parts";
import { changePct, fmtTime, latestNewsSet, MiniChart, money, newsScope } from "./market-parts";

/*
  V4 audience stage for a 100" smart board read from about 12 feet, and for a 24" monitor.
  Everything people must read is at least ~24px at 1080p; key numbers are larger.
  The leaderboard ranks only terminals that have bought or shorted at least once.
*/

const pad2 = (n: number) => String(n).padStart(2, "0");
const signedPct = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
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
  return <span className={`stage-move ${delta > 0 ? "up" : "down"}`} aria-label={`${delta > 0 ? "up" : "down"} ${Math.abs(delta)}`}>{delta > 0 ? "▲" : "▼"}{Math.abs(delta)}</span>;
}

function Podium({ entries, moves, final }: { entries: PublicLeaderboardEntry[]; moves: Record<number, { delta: number }>; final: boolean }) {
  // Medal places follow the ranking; equal values share a rank, so ties show the same number.
  const places = [entries[1], entries[0], entries[2]];
  return <div className={`stage-podium${final ? " is-final" : ""}`}>
    {places.map((entry, slot) => {
      const place = slot === 1 ? 1 : slot === 0 ? 2 : 3;
      if (!entry) return <div key={`empty-${place}`} className={`stage-pillar place-${place} is-empty`}><span className="stage-medal">{place}</span><span className="stage-pillar-label">Open spot</span><strong className="stage-pillar-number">—</strong></div>;
      return <div key={entry.terminalNumber} className={`stage-pillar place-${place} status-${entry.status}`}>
        {place === 1 && <span className="stage-crown" aria-hidden="true">♛</span>}
        <span className="stage-medal">{entry.rank}</span>
        <span className="stage-pillar-label">TERMINAL <MoveBadge delta={moves[entry.terminalNumber]?.delta}/></span>
        <strong className="stage-pillar-number">{pad2(entry.terminalNumber)}</strong>
        <span className="stage-pillar-value">{money(entry.totalValue, 0)}</span>
        <span className={`stage-pillar-return ${entry.pnl > .5 ? "up" : entry.pnl < -.5 ? "down" : ""}`}>{signedPct(entry.returnPct)}</span>
        <span className="stage-pillar-base" aria-hidden="true"/>
      </div>;
    })}
  </div>;
}

function Leaderboard({ world, final, onShowMarket }: { world: PublicWorld | null; final: boolean; onShowMarket?: () => void }) {
  const entries = world?.leaderboard ?? [];
  const moves = useRankMoves(entries);
  const rest = entries.slice(3);
  const rows = useRef(new Map<number, HTMLElement>());
  const lastOrder = useRef<number[]>([]);
  const orderKey = rest.map(entry => entry.terminalNumber).join(",");
  // Rows glide to their new place when ranks change, so the room can follow who moved.
  useLayoutEffect(() => {
    const order = rest.map(entry => entry.terminalNumber);
    const previous = lastOrder.current;
    lastOrder.current = order;
    if (!previous.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const first = rows.current.get(order[0]), second = rows.current.get(order[1]);
    const pitch = first && second ? second.offsetTop - first.offsetTop : first?.offsetHeight ?? 0;
    order.forEach((terminal, index) => {
      const before = previous.indexOf(terminal);
      const row = rows.current.get(terminal);
      if (!row || before === index) return;
      row.animate(before < 0 ? [{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }] : [{ transform: `translateY(${(before - index) * pitch}px)` }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className={`stage-board${final ? " is-final" : ""}`} aria-label={final ? "Final standings" : "Leaderboard"}>
    <header className="stage-board-head">
      <div><span className="stage-kicker"><i className="stage-live-dot" aria-hidden="true"/>{final ? `BATCH ${pad2(world?.batch ?? 1)} · CLOSED` : "LIVE RANKING"}</span><h2>{final ? "Final standings" : "Leaderboard"}</h2></div>
      <span className="stage-chip">{entries.length ? `${entries.length} ${final ? (entries.length === 1 ? "TERMINAL" : "TERMINALS") : "TRADING"}` : "NO TRADES YET"}</span>
    </header>
    {entries.length === 0 ? <div className="stage-board-empty"><span className="stage-empty-orb" aria-hidden="true"/><strong>Waiting for the first trade</strong><span>Terminals join the leaderboard after their first buy or short.</span></div> : <>
      <Podium entries={entries} moves={moves} final={final}/>
      {rest.length > 0 && <ol className="stage-rows" style={{ "--rows": rest.length } as React.CSSProperties}>
        {rest.map(entry => <li key={entry.terminalNumber} ref={element => { if (element) rows.current.set(entry.terminalNumber, element); else rows.current.delete(entry.terminalNumber); }} className={`stage-row status-${entry.status}`}>
          <b className="stage-row-rank">{entry.rank}</b>
          <span className="stage-row-name"><strong>Terminal {pad2(entry.terminalNumber)}</strong><MoveBadge delta={moves[entry.terminalNumber]?.delta}/>{entry.status !== "live" && <small>{STATUS_LABEL[entry.status]}</small>}</span>
          <span className="stage-row-value"><strong>{money(entry.totalValue, 0)}</strong><small className={entry.pnl > .5 ? "up" : entry.pnl < -.5 ? "down" : ""}>{signedPct(entry.returnPct)}</small></span>
        </li>)}
      </ol>}
      {final && entries[0] && <p className="stage-winner-line">Top portfolio: Terminal {pad2(entries[0].terminalNumber)} with {money(entries[0].totalValue, 0)} ({signedMoney(entries[0].pnl)})</p>}
    </>}
    {final && onShowMarket && <button type="button" className="stage-text-button" onClick={onShowMarket}>Show the market</button>}
  </section>;
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

export function AudienceStage({ world, preview, theme, onTheme }: { world: PublicWorld | null; preview?: boolean; theme: "light" | "dark"; onTheme: () => void }) {
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
  const stocks = world?.stocks ?? [];
  const returnPct = world?.indexChange ?? 0;
  const status = world?.status ?? "ready";
  const statusText = status === "live" ? world?.controls.paused ? "PAUSED" : "LIVE" : status === "countdown" ? "STARTING" : status === "closed" ? "CLOSED" : "READY";
  const indexText = world?.index.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "10,000.00";
  // At the closing bell the leaderboard takes the whole stage until the next batch or a tap on "Show the market".
  const final = status === "closed" && (world?.leaderboard.length ?? 0) > 0 && marketAfterClose !== world?.batch;
  const countdownSeconds = counting && world ? Math.max(0, Math.ceil((world.startedAt - clock) / 1000)) : 0;
  const lowTime = status === "live" && (world?.remaining ?? 999) <= 30;

  return <main className={`stage stage-${theme}${final ? " is-final" : ""}`} data-status={status}>
    <header className="stage-head">
      <div className="stage-brand"><span className="stage-mark"><DalaalMark/></span><span><small>PRATIBIMB · LIVE MARKET</small><DalaalWordmark/></span></div>
      <div className="stage-index" aria-label={`Dalaal-10 index ${indexText}, ${signedPct(returnPct)}`}><span className="stage-index-label">DALAAL-10</span><strong>{indexText}</strong><b className={returnPct >= 0 ? "up" : "down"}>{returnPct >= 0 ? "▲" : "▼"} {Math.abs(returnPct).toFixed(2)}%</b></div>
      <div className={`stage-status status-${status}${world?.controls.paused ? " is-paused" : ""}`}><i aria-hidden="true"/>{statusText}</div>
      <div className={`stage-clock${lowTime ? " is-low" : ""}`} aria-label="Time left">{status === "live" ? fmtTime(world?.remaining ?? 0) : `BATCH ${pad2(world?.batch || 1)}`}</div>
      <div className="stage-tools">
        <button type="button" className={`stage-icon${bells.needsTap ? " needs-tap" : ""}`} onClick={() => setSound(value => !value)} aria-pressed={sound} title={sound ? "Bells on" : "Bells off"} aria-label={sound ? "Turn bells off" : "Turn bells on"}><Icon name={sound ? "sound" : "mute"}/></button>
        <button type="button" className="stage-icon" onClick={onTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><Icon name={theme === "light" ? "moon" : "sun"}/></button>
        <button type="button" className="stage-icon" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen()} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"}><Icon name={fullscreen ? "shrink" : "expand"}/></button>
      </div>
    </header>
    {bells.needsTap && sound && <button type="button" className="stage-sound-hint" onClick={() => bells.test("open")}>Tap here once to enable the opening and closing bells</button>}

    <div className="stage-body">
      {!final && <div className="stage-main">
        {showNews && <section className="stage-news" aria-label="Latest news">
          <header><span className="stage-kicker"><i className="stage-live-dot" aria-hidden="true"/>LATEST NEWS</span><button type="button" className="stage-close" aria-label="Hide latest news" onClick={() => setDismissedSet(newsSetKey)}>×</button></header>
          <div className={`stage-news-cards count-${visibleNews.length}`}>{visibleNews.map(item => <article key={item.id} className={`type-${item.type}`}>
            <div className="stage-news-meta"><span className={`stage-tag ${item.type}`}>{item.type}</span><span className="stage-news-scope">{newsScope(item)}</span><time>T+{fmtTime(Math.max(0, (item.createdAt - (world?.startedAt ?? item.createdAt)) / 1000))}</time></div>
            <p>{item.headline}</p>
          </article>)}</div>
        </section>}
        <section className="stage-grid" aria-label="All 25 companies">{stocks.map(stock => {
          const move = changePct(stock);
          return <article className={`stage-tile ${move >= 0 ? "is-up" : "is-down"}`} key={stock.symbol}>
            <div className="stage-tile-top"><Logo stock={stock} compact/><b title={stock.name}>{stock.symbol}</b></div>
            <div className="stage-tile-price"><strong>{money(stock.price, stock.price < 100 ? 2 : 0)}</strong><span>{move >= 0 ? "▲" : "▼"}{Math.abs(move).toFixed(2)}%</span></div>
            <MiniChart stock={stock} startedAt={world?.startedAt}/>
          </article>;
        })}</section>
      </div>}
      <Leaderboard world={world} final={final} onShowMarket={() => setMarketAfterClose(world?.batch ?? 0)}/>
    </div>

    {counting && <div className="stage-countdown" role="status" aria-live="assertive"><span>Trading opens in</span><strong key={countdownSeconds}>{countdownSeconds || "GO"}</strong></div>}
    <footer className="stage-foot">{preview && <><a href="/ui-preview">PREVIEW · COMPARE ALL</a> · </>}FICTIONAL PRICES · NO REAL MONEY</footer>
  </main>;
}
