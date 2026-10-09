import { NextRequest, NextResponse } from "next/server";
import { advance, executeTrade, newPlayer, toPublic } from "@/game/engine";
import { mutate } from "@/game/store";
import type { Mode } from "@/game/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const modeOf = (value: string | null): Mode => value === "test" ? "test" : "live";
const errorResponse = (error: unknown, status = 400) => NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong." }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const mode = modeOf(request.nextUrl.searchParams.get("mode"));
  const sessionId = request.nextUrl.searchParams.get("session");
  try {
    const { world } = await mutate(mode, state => { advance(state); if (sessionId && !state.sessions[sessionId]) state.sessions[sessionId] = newPlayer(sessionId, state.batch); });
    return NextResponse.json(toPublic(world, sessionId), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return errorResponse(error, 503); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = modeOf(body.mode);
    const sessionId = String(body.sessionId ?? "");
    const action = String(body.action ?? "");
    if (!/^[\w-]{8,80}$/.test(sessionId)) return errorResponse(new Error("Refresh to create a device session."));
    const { world, result } = await mutate(mode, state => {
      advance(state);
      if (!state.sessions[sessionId]) state.sessions[sessionId] = newPlayer(sessionId, state.batch);
      const player = state.sessions[sessionId];
      if (action === "trade") return executeTrade(state, player, body.side, String(body.symbol ?? ""), Number(body.quantity));
      if (action === "end") {
        if (player.ended) return null;
        for (const [symbol, short] of Object.entries(player.shorts)) {
          const px = state.stocks.find(s => s.symbol === symbol)?.price ?? short.avg;
          const realized = (short.avg - px) * short.qty; player.cash -= px * short.qty;
          player.history.unshift({ id: crypto.randomUUID(), symbol, side: "Auto-cover", qty: short.qty, price: px, time: Date.now(), realized, note: "Short settled when you ended the session" });
        }
        player.shorts = {}; player.ended = true; return null;
      }
      if (action === "news-read") return state.latestNewsId;
      throw new Error("Choose a valid market action.");
    });
    return NextResponse.json({ ...toPublic(world, sessionId), result }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return errorResponse(error); }
}
