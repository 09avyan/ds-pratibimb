import { NextRequest, NextResponse } from "next/server";
import { recordGameLog } from "@/game/logs";
import { hostAction, advance, indexValue } from "@/game/engine";
import { isHost } from "@/game/host-auth";
import { mutate } from "@/game/store";
import type { HostNote, World } from "@/game/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function snapshot(world: World, includeLogs = false, after?: string | null) {
  const index = indexValue(world);
  const { logs = [], ...state } = world;
  const cursor = after ? logs.findIndex(log => log.id === after) : -1;
  const journal = includeLogs ? { logs: cursor >= 0 ? logs.slice(0, cursor) : logs, logsReset: cursor < 0 } : {};
  return { ...state, ...journal, stocks: world.stocks.map(stock => ({ ...stock, trend: stock.candles.slice(-18).map(bar => bar.close), candles: [] })), index, indexChange: (index / 10_000 - 1) * 100 };
}
function updateHostNotes(world: World, action: string, payload: Record<string, unknown>) {
  const notes = world.hostNotes ?? [];
  if (action === "save-note") {
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text || text.length > 240) throw new Error("Notes must contain 1 to 240 characters.");
    const noteId = typeof payload.noteId === "string" ? payload.noteId : "";
    const now = Date.now();
    if (noteId) {
      if (!notes.some(note => note.id === noteId)) throw new Error("That note no longer exists. Refresh the host page and try again.");
      world.hostNotes = notes.map(note => note.id === noteId ? { ...note, text, updatedAt: now } : note);
    } else {
      if (notes.length >= 30) throw new Error("Keep up to 30 notes. Delete one before adding another.");
      world.hostNotes = [{ id: crypto.randomUUID(), text, createdAt: now, updatedAt: now }, ...notes];
    }
    world.version++;
    return;
  }
  if (action === "delete-note") {
    const noteId = typeof payload.noteId === "string" ? payload.noteId : "";
    const next = notes.filter(note => note.id !== noteId);
    if (next.length !== notes.length) { world.hostNotes = next; world.version++; }
    return;
  }
  if (action === "import-notes") {
    const incoming = Array.isArray(payload.notes) ? payload.notes : [];
    const merged = new Map<string, HostNote>(notes.map(note => [note.id, note]));
    for (const item of incoming) {
      if (!item || typeof item.id !== "string" || typeof item.text !== "string" || typeof item.createdAt !== "number" || !Number.isFinite(item.createdAt) || typeof item.updatedAt !== "number" || !Number.isFinite(item.updatedAt)) continue;
      const text = item.text.trim().slice(0, 240);
      if (!text || merged.has(item.id)) continue;
      merged.set(item.id, { id: item.id, text, createdAt: item.createdAt, updatedAt: item.updatedAt });
    }
    if (merged.size > 30) throw new Error("Shared notes are full. Delete a shared note, then retry the saved notes import.");
    const next = [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    if (JSON.stringify(next) !== JSON.stringify(notes)) { world.hostNotes = next; world.version++; }
  }
}
export async function GET(request: NextRequest) {
  if (!await isHost()) return NextResponse.json({ error: "Sign in to the Host Console." }, { status: 401 });
  try { const { world } = await mutate("live", advance); return NextResponse.json(snapshot(world, request.nextUrl.searchParams.get("logs") === "1", request.nextUrl.searchParams.get("logsAfter")), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Market unavailable." }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (!await isHost()) return NextResponse.json({ error: "Host access expired. Sign in again." }, { status: 401 });
  try {
    const { action, payload = {} } = await request.json();
    const actionName = String(action);
    const { world } = await mutate("live", state => {
      advance(state);
      if (["save-note", "delete-note", "import-notes"].includes(actionName)) { updateHostNotes(state, actionName, payload); recordGameLog(state, { at: Date.now(), kind: "host", message: `Host notes: ${actionName}.` }); }
      else hostAction(state, actionName, payload);
    });
    return NextResponse.json(snapshot(world), { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Market action failed." }, { status: 400 }); }
}
