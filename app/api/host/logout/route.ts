import { NextResponse } from "next/server";
import { clearHostSession } from "@/game/host-auth";
export const runtime = "nodejs";
export async function POST() { await clearHostSession(); return NextResponse.json({ ok: true }); }
