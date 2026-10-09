import type { Mode, World } from "./types";
import { freshWorld } from "./engine";

type Stored = { version: number; state: World };

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

export async function load(mode: Mode): Promise<Stored | null> {
  return rpc<Stored | null>("get_game_state", { p_secret: secret(), p_mode: mode });
}

export async function mutate<T>(mode: Mode, update: (world: World) => T | Promise<T>): Promise<{ world: World; result: T }> {
  for (let attempt = 0; attempt < 14; attempt++) {
    const stored = await load(mode);
    const world = stored?.state ?? freshWorld(mode);
    const version = stored?.version ?? 0;
    const initialRevision = world.version;
    const result = await update(world);
    // Unchanged reads need only one database round trip; never cache trade state.
    if (stored && world.version === initialRevision) return { world, result };
    const saved = await rpc<boolean>("save_game_state", { p_secret: secret(), p_mode: mode, p_expected_version: version, p_state: world });
    if (saved) return { world, result };
    await new Promise(resolve => setTimeout(resolve, Math.min(75, 10 + attempt * 5 + Math.random() * 15)));
  }
  throw new Error("Market updates are busy. Please try once more.");
}
