import { NextRequest, NextResponse } from "next/server";
import { advance, executeTrade, newPlayer, toPublic } from "@/game/engine";
import { mutate } from "@/game/store";
import type { Mode } from "@/game/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const modeOf = (value: string | null): Mode => value === "test" ? "test" : "live";
const validSession = (value: string) => /^[\w-]{8,80}$/.test(value) && !["__proto__", "constructor", "prototype"].includes(value);
const readTerminal = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const terminal = Number(value);
  if (!Number.isInteger(terminal) || terminal < 1 || terminal > 12) throw new Error("Terminal numbers must be from 01 to 12.");
  return terminal;
};
const errorResponse = (error: unknown, status = 400) => NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong." }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const mode = modeOf(request.nextUrl.searchParams.get("mode"));
  const sessionId = request.nextUrl.searchParams.get("session");
  const selectedStock = request.nextUrl.searchParams.get("selected") ?? "RELIANCE";
  let terminalNumber: number | undefined;
  if (sessionId && !validSession(sessionId)) return errorResponse(new Error("Invalid device session."));
  try { terminalNumber = readTerminal(request.nextUrl.searchParams.get("terminal")); }
  catch (error) { return errorResponse(error); }
  try {
    const { world } = await mutate(mode, state => {
      advance(state);
      if (sessionId && !state.sessions[sessionId]) { state.sessions[sessionId] = newPlayer(sessionId, state.batch, Date.now(), true, terminalNumber); state.version++; }
      const player = sessionId ? state.sessions[sessionId] : null;
      if (player && terminalNumber && player.terminalNumber !== terminalNumber) { player.terminalNumber = terminalNumber; state.version++; }
      if (player && Date.now() - (player.lastSeenAt ?? 0) >= 10_000) { player.lastSeenAt = Date.now(); state.version++; }
    });
    return NextResponse.json(toPublic(world, sessionId, selectedStock), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return errorResponse(error, 503); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = modeOf(body.mode);
    const sessionId = String(body.sessionId ?? "");
    const action = String(body.action ?? "");
    const terminalNumber = readTerminal(body.terminal);
    if (!validSession(sessionId)) return errorResponse(new Error("Refresh to create a device session."));
    const requestId = typeof body.requestId === "string" && /^[\w-]{8,80}$/.test(body.requestId) ? body.requestId : undefined;
    if (action === "trade" && !["Buy", "Sell", "Short"].includes(body.side)) return errorResponse(new Error("Choose Buy, Sell or Short."));
    const { world, result } = await mutate(mode, state => {
      advance(state);
      if (!state.sessions[sessionId]) { state.sessions[sessionId] = newPlayer(sessionId, state.batch, Date.now(), true, terminalNumber); state.version++; }
      const player = state.sessions[sessionId];
      if (terminalNumber && player.terminalNumber !== terminalNumber) { player.terminalNumber = terminalNumber; state.version++; }
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
        for (const [symbol, short] of Object.entries(player.shorts)) {
          const px = state.stocks.find(s => s.symbol === symbol)?.price ?? short.avg;
          const realized = (short.avg - px) * short.qty; player.cash -= px * short.qty;
          player.history.unshift({ id: crypto.randomUUID(), symbol, side: "Auto-cover", qty: short.qty, price: px, time: Date.now(), realized, note: "Short settled when you ended the session" });
        }
        player.shorts = {}; player.ended = true; state.version++; return null;
      }
      if (action === "news-read") return state.latestNewsId;
      throw new Error("Choose a valid market action.");
    });
    return NextResponse.json({ ...toPublic(world, sessionId, String(body.selectedStock ?? body.symbol ?? "RELIANCE")), result }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return errorResponse(error); }
}
