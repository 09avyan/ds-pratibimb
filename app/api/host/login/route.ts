import { NextRequest, NextResponse } from "next/server";
import { checkPassword, createHostSession } from "@/game/host-auth";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!checkPassword(String(password ?? ""))) return NextResponse.json({ error: "That password didn’t match." }, { status: 401 });
    await createHostSession();
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not sign in right now." }, { status: 400 }); }
}
