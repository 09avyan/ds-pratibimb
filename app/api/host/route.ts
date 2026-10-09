import { NextRequest, NextResponse } from "next/server";
import { hostAction, advance } from "@/game/engine";
import { isHost } from "@/game/host-auth";
import { mutate } from "@/game/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!await isHost()) return NextResponse.json({ error: "Sign in to the Host Console." }, { status: 401 });
  try { const { world } = await mutate("live", advance); return NextResponse.json(world, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Market unavailable." }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (!await isHost()) return NextResponse.json({ error: "Host access expired. Sign in again." }, { status: 401 });
  try {
    const { action, payload = {} } = await request.json();
    const { world } = await mutate("live", state => { advance(state); return hostAction(state, String(action), payload); });
    return NextResponse.json(world, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Market action failed." }, { status: 400 }); }
}
