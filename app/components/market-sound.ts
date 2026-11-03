"use client";

import { useEffect, useRef, useState } from "react";

/*
  Market sounds, synthesised with Web Audio (no audio files to download or fail).

  The bell is modelled on an exchange's electric trading bell: a hammer striking a brass gong about
  eighteen times a second, so it rings as one continuous, shimmering "brrrring" for a few seconds. Each
  strike excites the gong's inharmonic partials (a slightly detuned pair at each partial gives the
  metallic beating), adds a short hammer click, and everything rings on in a hall reverb. The closing
  bell rings the same way and ends with three gavel knocks. The countdown is a soft wooden tick per
  second, rising in pitch towards the open.
*/

export type BellKind = "open" | "close";

type Rig = { ctx: AudioContext; out: AudioNode; dry: GainNode; wet: GainNode };
const rigs = new WeakMap<AudioContext, Rig>();

/** A hall: a decaying noise impulse response, so every sound rings on naturally in the room. */
function rig(ctx: AudioContext): Rig {
  const existing = rigs.get(ctx);
  if (existing) return existing;
  const master = ctx.createGain();
  master.gain.value = .95;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 8; limiter.attack.value = .003; limiter.release.value = .25;
  master.connect(limiter).connect(ctx.destination);
  const seconds = 2.6, rate = ctx.sampleRate, length = Math.floor(seconds * rate);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse;
  const dry = ctx.createGain(); dry.gain.value = .78;
  const wet = ctx.createGain(); wet.gain.value = .34;
  dry.connect(master); wet.connect(reverb).connect(master);
  const input = ctx.createGain();
  input.connect(dry); input.connect(wet);
  const made = { ctx, out: input, dry, wet };
  rigs.set(ctx, made);
  return made;
}

// Partials of a struck brass gong (ratio, level, decay seconds). Each is played as a detuned pair.
const GONG: [number, number, number][] = [[1, 1, 2.4], [2.32, .62, 1.7], [4.25, .4, 1.1], [6.63, .24, .7], [9.38, .13, .45]];

function gongStrike(ctx: AudioContext, out: AudioNode, at: number, base: number, level: number) {
  for (const [ratio, amp, decay] of GONG) for (const detune of [-1.6, 1.6]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = base * ratio + detune * ratio;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level * amp * .5, at + .002);
    gain.gain.exponentialRampToValueAtTime(.0001, at + decay);
    osc.connect(gain).connect(out);
    osc.start(at); osc.stop(at + decay + .05);
  }
}

let noiseBuffer: AudioBuffer | null = null;
function noise(ctx: AudioContext) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * .25);
  noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

/** A short filtered noise burst: the hammer's click, or the wood of a gavel. */
function knock(ctx: AudioContext, out: AudioNode, at: number, frequency: number, q: number, level: number, length: number) {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass"; filter.frequency.value = frequency; filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, at);
  gain.gain.exponentialRampToValueAtTime(.0001, at + length);
  source.connect(filter).connect(gain).connect(out);
  source.start(at); source.stop(at + length + .02);
}

/**
 * The electric trading bell. The gong keeps ringing while the hammer re-strikes it ~18 times a second:
 * one sustained oscillator pair per partial, its loudness re-struck by a precomputed envelope (a sharp
 * rise and quick fall each strike over a ringing floor), then the gong rings out on its own.
 */
function electricBell(ctx: AudioContext, out: AudioNode, start: number, seconds: number) {
  const rate = 18, period = 1 / rate, points = 700;
  for (const [ratio, amp, decay] of GONG) {
    const tail = decay * 1.4;
    const length = Math.ceil((seconds + tail) * points);
    const curve = new Float32Array(length);
    const ring = .012 + .02 / ratio; // higher partials fall faster after each strike
    for (let i = 0; i < length; i++) {
      const t = i / points;
      let value: number;
      if (t < seconds) {
        const swell = Math.min(1, t / .06) * (t > seconds - .2 ? .65 + .35 * (seconds - t) / .2 : 1);
        value = swell * (.5 + .5 * Math.exp(-(t % period) / ring));
      } else value = .65 * Math.exp(-(t - seconds) / (decay * .45));
      curve[i] = value * amp * .11;
    }
    curve[length - 1] = 0;
    for (const detune of ratio < 3 ? [-1.8, 1.8] : [0]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 760 * ratio + detune * ratio;
      gain.gain.value = 0;
      gain.gain.setValueCurveAtTime(curve, start, seconds + tail);
      osc.connect(gain).connect(out);
      osc.start(start); osc.stop(start + seconds + tail + .05);
    }
  }
  // The hammer's click on each strike.
  const strikes = Math.round(seconds * rate);
  for (let i = 0; i < strikes; i++) knock(ctx, out, start + i * period, 3400, 1.4, .045 * Math.min(1, (i + 1) / 3), .025);
}

