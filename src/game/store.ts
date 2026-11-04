import type { Mode, Stock, World } from "./types";
import { freshWorld } from "./engine";
import { makeNews } from "./catalog";

type Stored = { version: number; state: World };

type LocalScope = "test" | "preview";
const localStates = new Map<LocalScope, Stored>();
const localQueues = new Map<LocalScope, Promise<void>>();

const url = () => process.env.SUPABASE_URL;
const key = () => process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = () => process.env.MARKET_SIGNING_SECRET;

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!url() || !key() || !secret()) throw new Error("Market services are not configured yet.");
  const response = await fetch(`${url()}/rest/v1/rpc/${name}`, {
    method: "POST", cache: "no-store",
    headers: { apikey: key()!, Authorization: `Bearer ${key()!}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Supabase market request failed", response.status, detail.slice(0, 350));
    throw new Error(response.status === 401 || response.status === 403 ? "Market access is not configured." : "The shared market is temporarily unavailable.");
  }
  return response.json() as Promise<T>;
}

/*
  Storage format. Price history is most of the state (25 companies × hundreds of candles), and every
  update reads and writes the whole row, so candles are stored as compact number rows with times
  relative to the first, delta-encoded in paise (see packWorld). The engine always sees ordinary
  candles; a state saved before this format loads unchanged.
*/
type PackedCandles = { t0: number; rows: number[][] } | { t0: number; p0: number; d: number[] };
type StoredStock = World["stocks"][number] & { packedCandles?: PackedCandles };
// Candles are stored as small whole numbers: time step in milliseconds, prices in paise as
// changes from the previous candle, then volume. About half the size of plain rows.
const paise = (value: number) => Math.round(value * 100);
// The news catalog is rebuilt from its seed (it is the same for every save of a batch), so it is not stored.
const newsSeed = (world: World) => { const match = /^news-v\d+-(\d+)-0$/.exec(world.news[0]?.id ?? ""); return match ? Number(match[1]) : null; };
export function packWorld(world: World): World {
  const seed = newsSeed(world);
  const news = seed !== null && JSON.stringify(world.news) === JSON.stringify(makeNews(seed)) ? [] : world.news;
  return { ...world, news, ...(news.length ? {} : { newsSeed: seed }), stocks: world.stocks.map(stock => {
    const t0 = stock.candles[0]?.time ?? 0;
    let lastTime = t0, lastClose = paise(stock.candles[0]?.open ?? 0);
    const d: number[] = [];
    for (const c of stock.candles) {
      const open = paise(c.open), close = paise(c.close);
      d.push(c.time - lastTime, open - lastClose, paise(c.high) - open, open - paise(c.low), close - open, Math.round(c.volume));
      lastTime = c.time; lastClose = close;
    }
    return { ...stock, candles: [], packedCandles: { t0, p0: paise(stock.candles[0]?.open ?? 0), d } } as StoredStock;
  }) };
}
export function unpackWorld(world: World): World {
  const seed = (world as World & { newsSeed?: number }).newsSeed;
  if (!world.news?.length && typeof seed === "number") world.news = makeNews(seed);
  delete (world as World & { newsSeed?: number }).newsSeed;
  world.stocks = world.stocks.map(raw => {
    const { packedCandles, ...stock } = raw as StoredStock;
    if (!packedCandles) return stock;
    if ("rows" in packedCandles) {
      const { t0, rows } = packedCandles;
      return { ...stock, candles: rows.map(([dt, open, high, low, close, volume]) => ({ time: t0 + dt, open, high, low, close, volume })) };
    }
    const { t0, p0, d } = packedCandles;
    const candles: Stock["candles"] = [];
    let time = t0, close = p0;
    for (let i = 0; i + 5 < d.length; i += 6) {
      time += d[i];
      const open = close + d[i + 1];
      close = open + d[i + 4];
      candles.push({ time, open: open / 100, high: (open + d[i + 2]) / 100, low: (open - d[i + 3]) / 100, close: close / 100, volume: d[i + 5] });
    }
    return { ...stock, candles };
  });
  return world;
}

export async function load(mode: Mode): Promise<Stored | null> {
  const stored = await rpc<Stored | null>("get_game_state", { p_secret: secret(), p_mode: mode });
  if (stored?.state) unpackWorld(stored.state);
  return stored;
}

/*
  A short read cache per server instance. A poll that changes nothing (no tick due, no session
  update) is answered from the state this instance loaded or saved moments ago, instead of reading the
  whole row again. Anything that changes the world is saved against the stored version as before, so
  a stale cache can only cost a retry, never a lost update.
*/
const readCache = new Map<Mode, { version: number; state: World; at: number }>();
const remember = (mode: Mode, version: number, state: World) => readCache.set(mode, { version, state: structuredClone(state), at: Date.now() });

async function mutateLocalTest<T>(update: (world: World) => T | Promise<T>, scope: LocalScope = "test"): Promise<{ world: World; result: T }> {
  const previous = localQueues.get(scope) ?? Promise.resolve();
  let release!: () => void;
  localQueues.set(scope, new Promise<void>(resolve => { release = resolve; }));
  await previous;
  try {
    const stored = localStates.get(scope) ?? null;
    const world = stored?.state ?? freshWorld("test");
    const initialRevision = world.version;
    const result = await update(world);
    if (!stored || world.version !== initialRevision) localStates.set(scope, { version: (stored?.version ?? 0) + 1, state: world });
    return { world, result };
  } finally {
    release();
  }
}

/** `bestEffort` (polls): when another request is saving, skip this save instead of queueing and retrying;
 *  the other request's state wins and this poll still answers with an up-to-date world. */
/* Self-protection: when saves get slow (the database is short of disk throughput), polls write less often
   for a while, so the database recovers instead of falling further behind. */
let slowUntil = 0;
function noteSaveTime(ms: number) { if (ms > 600) slowUntil = Date.now() + 90_000; }
/** True for 90 s after a slow save: polls then move prices at most every 4 s so the database recovers. */
export const databaseSlow = () => Date.now() < slowUntil;
export async function mutate<T>(mode: Mode, update: (world: World) => T | Promise<T>, localOnly = false, readCacheMs = 0, bestEffort = false): Promise<{ world: World; result: T }> {
  // Keep the isolated test market previewable with no Supabase setup during local development.
  // UI previews request this explicitly so they never touch the configured shared store.
  if (localOnly) {
    if (mode !== "test" || process.env.NODE_ENV !== "development") throw new Error("Local previews are only available in development.");
    return mutateLocalTest(update, "preview");
  }
  // Live mode and production always use the shared Supabase store.
  if (mode === "test" && process.env.NODE_ENV === "development" && (!url() || !key() || !secret())) return mutateLocalTest(update);
  // Give up after about 4.5 seconds so no screen waits longer than that for one answer.
  const deadline = Date.now() + 4500;
  for (let attempt = 0; attempt < 14 && (attempt === 0 || Date.now() < deadline); attempt++) {
    const cached = attempt === 0 && readCacheMs > 0 ? readCache.get(mode) : undefined;
    let fromCache = Boolean(cached && Date.now() - cached.at < readCacheMs);
    // Egress: a cached copy up to 20 s old is reused when a ~100-byte version check says nothing changed,
    // instead of downloading the whole game again.
    if (!fromCache && cached && readCacheMs > 0 && Date.now() - cached.at < 20_000) {
      const current = await rpc<number | null>("get_game_version", { p_secret: secret(), p_mode: mode }).catch(() => null);
      if (current === cached.version) { cached.at = Date.now(); fromCache = true; }
    }
    const stored: Stored | null = fromCache && cached ? { version: cached.version, state: structuredClone(cached.state) } : await load(mode);
    if (!fromCache && stored) remember(mode, stored.version, stored.state);
    const world = stored?.state ?? freshWorld(mode);
    const version = stored?.version ?? 0;
    const initialRevision = world.version;
    // A poll that cannot save answers with the last saved state, never with prices that were not kept.
    const before = bestEffort && stored ? structuredClone(stored.state) : null;
    const result = await update(world);
    // Unchanged reads need one database round trip at most, and none when the cache is fresh.
    if (stored && world.version === initialRevision) return { world, result };
    // A poll that only moves prices first asks for the ~100-byte version: if another screen already
    // saved this tick, it answers with that instead of sending the whole game for the database to parse
    // and reject. Without this, every screen shipped a full copy each second and starved the database.
    if (before) {
      const current = await rpc<number | null>("get_game_version", { p_secret: secret(), p_mode: mode }).catch(() => null);
      if (current !== null && current !== version) { readCache.delete(mode); return { world: before, result }; }
    }
    let saved = false;
    const saveStarted = Date.now();
    try { saved = await rpc<boolean>("save_game_state", { p_secret: secret(), p_mode: mode, p_expected_version: version, p_state: packWorld(world) }); }
    catch (error) { noteSaveTime(Date.now() - saveStarted); if (!before) throw error; }
    noteSaveTime(Date.now() - saveStarted);
    if (saved) { remember(mode, version + 1, world); return { world, result }; }
    if (before) return { world: before, result };
    await new Promise(resolve => setTimeout(resolve, Math.min(400, 25 * 2 ** Math.min(attempt, 4) + Math.random() * 40)));
  }
  throw new Error("Market updates are busy. Please try once more.");
}
