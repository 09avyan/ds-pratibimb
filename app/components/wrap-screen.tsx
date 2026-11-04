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
type Persona = { name: string; line: string };


/** Who the player traded like, from what they actually did this round. */
function persona(report: Report): Persona {
  const shortWins = report.trades.some(trade => (trade.side === "Auto-cover" || trade.side === "Buy" && (trade.coveredQty ?? 0) > 0) && trade.realized > 0);
  if (report.tradeCount === 0) return { name: "The Watcher", line: "You studied the market without placing a trade. Next round, back one idea." };
  if (shortWins) return { name: "The Bear Tamer", line: "You made money from a falling price by selling short." };
  if (report.losers === 0 && report.winners >= 2) return { name: "The Sharpshooter", line: `Every trade you closed made money: ${report.winners} for ${report.winners}.` };
  if (report.tradeCount >= 10) return { name: "The Speed Trader", line: `${report.tradeCount} trades. You never sat still.` };
  if (report.sectors >= 3) return { name: "The Explorer", line: `You traded ${report.symbols} companies across ${report.sectors} sectors.` };
  if (report.largestOrder >= 1_00_000 && report.pnl > 0) return { name: "The Big Bettor", line: `One order was worth ${money(report.largestOrder, 0)}, and it paid off.` };
  if (report.pnl < 0) return { name: "The Brave", line: "You took your chances. The market pushed back this time." };
  return { name: "The Steady Hand", line: "Calm, measured trades from start to finish." };
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

// How to earn each badge still to win, said as a next step.
const NEXT_STEP: Record<string, string> = {
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

type FeedbackEntry = { rating: number; learned: number | null; comment: string };

/** A three-question card: fun (1–5), learned (1–5), optional comment. One send per terminal per batch. */
function FeedbackCard({ batch, onSend, onStart }: { batch: number; onSend: (entry: FeedbackEntry) => Promise<void>; onStart: () => void }) {
  const key = `ds-feedback-${batch}`;
  const [rating, setRating] = useState(0);
  const [learned, setLearned] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(() => { try { return localStorage.getItem(key) ? "sent" : "idle"; } catch { return "idle"; } });
  const [error, setError] = useState("");
  const touch = () => { if (state === "idle") onStart(); };
  if (state === "sent") return <div className="wrap-card wrap-feedback is-sent" role="status"><h3>Thank you!</h3><p>Your feedback for this round is in.</p></div>;
  const scale = (label: string, value: number, set: (n: number) => void, low: string, high: string) => <fieldset className="fb-scale">
    <legend>{label}</legend>
    <div role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} role="radio" aria-checked={value === n} className={value >= n ? "is-on" : ""} onClick={() => { touch(); set(n); }}>{n}</button>)}</div>
    <small><span>{low}</span><span>{high}</span></small>
  </fieldset>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating || state === "sending") return;
    setState("sending"); setError("");
    try {
      await onSend({ rating, learned: learned || null, comment: comment.trim() });
      try { localStorage.setItem(key, "1"); } catch {}
      setState("sent");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send."); setState("error"); }
  };
  return <form className="wrap-card wrap-feedback" onSubmit={submit} onFocus={touch}>
    <h3>How was the game?</h3>
    {scale("How much fun was it?", rating, setRating, "Meh", "Loved it")}
    {scale("How much did you learn?", learned, setLearned, "Nothing new", "A lot")}
    <label className="fb-comment"><span>Anything to tell us? <small>(optional)</small></span><textarea maxLength={500} rows={2} value={comment} onChange={e => { touch(); setComment(e.target.value); }} placeholder="What you liked, what confused you…"/></label>
    <button type="submit" className="outline-button fb-send" disabled={!rating || state === "sending"}>{state === "sending" ? "Sending…" : "Send feedback"}</button>
    {state === "error" && <small className="fb-error" role="alert">{error} Try again.</small>}
  </form>;
}