export function ringBell(ctx: AudioContext, kind: BellKind) {
  const { out } = rig(ctx);
  const now = ctx.currentTime + .05;
  if (kind === "open") { electricBell(ctx, out, now, 4.2); return; }
  electricBell(ctx, out, now, 3.6);
  // The gavel: three firm knocks once the bell stops.
  for (let i = 0; i < 3; i++) {
    const at = now + 4.1 + i * .55;
    knock(ctx, out, at, 700, 1.3, 2.4, .09);   // the crack of wood on wood
    const thump = ctx.createOscillator();      // the body of the block
    const gain = ctx.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(150, at);
    thump.frequency.exponentialRampToValueAtTime(62, at + .14);
    gain.gain.setValueAtTime(.75, at);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .2);
    thump.connect(gain).connect(out);
    thump.start(at); thump.stop(at + .22);
  }
}

/** One countdown second: a soft wooden tick with a short tone, a step higher each second. */
export function countdownTick(ctx: AudioContext, secondsLeft: number) {
  const { out } = rig(ctx);
  const at = ctx.currentTime + .02;
  const pitch = 520 + (5 - Math.min(5, Math.max(1, secondsLeft))) * 70;
  knock(ctx, out, at, 1800, 3, .8, .045);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle"; osc.frequency.value = pitch;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(.5, at + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, at + .32);
  osc.connect(gain).connect(out);
  osc.start(at); osc.stop(at + .35);
}

/** A soft confirmation chime when sound is unlocked. */
function chime(ctx: AudioContext) {
  const { out } = rig(ctx);
  gongStrike(ctx, out, ctx.currentTime + .05, 1180, .12);
}

type SoundWorld = { batch: number; status: "ready" | "countdown" | "live" | "closed"; startedAt: number } | null;

/**
 * Bells at the open and the close, and a tick each countdown second. Works in a background tab: the
 * caller keeps the world updating while hidden, and an unlocked AudioContext still plays there.
 * Browsers keep sound off until the page is touched once; `needsTap` says when to ask.
 */
export function useMarketSound(world: SoundWorld, enabled: boolean, countdown = true) {
  const ctxRef = useRef<AudioContext | null>(null);
  const previous = useRef<{ batch: number; status: string } | null>(null);
  const lastTick = useRef<string>("");
  const [needsTap, setNeedsTap] = useState(false);
  const context = () => {
    if (!ctxRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    return ctxRef.current;
  };
  useEffect(() => {
    const unlock = () => {
      const ctx = context();
      if (!ctx) return;
      const wasLocked = ctx.state !== "running";
      void ctx.resume().then(() => {
        if (ctx.state !== "running") return;
        setNeedsTap(false);
        if (wasLocked) chime(ctx);
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
  const play = (fn: (ctx: AudioContext) => void) => {
    const ctx = context();
    if (!ctx) return;
    if (ctx.state === "running") fn(ctx); else void ctx.resume().then(() => { if (ctx.state === "running") fn(ctx); else setNeedsTap(true); });
  };
  // Bells.
  useEffect(() => {
    if (!world) return;
    const before = previous.current;
    previous.current = { batch: world.batch, status: world.status };
    if (!before || !enabled) return;
    const opened = world.status === "live" && (before.status === "countdown" || before.status === "ready" || before.status === "closed" || before.batch !== world.batch);
    const closed = world.status === "closed" && before.status === "live" && before.batch === world.batch;
    if (opened || closed) play(ctx => ringBell(ctx, opened ? "open" : "close"));
  }, [world?.status, world?.batch, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  // Countdown ticks, from a timer of its own so a background tab still hears each second.
  useEffect(() => {
    if (!enabled || !countdown || world?.status !== "countdown") return;
    const startedAt = world.startedAt, batch = world.batch;
    const check = () => {
      const left = Math.ceil((startedAt - Date.now()) / 1000);
      const key = `${batch}:${left}`;
      if (left < 1 || left > 10 || lastTick.current === key) return;
      lastTick.current = key;
      play(ctx => countdownTick(ctx, left));
    };
    check();
    const timer = window.setInterval(check, 100);
    return () => window.clearInterval(timer);
  }, [world?.status, world?.startedAt, world?.batch, enabled, countdown]); // eslint-disable-line react-hooks/exhaustive-deps
  return { needsTap, test: (kind: BellKind) => play(ctx => ringBell(ctx, kind)) };
}

/**
 * A steady one-second beat that keeps running in a background tab. Browsers slow ordinary timers in
 * hidden tabs (to once a minute after a while); a worker's timer is not slowed, so a screen that is not
 * on top still learns the market opened or closed in time to ring the bell.
 */
export function useSteadyBeat(callback: () => void, ms: number, active: boolean) {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (!active) return;
    let worker: Worker | null = null;
    let url = "";
    try {
      url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms});`], { type: "text/javascript" }));
      worker = new Worker(url);
      worker.onmessage = () => saved.current();
    } catch {
      worker = null;
    }
    const fallback = worker ? 0 : window.setInterval(() => saved.current(), ms);
    return () => { worker?.terminate(); if (url) URL.revokeObjectURL(url); if (fallback) window.clearInterval(fallback); };
  }, [ms, active]);
}
