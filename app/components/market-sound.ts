"use client";

import { useEffect, useRef, useState } from "react";

/*
  Market sounds, synthesised with Web Audio (no audio files to download or fail).

  The bell is modelled on an exchange's electric trading bell (see renderBell): a hammer striking a brass
  gong about seventeen times a second, the gong's modes ringing and overlapping, a crowd applauding, all
  in a hall reverb. The closing bell ends with three gavel knocks. The countdown is a soft wooden tick per
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

/*
  The bell is rendered sample by sample, the way a real one makes sound: a bank of resonators, one per
  vibration mode of a brass gong, each struck by the hammer and left ringing. Strikes land about 17 times
  a second with small changes in timing and force (a real armature is never exact), so successive rings
  overlap and beat against each other; when the hammer stops the gong rings out on its own. A crowd
  applauds underneath, as on an exchange floor at the open and the close.
*/
// Vibration modes of a ~25 cm alarm-bell gong: frequency ratio to the lowest mode, level, ring time (s).
// Close pairs (1 / 1.0036, 2.63 / 2.655) are the slightly unequal halves of the dome; they beat.
const MODES: [number, number, number][] = [[1, 1, 3.4], [1.0036, .72, 3.1], [2.63, .55, 1.9], [2.655, .34, 1.8], [4.84, .34, 1.05], [7.46, .2, .62], [10.4, .13, .36], [13.7, .07, .22]];
const BELL_HZ = 690;

function random(seed: number) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) / 4294967296); }; }

/** The bell itself, stereo, `ring` seconds of hammering and then the natural ring-out. */
function renderBell(rate: number, ring: number, seed: number): [Float32Array, Float32Array] {
  const length = Math.ceil((ring + 3.2) * rate);
  const left = new Float32Array(length), right = new Float32Array(length);
  const rnd = random(seed);
  // Strike times and forces: the armature spins up over the first strikes, then runs ~17 Hz with jitter.
  const strikes: { at: number; force: number }[] = [];
  for (let t = 0, i = 0; t < ring; i++) {
    strikes.push({ at: Math.floor(t * rate), force: (.82 + rnd() * .18) * Math.min(1, .55 + i * .15) });
    const hz = 17.2 * (1 + (rnd() - .5) * .1) * Math.min(1, .7 + i * .1);
    t += 1 / hz;
  }
  // The hammer's contact is a very short pulse (about 0.7 ms); a hard hit excites the high modes more.
  const pulse = Math.max(3, Math.round(rate * .0007));
  const excitation = new Float32Array(length);
  for (const { at, force } of strikes) for (let k = 0; k < pulse && at + k < length; k++) excitation[at + k] += force * Math.sin(Math.PI * (k + .5) / pulse);
  MODES.forEach(([ratio, level, t60], index) => {
    const f = BELL_HZ * ratio * (1 + (rnd() - .5) * .002);
    const r = Math.exp(-6.91 / (t60 * rate)), w = 2 * Math.PI * f / rate;
    const a1 = 2 * r * Math.cos(w), a2 = -r * r, gain = level * Math.sin(w) * .9;
    const pan = .5 + (index % 2 ? .18 : -.18) * (index / MODES.length + .3);
    let y1 = 0, y2 = 0;
    for (let n = 0; n < length; n++) {
      const y = a1 * y1 + a2 * y2 + excitation[n] * gain;
      y2 = y1; y1 = y;
      left[n] += y * (1 - pan); right[n] += y * pan;
    }
  });
  // The click of metal on metal at each strike, small and bright.
  for (const { at, force } of strikes) {
    let lp = 0;
    for (let k = 0; k < Math.round(rate * .004) && at + k < length; k++) {
      const env = Math.exp(-k / (rate * .0009));
      const v = (rnd() * 2 - 1) * env;
      const hp = v - lp; lp += (v - lp) * .35;
      left[at + k] += hp * .05 * force; right[at + k] += hp * .05 * force;
    }
  }
  return [left, right];
}

/** Applause from a crowd of about seventy, each clapping at their own pace, with a little cheering. */
function renderApplause(rate: number, seconds: number, startAt: number, seed: number): [Float32Array, Float32Array] {
  const length = Math.ceil((startAt + seconds + 2.5) * rate);
  const left = new Float32Array(length), right = new Float32Array(length);
  const rnd = random(seed);
  const swell = (t: number) => t < startAt ? 0 : Math.min(1, (t - startAt) / 1.1) * (t > startAt + seconds ? Math.max(0, 1 - (t - startAt - seconds) / 2.4) : 1);
  for (let person = 0; person < 70; person++) {
    const hz = 3 + rnd() * 2.4, pan = rnd(), body = .18 + rnd() * .5, loud = .5 + rnd() * .5;
    const clapLength = Math.round(rate * (.012 + rnd() * .01));
    for (let t = startAt + rnd() * .6; t < startAt + seconds + 2.4; t += (1 / hz) * (1 + (rnd() - .5) * .16)) {
      const level = swell(t) * loud;
      if (level <= 0.01) continue;
      const at = Math.floor(t * rate); let lp = 0;
      for (let k = 0; k < clapLength && at + k < length; k++) {
        const v = (rnd() * 2 - 1) * Math.exp(-k / (clapLength * .22));
        lp += (v - lp) * body;           // each pair of hands has its own colour
        const x = (v - lp * .6) * level * .045;
        left[at + k] += x * (1 - pan); right[at + k] += x * pan;
      }
    }
  }
  // A low murmur and cheer of the floor under the clapping.
  let a = 0, b = 0;
  for (let n = 0; n < length; n++) {
    const t = n / rate, level = swell(t);
    if (!level) continue;
    const v = rnd() * 2 - 1; a += (v - a) * .045; b += (a - b) * .06;
    const wave = .55 + .45 * Math.sin(t * 2.1 + Math.sin(t * .7) * 2);
    left[n] += b * level * wave * .5; right[n] += b * level * (1.1 - wave * .4) * .5;
  }
  return [left, right];
}

