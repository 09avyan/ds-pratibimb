"use client";

/*
  "That's a wrap": a trading terminal's end-of-round recap, built like a story. Who you traded like,
  what your ₹10,00,000 became, where you finished, how you did against the market, your best and
  toughest trade, the badges you collected (and the ones still to win) and one tip for next round.
  It uses each version's own colours and type, so every version keeps its look.
*/

import { useEffect, useState } from "react";
import type { PublicWorld } from "@/game/types";
import type { performance as roundPerformance } from "@/game/engine";
import { money } from "./market-parts";

type Report = ReturnType<typeof roundPerformance>;
type Persona = { name: string; line: string; icon: keyof typeof ICONS };

const ICONS = {
  eye: <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Zm10 3.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/>,
  bear: <path d="M3 6h3l3 5 3-3 3 4 3-4 3 5v2l-3-4-3 4-3-4-3 3-3-5H3Zm1 12h16v2H4Z"/>,
  target: <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z"/>,
  bolt: <path d="M13.5 2 4 13.5h6.2L8.8 22 20 9.8h-6.6Z"/>,
  compass: <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm4.6 5.4-6.4 2.8-2.8 6.4 6.4-2.8Zm-4.6 3.4a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"/>,
  gem: <path d="M7 3h10l5 6-10 12L2 9Zm1.1 2L5.2 8.5h4.3L8.1 5Zm3.9 0-1.4 3.5h2.8Zm3.9 0-1.4 3.5h4.3ZM5.8 10.5l5 6.1-1.9-6.1Zm5.2 0L12 16l1-5.5Zm4.1 0-1.9 6.1 5-6.1Z"/>,
  flame: <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.6-5 3-6.4 0 2 1 3.4 2.4 3.9C10.7 8.6 11 5 12 2Z"/>,
  anchor: <path d="M12 2a3 3 0 0 1 1 5.8V10h4v2h-4v7.9A7 7 0 0 0 19 14h-2.5l3.5-4 3.5 4H21a9 9 0 0 1-18 0H.5L4 10l3.5 4H5a7 7 0 0 0 6 5.9V12H7v-2h4V7.8A3 3 0 0 1 12 2Zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>,
  lock: <path d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10Zm2 0h6V7a3 3 0 0 0-6 0Z"/>,
  star: <path d="m12 2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8l-6.3 3.6 1.5-7.1L1.8 9.4 9 8.6Z"/>,
};

/** Who the player traded like, from what they actually did this round. */
function persona(report: Report): Persona {
  const shortWins = report.trades.some(trade => (trade.side === "Auto-cover" || trade.side === "Buy" && (trade.coveredQty ?? 0) > 0) && trade.realized > 0);
  if (report.tradeCount === 0) return { name: "The Watcher", line: "You studied the market without placing a trade. Next round, back one idea.", icon: "eye" };
  if (shortWins) return { name: "The Bear Tamer", line: "You made money from a falling price by selling short.", icon: "bear" };
  if (report.losers === 0 && report.winners >= 2) return { name: "The Sharpshooter", line: `Every trade you closed made money: ${report.winners} for ${report.winners}.`, icon: "target" };
  if (report.tradeCount >= 10) return { name: "The Speed Trader", line: `${report.tradeCount} trades. You never sat still.`, icon: "bolt" };
  if (report.sectors >= 3) return { name: "The Explorer", line: `You traded ${report.symbols} companies across ${report.sectors} sectors.`, icon: "compass" };
  if (report.largestOrder >= 1_00_000 && report.pnl > 0) return { name: "The Big Bettor", line: `One order was worth ${money(report.largestOrder, 0)}, and it paid off.`, icon: "gem" };
  if (report.pnl < 0) return { name: "The Brave", line: "You took your chances. The market pushed back this time.", icon: "flame" };
  return { name: "The Steady Hand", line: "Calm, measured trades from start to finish.", icon: "anchor" };
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>;
}

