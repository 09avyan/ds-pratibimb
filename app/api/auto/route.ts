import { NextRequest, NextResponse } from "next/server";
import { advance, hostAction, indexValue } from "@/game/engine";
import { mutate } from "@/game/store";
import type { World } from "@/game/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicStatus(world: World) {
  const index = indexValue(world);
  return {
    status: world.status,
    batch: world.batch,
    duration: world.duration,
    remaining: world.remaining,
    startedAt: world.startedAt,
    index,
    indexChange: (index / 10_000 - 1) * 100,
    autonomousNewsActive: Boolean(world.autonomousNews?.enabled && world.status !== "closed"),
  };
}

export async function GET() {
  try {
    const { world } = await mutate("live", advance);
    return NextResponse.json(publicStatus(world), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The shared game is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action !== "start") return NextResponse.json({ error: "Choose Start game." }, { status: 400 });
    const { world, result } = await mutate("live", state => {
      advance(state);
      if (state.status === "live" || state.status === "countdown") return { started: false, message: "A batch is already in progress." };
      hostAction(state, "start", { autonomous: true });
      return { started: true, message: "The batch is starting with autonomous news enabled." };
    });
    return NextResponse.json({ ...publicStatus(world), result }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The shared game could not be started." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