/** Bells are rendered once per page (about 40 ms) and kept, so ringing them later costs nothing. */
const bellCache = new WeakMap<BaseAudioContext, Partial<Record<BellKind, AudioBuffer>>>();
function bellBuffer(ctx: BaseAudioContext, kind: BellKind) {
  const cached = bellCache.get(ctx) ?? {};
  if (cached[kind]) return cached[kind]!;
  const rate = ctx.sampleRate, ring = kind === "open" ? 4.4 : 3.6;
  const [bl, br] = renderBell(rate, ring, kind === "open" ? 7 : 11);
  const [al, ar] = renderApplause(rate, ring + (kind === "open" ? .8 : 1.6), .35, kind === "open" ? 3 : 5);
  const length = Math.max(bl.length, al.length);
  const buffer = ctx.createBuffer(2, length, rate);
  const outL = buffer.getChannelData(0), outR = buffer.getChannelData(1);
  let peak = 0;
  for (let n = 0; n < length; n++) {
    outL[n] = (bl[n] ?? 0) + (al[n] ?? 0) * .9; outR[n] = (br[n] ?? 0) + (ar[n] ?? 0) * .9;
    peak = Math.max(peak, Math.abs(outL[n]), Math.abs(outR[n]));
  }
  const scale = peak > 0 ? .62 / peak : 1;
  for (let n = 0; n < length; n++) { outL[n] *= scale; outR[n] *= scale; }
  cached[kind] = buffer; bellCache.set(ctx, cached);
  return buffer;
}

export function ringBell(ctx: AudioContext, kind: BellKind) {
  const { out } = rig(ctx);
  const now = ctx.currentTime + .05;
  const source = ctx.createBufferSource();
  source.buffer = bellBuffer(ctx, kind);
  source.connect(out);
  source.start(now);
  if (kind === "open") return;
  // The gavel: three firm knocks once the bell stops.
  for (let i = 0; i < 3; i++) {
    const at = now + 4.0 + i * .55;
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

/** Renders both bells ahead of time, once sound is unlocked, so the first ring starts instantly. */
function warmBells(ctx: AudioContext) {
  const run = () => { bellBuffer(ctx, "open"); bellBuffer(ctx, "close"); };
  const idle = (window as unknown as { requestIdleCallback?: (fn: () => void) => void }).requestIdleCallback;
  if (idle) idle(run); else window.setTimeout(run, 200);
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

/**
 * The winner reveal: a snare roll that swells for `roll` seconds starting `delay` seconds from now,
 * then a cymbal crash, a bass hit and a bright major chord, "ta-da".
 */
export function fanfare(ctx: AudioContext, delay: number, roll = 1.6) {
  const { out } = rig(ctx);
  const start = ctx.currentTime + delay;
  for (let t = 0; t < roll; t += 1 / 22) {
    const swell = .25 + .75 * (t / roll) ** 1.6;
    knock(ctx, out, start + t + (Math.sin(t * 91) * .004), 2400, .7, .9 * swell, .05);
  }
  const hit = start + roll;
  // Cymbal: bright noise with a long tail.
  const crash = ctx.createBufferSource(); crash.buffer = noise(ctx); crash.loop = true;
  const high = ctx.createBiquadFilter(); high.type = "highpass"; high.frequency.value = 5200;
  const crashGain = ctx.createGain();
  crashGain.gain.setValueAtTime(0, hit); crashGain.gain.linearRampToValueAtTime(.55, hit + .01); crashGain.gain.exponentialRampToValueAtTime(.0001, hit + 2.4);
  crash.connect(high).connect(crashGain).connect(out); crash.start(hit); crash.stop(hit + 2.5);
  // Bass drum.
  const kick = ctx.createOscillator(); const kickGain = ctx.createGain();
  kick.type = "sine"; kick.frequency.setValueAtTime(120, hit); kick.frequency.exponentialRampToValueAtTime(45, hit + .3);
  kickGain.gain.setValueAtTime(1, hit); kickGain.gain.exponentialRampToValueAtTime(.0001, hit + .45);
  kick.connect(kickGain).connect(out); kick.start(hit); kick.stop(hit + .5);
  // Brass chord: C major, a short pickup then the held chord.
  const brass = ctx.createBiquadFilter(); brass.type = "lowpass"; brass.frequency.setValueAtTime(900, hit); brass.frequency.linearRampToValueAtTime(2600, hit + .15);
  brass.connect(out);
  [[523.25, 0], [659.25, 0], [783.99, 0], [1046.5, 0]].forEach(([frequency], i) => {
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sawtooth"; osc.frequency.value = frequency; osc.detune.value = detune;
      gain.gain.setValueAtTime(0, hit); gain.gain.linearRampToValueAtTime(.05 - i * .006, hit + .04); gain.gain.setValueAtTime(.05 - i * .006, hit + .9); gain.gain.exponentialRampToValueAtTime(.0001, hit + 1.9);
      osc.connect(gain).connect(brass); osc.start(hit); osc.stop(hit + 2);
    }
  });
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
        if (wasLocked) { chime(ctx); warmBells(ctx); }
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
  return { needsTap, test: (kind: BellKind) => play(ctx => ringBell(ctx, kind)), fanfare: (delay: number) => { if (enabled) play(ctx => fanfare(ctx, delay)); } };
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
