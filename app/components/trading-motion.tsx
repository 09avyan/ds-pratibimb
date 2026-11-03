"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicWorld } from "@/game/types";
import { CountdownScene, PixelText } from "./audience-stage";
import { useSmoothRemaining } from "./market-parts";
import { animationOn } from "@/game/animations";

/*
  The trading terminal's big moments, shared with the audience wall so the whole room feels one event:
  the countdown light show (numbers only), the market-open burst, the last ten seconds and the closing
  shutter. Each overlay ignores the pointer, so it never gets in the way of an order.
  The host's "trading animations" switch turns all of it off.
*/
export function TerminalMoments({ world, theme, variant }: { world: PublicWorld | null; theme: "light" | "dark"; variant: string }) {
  const [clock, setClock] = useState(() => Date.now());
  const [moment, setMoment] = useState<"open" | "close" | null>(null);
  const last = useRef(world?.status);
  const status = world?.status;
  const counting = status === "countdown";
  useEffect(() => { if (!counting) return; const timer = window.setInterval(() => setClock(Date.now()), 200); return () => window.clearInterval(timer); }, [counting]);
  useEffect(() => {
    const before = last.current;
    last.current = status;
    const next = before === "countdown" && status === "live" ? "open" : before === "live" && status === "closed" ? "close" : null;
    if (!next) return;
    setMoment(next);
    const timer = window.setTimeout(() => setMoment(null), next === "open" ? 2800 : 2600);
    return () => window.clearTimeout(timer);
  }, [status]);
  const remaining = useSmoothRemaining(world);
  if (!world) return null;
  const seconds = counting ? Math.max(0, Math.ceil((world.startedAt - clock) / 1000)) : 0;
  const lastTen = status === "live" && !world.controls.paused && remaining <= 10 && remaining > 0;
  const flags = world.controls.animations;
  const showCount = counting && animationOn(flags, "tradeCountdown");
  const showTen = lastTen && animationOn(flags, "tradeLastTen");
  const show = moment === "open" ? animationOn(flags, "tradeMarketOpen") : moment === "close" ? animationOn(flags, "tradeClosing") : false;
  if (!showCount && !show && !showTen) return null;
  return <div className={`stage stage-${theme} v-${variant} stage-embed${showTen ? " is-last-ten" : ""}`} aria-hidden={!showCount || undefined}>
    {showCount && <CountdownScene seconds={seconds} variant={variant} light={theme === "light"}/>}
    {showTen && <div className="stage-last-ten" key={Math.ceil(remaining)}><PixelText text={String(Math.ceil(remaining))} color="--down"/></div>}
    {show && moment === "open" && <div className="stage-open"><i className="stage-open-burst"/><i className="stage-open-ring"/><strong>Market open</strong></div>}
    {show && moment === "close" && <div className="stage-shutter"><i/><i/><strong>Market closed</strong></div>}
  </div>;
}

/** Announce a filled order so the terminal can celebrate it. */
export function announceTrade(side: string, quantity: number, symbol: string) {
  window.dispatchEvent(new CustomEvent("ds-trade", { detail: { side, quantity, symbol } }));
}

/*
  An order fill: a ring of light and sparks bursts from the order button, and a confirmation chip
  flies up into the portfolio figure in the header, which then glows once.
*/
export function TradeCelebration({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const onTrade = (event: Event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const { side, quantity, symbol } = (event as CustomEvent<{ side: string; quantity: number; symbol: string }>).detail;
      const button = document.querySelector(".execute-button") ?? document.querySelector(".sell-stock-all");
      const target = document.querySelector(".topbar-metrics > div:nth-child(4) b") ?? document.querySelector(".topbar-metrics");
      if (!button) return;
      const from = button.getBoundingClientRect();
      const cx = from.left + from.width / 2, cy = from.top + from.height / 2;
      const tone = side === "Buy" ? "buy" : side === "Short" ? "short" : "sell";
      const layer = document.createElement("div");
      layer.className = `trade-burst trade-${tone}`;
      document.body.appendChild(layer);
      const ring = document.createElement("i");
      ring.className = "trade-ring";
      ring.style.left = `${cx}px`; ring.style.top = `${cy}px`;
      layer.appendChild(ring);
      ring.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(5)", opacity: 0 }], { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)" });
      for (let i = 0; i < 26; i++) {
        const spark = document.createElement("i");
        spark.className = "trade-spark";
        spark.style.left = `${cx}px`; spark.style.top = `${cy}px`;
        layer.appendChild(spark);
        const angle = (i / 26) * Math.PI * 2 + Math.random() * .3, distance = 70 + Math.random() * 110;
        spark.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(.2)`, opacity: 0 }], { duration: 700 + Math.random() * 400, easing: "cubic-bezier(.1,.7,.3,1)" });
      }
      const chip = document.createElement("div");
      chip.className = "trade-chip";
      chip.textContent = `${side === "Buy" ? "Bought" : side === "Short" ? "Shorted" : "Sold"} ${quantity} ${symbol}`;
      chip.style.left = `${cx}px`; chip.style.top = `${cy}px`;
      layer.appendChild(chip);
      const to = target?.getBoundingClientRect();
      const dx = to ? to.left + to.width / 2 - cx : 0, dy = to ? to.top + to.height / 2 - cy : -160;
      chip.animate([
        { transform: "translate(-50%,-50%) scale(.6)", opacity: 0 },
        { transform: "translate(-50%,calc(-50% - 46px)) scale(1.08)", opacity: 1, offset: .25 },
        { transform: "translate(-50%,calc(-50% - 52px)) scale(1)", opacity: 1, offset: .55 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.4)`, opacity: .2 },
      ], { duration: 1500, easing: "cubic-bezier(.5,0,.2,1)" });
      if (target instanceof HTMLElement) window.setTimeout(() => target.animate([{ textShadow: "0 0 0 transparent", transform: "scale(1)" }, { textShadow: "0 0 18px currentColor", transform: "scale(1.18)" }, { textShadow: "0 0 0 transparent", transform: "scale(1)" }], { duration: 650, easing: "ease-out" }), 1350);
      window.setTimeout(() => layer.remove(), 1700);
    };
    window.addEventListener("ds-trade", onTrade);
    return () => window.removeEventListener("ds-trade", onTrade);
  }, [enabled]);
  return null;
}

/**
 * A price coloured by its last move: green after a rise, red after a fall, until the next change.
 * It also glows for a moment as it ticks. Uses the theme's own positive and negative colours.
 */
export function TickPrice({ value, children }: { value: number; children: React.ReactNode }) {
  const last = useRef(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const [tick, setTick] = useState<"up" | "down" | null>(null);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  useEffect(() => {
    const before = last.current;
    last.current = value;
    if (value === before) return;
    const next = value > before ? "up" : "down";
    setDir(next);
    setTick(next);
    setDelta({ value: value - before, key: Date.now() });
    const timer = window.setTimeout(() => setTick(null), 800);
    return () => window.clearTimeout(timer);
  }, [value]);
  return <strong className={`tick-price${dir === "up" ? " positive" : dir === "down" ? " negative" : ""}`} data-dir={dir ?? undefined} data-tick={tick ?? undefined}>{children}{delta && <span className={`tick-delta ${delta.value > 0 ? "up" : "down"}`} key={delta.key} aria-hidden="true">{delta.value > 0 ? "+" : "−"}{Math.abs(delta.value).toFixed(2)}</span>}</strong>;
}
