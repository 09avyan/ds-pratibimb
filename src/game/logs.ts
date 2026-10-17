import type { GameLog, World } from "./types";
export const MAX_GAME_LOGS = 1500;
export function recordGameLog(world: World, event: Omit<GameLog, "id" | "batch" | "elapsedSeconds"> & { batch?: number }) {
  const entry: GameLog = { ...event, id: crypto.randomUUID(), batch: event.batch ?? world.batch, elapsedSeconds: Math.max(0, Math.round(world.duration - world.remaining)), message: event.message.slice(0, 1200) };
  world.logs = [entry, ...(world.logs ?? [])].slice(0, MAX_GAME_LOGS);
  world.version++;
  return entry;
}
export function recentOrderDifficulty(world: World, at: number) {
  const rejected = (world.logs ?? []).filter(log => log.batch === world.batch && log.kind === "order-rejected" && log.at >= at - 60_000 && log.at <= at);
  return { rejectedOrders: rejected.length, strugglingTerminals: new Set(rejected.map(log => log.terminalNumber).filter(Boolean)).size };
}
