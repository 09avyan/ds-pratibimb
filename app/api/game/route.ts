import { NextRequest, NextResponse } from "next/server";
import { advance, executeTrade, hostAction, newPlayer, settle, toPublic } from "@/game/engine";
import { TERMINAL_COUNT } from "@/game/terminals";
import { mutate } from "@/game/store";
import type { Mode, World } from "@/game/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const modeOf = (value: string | null): Mode => value === "test" ? "test" : "live";
const validSession = (value: string) => /^[\w-]{8,80}$/.test(value) && !["__proto__", "constructor", "prototype"].includes(value);
const readTerminal = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const terminal = Number(value);
  if (!Number.isInteger(terminal) || terminal < 1 || terminal > TERMINAL_COUNT) throw new Error(`Terminal numbers must be from 01 to ${String(TERMINAL_COUNT).padStart(2, "0")}.`);
  return terminal;
};
const errorResponse = (error: unknown, status = 400) => NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong." }, { status, headers: { "Cache-Control": "no-store" } });
function touchSession(state: World, sessionId: string, terminalNumber?: number) {
  const now = Date.now();
  let player = state.sessions[sessionId];
  if (!player) {
    player = newPlayer(sessionId, state.batch, now, true, terminalNumber);
    if (state.status === "closed") player.ended = true;
    state.sessions[sessionId] = player;
    state.version++;
  } else {
    if (player.batch !== state.batch && (state.status === "countdown" || state.status === "live")) {
      player = newPlayer(sessionId, state.batch, now, player.included, terminalNumber ?? player.terminalNumber);
      state.sessions[sessionId] = player;
      state.version++;
    }
    if (terminalNumber && player.terminalNumber !== terminalNumber) { player.terminalNumber = terminalNumber; state.version++; }
    if (now - (player.lastSeenAt ?? 0) >= 10_000) { player.lastSeenAt = now; state.version++; }
  }
  return player;
}

export async function GET(request: NextRequest) {
  const mode = modeOf(request.nextUrl.searchParams.get("mode"));
  const localPreview = request.nextUrl.searchParams.get("preview") === "1";
  if (localPreview && (mode !== "test" || process.env.NODE_ENV !== "development")) return NextResponse.json({ error: "Local preview is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const sessionId = request.nextUrl.searchParams.get("session");
  const selectedStock = request.nextUrl.searchParams.get("selected") ?? "RELIANCE";
  const includeCandles = request.nextUrl.searchParams.get("chart") !== "0";
  const candlesSinceValue = request.nextUrl.searchParams.get("candlesSince");
  const candlesSince = candlesSinceValue && Number.isFinite(Number(candlesSinceValue)) ? Number(candlesSinceValue) : undefined;
  const knownRevisionValue = request.nextUrl.searchParams.get("revision");
  const knownRevision = knownRevisionValue && Number.isSafeInteger(Number(knownRevisionValue)) ? Number(knownRevisionValue) : undefined;
  let terminalNumber: number | undefined;
  if (sessionId && !validSession(sessionId)) return errorResponse(new Error("Invalid device session."));
  try { terminalNumber = readTerminal(request.nextUrl.searchParams.get("terminal")); }
  catch (error) { return errorResponse(error); }
  if (sessionId && !terminalNumber) return errorResponse(new Error(mode === "test" ? "Open a numbered practice terminal, from /test/01 through /test/10." : "Open your numbered terminal URL, from /play/01 through /play/10."));
  try {
    const { world } = await mutate(mode, state => {
      advance(state);
      if (sessionId) touchSession(state, sessionId, terminalNumber);
    }, localPreview);
    if (knownRevision === world.version) return new NextResponse(null, { status: 304, headers: { "Cache-Control": "no-store, max-age=0" } });
    return NextResponse.json(toPublic(world, sessionId, selectedStock, { includeCandles, candlesSince }), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return errorResponse(error, 503); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = modeOf(body.mode);
    const localPreview = body.localPreview === true;
    if (localPreview && (mode !== "test" || process.env.NODE_ENV !== "development")) return NextResponse.json({ error: "Local preview is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const sessionId = String(body.sessionId ?? "");
    const action = String(body.action ?? "");
    const terminalNumber = readTerminal(body.terminal);
    if (!terminalNumber) return errorResponse(new Error(mode === "test" ? "A terminal code is required. Open /test/01 through /test/10." : "A terminal code is required. Open /play/01 through /play/10."));
    if (!validSession(sessionId)) return errorResponse(new Error("Refresh to create a device session."));
    const requestId = typeof body.requestId === "string" && /^[\w-]{8,80}$/.test(body.requestId) ? body.requestId : undefined;
    if (action === "trade" && !["Buy", "Sell", "Short"].includes(body.side)) return errorResponse(new Error("Choose Buy, Sell or Short."));
    const { world, result } = await mutate(mode, state => {
      advance(state);
      const player = touchSession(state, sessionId, terminalNumber);
      if (action === "trade") {
        const existing = requestId ? player.history.find(trade => trade.requestId === requestId) : null;
        if (existing) {
          if (existing.side !== body.side || existing.symbol !== String(body.symbol ?? "") || existing.qty !== Number(body.quantity)) throw new Error("This submission ID already belongs to a different order.");
          return existing;
        }
        const trade = executeTrade(state, player, body.side, String(body.symbol ?? ""), Number(body.quantity));
        trade.requestId = requestId; player.lastSeenAt = Date.now(); return trade;
      }
      if (action === "end") {
        if (player.ended) return null;
        settle(state, player, Date.now()); state.version++; return null;
      }
      if (action === "sandbox-start") {
        if (mode !== "test") throw new Error("Practice rounds are only available in the isolated test market.");
        if (state.status !== "closed" && state.status !== "ready") throw new Error("Wait for the current practice round to finish.");
        hostAction(state, "start");
        return null;
      }
      if (action === "news-read") return state.latestNewsId;
      throw new Error("Choose a valid market action.");
    }, localPreview);
    const candlesSinceValue = body.candlesSince;
    const candlesSince = typeof candlesSinceValue === "number" && Number.isFinite(candlesSinceValue) ? candlesSinceValue : undefined;
    const includeCandles = body.includeCandles !== false;
    return NextResponse.json({ ...toPublic(world, sessionId, String(body.selectedStock ?? body.symbol ?? "RELIANCE"), { includeCandles, candlesSince }), result }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return errorResponse(error); }
}
