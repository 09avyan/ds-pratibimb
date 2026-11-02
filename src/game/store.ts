import type { Mode, World } from "./types";
import { freshWorld } from "./engine";

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
  relative to the first: [time − t0, open, high, low, close, volume]. The engine always sees ordinary
  candles; a state saved before this format loads unchanged.
*/
type PackedCandles = { t0: number; rows: number[][] };
type StoredStock = World["stocks"][number] & { packedCandles?: PackedCandles };
export function packWorld(world: World): World {
  return { ...world, stocks: world.stocks.map(stock => {
    const t0 = stock.candles[0]?.time ?? 0;
    return { ...stock, candles: [], packedCandles: { t0, rows: stock.candles.map(c => [c.time - t0, c.open, c.high, c.low, c.close, c.volume]) } } as StoredStock;
  }) };
}
export function unpackWorld(world: World): World {
  world.stocks = world.stocks.map(raw => {
    const { packedCandles, ...stock } = raw as StoredStock;
    if (!packedCandles) return stock;
    const { t0, rows } = packedCandles;
    return { ...stock, candles: rows.map(([dt, open, high, low, close, volume]) => ({ time: t0 + dt, open, high, low, close, volume })) };
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

export async function mutate<T>(mode: Mode, update: (world: World) => T | Promise<T>, localOnly = false, readCacheMs = 0): Promise<{ world: World; result: T }> {
  // Keep the isolated test market previewable with no Supabase setup during local development.
  // UI previews request this explicitly so they never touch the configured shared store.
  if (localOnly) {
    if (mode !== "test" || process.env.NODE_ENV !== "development") throw new Error("Local previews are only available in development.");
    return mutateLocalTest(update, "preview");
  }
  // Live mode and production always use the shared Supabase store.
  if (mode === "test" && process.env.NODE_ENV === "development" && (!url() || !key() || !secret())) return mutateLocalTest(update);
  for (let attempt = 0; attempt < 14; attempt++) {
    const cached = attempt === 0 && readCacheMs > 0 ? readCache.get(mode) : undefined;
    const fromCache = Boolean(cached && Date.now() - cached.at < readCacheMs);
    const stored: Stored | null = fromCache && cached ? { version: cached.version, state: structuredClone(cached.state) } : await load(mode);
    if (!fromCache && stored) remember(mode, stored.version, stored.state);
    const world = stored?.state ?? freshWorld(mode);
    const version = stored?.version ?? 0;
    const initialRevision = world.version;
    const result = await update(world);
    // Unchanged reads need one database round trip at most, and none when the cache is fresh.
    if (stored && world.version === initialRevision) return { world, result };
    const saved = await rpc<boolean>("save_game_state", { p_secret: secret(), p_mode: mode, p_expected_version: version, p_state: packWorld(world) });
    if (saved) { remember(mode, version + 1, world); return { world, result }; }
    await new Promise(resolve => setTimeout(resolve, Math.min(75, 10 + attempt * 5 + Math.random() * 15)));
  }
  throw new Error("Market updates are busy. Please try once more.");
}
