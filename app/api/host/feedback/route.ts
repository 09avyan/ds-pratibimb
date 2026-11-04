import { NextResponse } from "next/server";
import { isHost } from "@/game/host-auth";
import { listFeedback } from "@/game/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read only when the host opens or refreshes the Feedback tab; it never touches the game state row.
export async function GET() {
  if (!await isHost()) return NextResponse.json({ error: "Sign in to the Host Console." }, { status: 401 });
  try { return NextResponse.json({ rows: await listFeedback("live") }, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Feedback unavailable." }, { status: 503 }); }
}