export function WrapScreen({ report, world, motion, cta, onCta, autoReady, onFeedback, onFeedbackStart }: { report: Report; world: PublicWorld | null; motion: boolean; cta: string; onCta: () => void; autoReady: number | null; onFeedback?: (entry: FeedbackEntry) => Promise<void>; onFeedbackStart?: () => void }) {
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
    <header className="wrap-hero">
      <div className="wrap-intro">
        <h1>{"That’s a wrap".split(" ").map((word, i) => <span key={i} style={{ "--w": i } as React.CSSProperties}>{word}</span>)}<em>!</em></h1>
        <p className="wrap-persona">Batch {world?.batch ?? 1} is over. You traded like <b>{who.name}</b>. {who.line}</p>
      </div>
      <div className="wrap-score">
        <small>Your ₹10,00,000 became</small>
        <strong>{money(value, 0)}</strong>
        <span className="wrap-pnl">{up ? "▲" : "▼"} {money(Math.abs(report.pnl), 0)} · {signed(report.returnPct)}</span>
        {standing && <div className={`wrap-rank${standing.rank <= 3 ? ` is-podium place-${standing.rank}` : ""}`}>
          <b>{standing.rank <= 3 ? PLACE[standing.rank - 1] : `${standing.rank}th`}</b>
          <span><strong>{closed ? "Final place" : "Place so far"}: {standing.rank} of {standing.total}</strong><small>{standing.rank <= 3 && closed ? "You’re on the big screen. Look up!" : standing.rank === 1 ? "Leading the room." : "Ranked by total portfolio value"}</small></span>
        </div>}
      </div>
    </header>

    {onFeedback && <FeedbackCard key={world?.batch ?? 0} batch={world?.batch ?? 0} onSend={onFeedback} onStart={onFeedbackStart ?? (() => {})}/>}

    <div className="wrap-cards">
      <article className="wrap-card wrap-vs">
        <h3>You and the market</h3>
        <div className="wrap-bars">
          <p className={report.returnPct >= 0 ? "up" : "down"}><span>You</span><i style={{ "--w": bar(report.returnPct) } as React.CSSProperties}/><b>{signed(report.returnPct)}</b></p>
          <p className={market >= 0 ? "up" : "down"}><span>Dalaal-10</span><i style={{ "--w": bar(market) } as React.CSSProperties}/><b>{signed(market)}</b></p>
        </div>
        <strong className="wrap-verdict">{Math.abs(lead) < .005 ? "Dead level with the market." : lead > 0 ? `You beat the market by ${lead.toFixed(2)} points.` : `The market won by ${Math.abs(lead).toFixed(2)} points.`}</strong>
      </article>
      {([["Best closed trade", report.bestTrade, "best"], ["Toughest closed trade", report.worstTrade, "worst"]] as const).map(([label, trade, kind]) => <article key={kind} className={`wrap-card wrap-trade is-${kind}${trade ? trade.realized >= 0 ? " up" : " down" : " empty"}`}>
        <h3>{label}</h3>
        {trade ? <>
          <b className="wrap-trade-symbol">{trade.symbol}</b>
          <strong>{trade.realized >= 0 ? "+" : "−"}{money(Math.abs(trade.realized), 0)}</strong>
          <small>{trade.side} · {trade.qty} shares at {money(trade.price)}</small>
        </> : <p>{kind === "worst" && report.bestTrade ? "No losing trade this round. Nice." : "No closed trades yet. Sell or cover a position to see one here."}</p>}
      </article>)}
      <article className="wrap-card wrap-stats">
        <h3>Your round in numbers</h3>
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
        <h3>Badges: {earned} of {report.allBadges.length} collected</h3>
        <ul>{report.allBadges.map((badge, i) => <li key={badge.name} className={badge.earned ? "is-earned" : "is-locked"} style={{ "--i": i } as React.CSSProperties} title={badge.detail}>
          <b>{badge.name}</b>
          <small>{badge.earned ? badge.detail : `Next time: ${NEXT_STEP[badge.name] ?? badge.detail}`}</small>
        </li>)}</ul>
      </div>
      <div className="wrap-card wrap-tip">
        <h3>For your next round</h3>
        <p>{tip}</p>
        <button type="button" className="execute-button wrap-cta" onClick={onCta}>{cta} <kbd>Space</kbd></button>
        {autoReady !== null && <small className="wrap-auto"><i style={{ "--left": autoReady } as React.CSSProperties}/>Back to the ready screen in {autoReady}s</small>}
        <small className="wrap-note">A fictional learning simulation, not investment advice.</small>
      </div>
    </div>
  </section>;
}