/** Counts from the starting ₹10,00,000 to the final value (or shows it at once when motion is off). */
function useCount(target: number, start: number, still: boolean, delay = 400, ms = 1500) {
  const [value, setValue] = useState(still ? target : start);
  useEffect(() => {
    if (still) { setValue(target); return; }
    let raf = 0; const begin = performance.now() + delay;
    const step = (now: number) => { const p = Math.min(1, Math.max(0, (now - begin) / ms)); setValue(start + (target - start) * (1 - (1 - p) ** 3)); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, start, still, delay, ms]);
  return value;
}

// How to earn each badge still locked, said as a next step.
const UNLOCK: Record<string, string> = {
  "First Trade": "place one buy or short",
  "Stock Explorer": "trade four different companies",
  "Sector Hopper": "trade across three sectors",
  "Green Exit": "close a trade in profit",
  "Two Winners": "close two trades in profit",
  "Short Seller": "open a short position",
  "Short Cover": "close a short position",
  "Opening Bell": "trade in the first minute",
  "Big Ticket": "place an order worth ₹1,00,000 or more",
};
const signed = (value: number, digits = 2) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}%`;
const PLACE = ["1st", "2nd", "3rd"];
const CONFETTI = Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 100, delay: (i % 9) * .06, spin: 200 + (i * 71) % 500, tone: i % 3, drift: ((i * 29) % 30) - 15 }));

export function WrapScreen({ report, world, motion, cta, onCta, autoReady }: { report: Report; world: PublicWorld | null; motion: boolean; cta: string; onCta: () => void; autoReady: number | null }) {
  const who = persona(report);
  const value = useCount(report.value, 1_000_000, !motion);
  const up = report.pnl >= 0;
  const standing = world?.standing;
  const closed = world?.status === "closed";
  const market = world?.indexChange ?? 0;
  const lead = report.returnPct - market;
  const scale = Math.max(1, Math.abs(report.returnPct), Math.abs(market)) * 1.15;
  const bar = (pct: number) => `${Math.max(3, Math.abs(pct) / scale * 100)}%`;
  const earned = report.allBadges.filter(badge => badge.earned).length;
  const tip = report.tradeCount === 0 ? report.lessons[0] : report.openedShort ? report.lessons[1] : report.lessons[2];
  return <section className={`wrap${up ? " is-up" : " is-down"}`} aria-label="Round summary">
    {up && report.tradeCount > 0 && motion && <div className="wrap-confetti" aria-hidden="true">{CONFETTI.map((piece, i) => <i key={i} className={`tone-${piece.tone}`} style={{ "--x": `${piece.x}%`, "--delay": `${piece.delay}s`, "--spin": `${piece.spin}deg`, "--drift": `${piece.drift}vw` } as React.CSSProperties}/>)}</div>}
    <header className="wrap-hero">
      <div className="wrap-intro">
        <span className="eyebrow">Session complete · Batch {world?.batch ?? 1}</span>
        <h1>{"That’s a wrap".split(" ").map((word, i) => <span key={i} style={{ "--w": i } as React.CSSProperties}>{word}</span>)}<em>!</em></h1>
        <div className="wrap-persona">
          <span className="wrap-persona-icon"><Icon name={who.icon}/></span>
          <span><small>You traded like</small><b>{who.name}</b><p>{who.line}</p></span>
        </div>
      </div>
      <div className="wrap-score">
        <small>Your ₹10,00,000 became</small>
        <strong>{money(value, 0)}</strong>
        <span className="wrap-pnl">{up ? "▲" : "▼"} {money(Math.abs(report.pnl), 0)} · {signed(report.returnPct)}</span>
        {standing && <div className={`wrap-rank${standing.rank <= 3 ? ` is-podium place-${standing.rank}` : ""}`}>
          <b>{standing.rank <= 3 ? PLACE[standing.rank - 1] : `#${standing.rank}`}</b>
          <span><strong>{closed ? "Final place" : "Place so far"}: {standing.rank} of {standing.total}</strong><small>{standing.rank <= 3 && closed ? "You’re on the big screen. Look up!" : standing.rank === 1 ? "Leading the room." : "Ranked by total portfolio value"}</small></span>
        </div>}
      </div>
    </header>

    <div className="wrap-cards">
      <article className="wrap-card wrap-vs">
        <span className="eyebrow">You vs the market</span>
        <div className="wrap-bars">
          <p className={report.returnPct >= 0 ? "up" : "down"}><span>You</span><i style={{ "--w": bar(report.returnPct) } as React.CSSProperties}/><b>{signed(report.returnPct)}</b></p>
          <p className={market >= 0 ? "up" : "down"}><span>Dalaal-10</span><i style={{ "--w": bar(market) } as React.CSSProperties}/><b>{signed(market)}</b></p>
        </div>
        <strong className="wrap-verdict">{Math.abs(lead) < .005 ? "Dead level with the market." : lead > 0 ? `You beat the market by ${lead.toFixed(2)} points.` : `The market won by ${Math.abs(lead).toFixed(2)} points.`}</strong>
      </article>
      {([["Best closed trade", report.bestTrade, "best"], ["Toughest closed trade", report.worstTrade, "worst"]] as const).map(([label, trade, kind]) => <article key={kind} className={`wrap-card wrap-trade is-${kind}${trade ? trade.realized >= 0 ? " up" : " down" : " empty"}`}>
        <span className="eyebrow">{label}</span>
        {trade ? <>
          <b className="wrap-trade-symbol">{trade.symbol}</b>
          <strong>{trade.realized >= 0 ? "+" : "−"}{money(Math.abs(trade.realized), 0)}</strong>
          <small>{trade.side} · {trade.qty} shares at {money(trade.price)}</small>
        </> : <p>{kind === "worst" && report.bestTrade ? "No losing trade this round. Nice." : "No closed trades yet. Sell or cover a position to see one here."}</p>}
      </article>)}
      <article className="wrap-card wrap-stats">
        <span className="eyebrow">Your round in numbers</span>
        <dl>
          <div><dt>Trades</dt><dd>{report.tradeCount}</dd></div>
          <div><dt>Won / lost</dt><dd>{report.winners}<i>/</i>{report.losers}</dd></div>
          <div><dt>Sectors</dt><dd>{report.sectors}</dd></div>
          <div><dt>Cash left</dt><dd>{money(report.cash, 0)}</dd></div>
        </dl>
      </article>
    </div>

    <div className="wrap-bottom">
      <div className="wrap-card wrap-badges">
        <span className="eyebrow">Badges · {earned} of {report.allBadges.length} collected</span>
        <ul>{report.allBadges.map((badge, i) => <li key={badge.name} className={badge.earned ? "is-earned" : "is-locked"} style={{ "--i": i } as React.CSSProperties} title={badge.detail}>
          <span className="wrap-sticker"><Icon name={badge.earned ? "star" : "lock"}/></span>
          <b>{badge.name}</b>
          <small>{badge.earned ? badge.detail : `To unlock: ${UNLOCK[badge.name] ?? badge.detail}`}</small>
        </li>)}</ul>
      </div>
      <div className="wrap-card wrap-tip">
        <span className="eyebrow">Tip for next round</span>
        <p>{tip}</p>
        <button type="button" className="execute-button wrap-cta" onClick={onCta}>{cta} <kbd>Space</kbd></button>
        {autoReady !== null && <small className="wrap-auto"><i style={{ "--left": autoReady } as React.CSSProperties}/>Back to the ready screen in {autoReady}s</small>}
        <small className="wrap-note">A fictional learning simulation, not investment advice.</small>
      </div>
    </div>
  </section>;
}
