"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HostNote, World } from "@/game/types";
import { equity, NEWS_EFFECT_MAX_SECONDS, NEWS_EFFECT_MIN_SECONDS, NEWS_REACTION_SECONDS, newsImpactRange, newsImpactRemainingSeconds, previewNewsImpact, TERMINAL_ACTIVE_WINDOW_MS, VIRTUAL_BOT_COUNT } from "@/game/engine";
import { DalaalMark } from "@/components/trader-parts";
import { groupTerminalSessions, type ParticipantGroup } from "@/game/host-sessions";
import { TERMINAL_COUNT } from "@/game/terminals";

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const signedMoney = (n: number) => `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`;
const fmtTime = (seconds: number) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, Math.floor(seconds) % 60)).padStart(2, "0")}`;
type Tab = "overview" | "quick" | "market" | "news" | "sessions" | "leaderboard" | "notes" | "settings" | "shortcuts";
type HostWorld = World & { index: number; indexChange: number };
type NewsCategory = "economy" | "sector" | "stock";
type HostActionEntry = { id: number; at: number; message: string };
const HOST_SECTIONS: { key: Tab; label: string; icon: string; keys: string; detail: string }[] = [
  { key: "overview", label: "Overview", icon: "◫", keys: "Alt + O", detail: "See batch status, terminals and recent news." },
  { key: "quick", label: "Quick access", icon: "✦", keys: "Alt + Q", detail: "Open the operating dashboard." },
  { key: "news", label: "News studio", icon: "◉", keys: "Alt + N", detail: "Choose, review and publish a news mix." },
  { key: "market", label: "Market control", icon: "⌁", keys: "Alt + M", detail: "Open scenario and market controls." },
  { key: "sessions", label: "Sessions", icon: "▦", keys: "Alt + S", detail: "Check terminals and participant data." },
  { key: "leaderboard", label: "Leaderboard", icon: "♛", keys: "Alt + L", detail: "Rank current batch participants by return." },
  { key: "notes", label: "Host notes", icon: "▤", keys: "Alt + R", detail: "Open shared host notes." },
  { key: "settings", label: "Settings", icon: "⚙", keys: "Alt + T", detail: "Open batch duration and update settings." },
  { key: "shortcuts", label: "Shortcuts", icon: "⌨", keys: "Alt + K", detail: "Return to this shortcut guide." },
];
const HOST_SHORTCUTS = [
  ...HOST_SECTIONS.map(({ label, keys, detail }) => ({ label, keys, detail })),
  { label: "Pause / resume market", keys: "Alt + P", detail: "Toggle the live market clock." },
  { label: "Publish selected news", keys: "Alt + U", detail: "Publish or schedule the selected mix when the batch is live." },
] as const;
const HOST_NOTES_KEY = "ds-host-notes-v1";
const MAX_HOST_NOTES = 30;
const MAX_HOST_NOTE_LENGTH = 240;
const editableControls = (world: HostWorld) => ({ volatility: world.controls.volatility, bots: world.controls.bots, tickRate: world.controls.tickRate, marketBias: world.controls.marketBias, duration: world.duration, newsEnabled: world.controls.newsEnabled, majorAuto: world.controls.majorAuto, minorAuto: world.controls.minorAuto, newsSpacing: world.controls.newsSpacing });

function NewsDirectionIcon({ direction }: { direction: number }) {
  return <svg className="news-direction-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={direction > 0 ? "M6 18 18 6M7 6h11v11" : "M6 6 18 18M7 18h11V7"}/></svg>;
}

export function HostConsole() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [world, setWorld] = useState<HostWorld | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<number | null>(null);
  const [hostActions, setHostActions] = useState<HostActionEntry[]>([]);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [hostNotes, setHostNotes] = useState<HostNote[]>([]);
  const [notesReady, setNotesReady] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [notesError, setNotesError] = useState("");
  const [notesRetryVersion, setNotesRetryVersion] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const [hostClockNow, setHostClockNow] = useState(0);
  const [working, setWorking] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [newsSearch, setNewsSearch] = useState("");
  const [newsCategoryTab, setNewsCategoryTab] = useState<NewsCategory>("economy");
  const [newsSector, setNewsSector] = useState("ALL");
  const [newsDirection, setNewsDirection] = useState("all");
  const [headlineDelay, setHeadlineDelay] = useState(0);
  const [controls, setControls] = useState({ volatility: 48 * .85, bots: 58, tickRate: 1, marketBias: 50, duration: 360, newsEnabled: true, majorAuto: 1, minorAuto: 2, newsSpacing: 75 });
  const [intervention, setIntervention] = useState({ sector: "ALL", direction: "up", magnitude: 1.5, delay: 0 });
  const initialized = useRef(false);
  const requestPending = useRef(false);
  const actionPending = useRef(false);
  const generation = useRef(0);
  const actionSequence = useRef(0);
  const notesMigrationStarted = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("ds-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("ds-theme", theme);
  }, [theme]);
  useEffect(() => {
    const updateClock = () => setHostClockNow(Date.now());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!world) return;
    const availableIds = new Set(world.news.map(news => news.id));
    setSelectedNewsIds(current => {
      const valid = current.filter(id => availableIds.has(id));
      return valid.length === current.length ? current : valid;
    });
  }, [world?.news]);
  const acceptSnapshot = useCallback((data: HostWorld) => {
    setWorld(data);
    setHostNotes(data.hostNotes ?? []);
    setNotesReady(true);
    setLastSuccessfulSync(Date.now());
    setConnectionError("");
    if (!initialized.current) { setControls(editableControls(data)); initialized.current = true; }
  }, []);

  const postNoteAction = useCallback(async (action: string, payload: Record<string, unknown>) => {
    if (actionPending.current) { setNotesError("Wait for the current host action to finish, then try again."); return false; }
    actionPending.current = true;
    generation.current += 1;
    setWorking(true);
    try {
      const response = await fetch("/api/host", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
      const data = await response.json();
      if (response.status === 401) { setAuthenticated(false); initialized.current = false; }
      if (!response.ok) throw new Error(data.error || "Could not save that note.");
      acceptSnapshot(data);
      setNotesError("");
      return true;
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : "Could not save that note.");
      return false;
    } finally {
      actionPending.current = false;
      setWorking(false);
    }
  }, [acceptSnapshot]);

  useEffect(() => {
    if (!authenticated || !notesReady || notesMigrationStarted.current) return;
    notesMigrationStarted.current = true;
    try {
      const saved = window.localStorage.getItem(HOST_NOTES_KEY);
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Saved notes have an unsupported format.");
      const legacy = parsed.filter((note): note is HostNote => Boolean(note) && typeof note.id === "string" && typeof note.text === "string" && typeof note.createdAt === "number" && Number.isFinite(note.createdAt) && typeof note.updatedAt === "number" && Number.isFinite(note.updatedAt))
        .map(note => ({ ...note, text: note.text.trim().slice(0, MAX_HOST_NOTE_LENGTH) }))
        .filter(note => note.text.length > 0)
        .slice(0, MAX_HOST_NOTES);
      const sharedIds = new Set(hostNotes.map(note => note.id));
      const missing = legacy.filter(note => !sharedIds.has(note.id));
      if (!missing.length) { window.localStorage.removeItem(HOST_NOTES_KEY); return; }
      void postNoteAction("import-notes", { notes: missing }).then(savedToSharedStore => {
        if (savedToSharedStore) window.localStorage.removeItem(HOST_NOTES_KEY);
        else notesMigrationStarted.current = true;
      });
    } catch {
      setNotesError("Notes from this browser could not be moved to shared storage.");
    }
  }, [authenticated, hostNotes, notesReady, notesRetryVersion, postNoteAction]);
  function retryNotesMigration() { notesMigrationStarted.current = false; setNotesError(""); setNotesRetryVersion(value => value + 1); }

  const refresh = useCallback(async () => {
    if (!authenticated || requestPending.current || actionPending.current) return;
    requestPending.current = true;
    const requestGeneration = generation.current;
    try {
      const res = await fetch("/api/host", { cache: "no-store" });
      if (requestGeneration !== generation.current) return;
      if (res.status === 401) { setAuthenticated(false); setWorld(null); initialized.current = false; setError("Host access expired. Sign in again."); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The shared market is temporarily unavailable.");
      acceptSnapshot(data);
    } catch (e) { if (requestGeneration === generation.current) setConnectionError(e instanceof Error ? e.message : "Connection interrupted. Reconnecting…"); }
    finally { requestPending.current = false; }
  }, [authenticated, acceptSnapshot]);
  useEffect(() => { let active = true; fetch("/api/host", { cache: "no-store" }).then(async r => { if (r.ok && active) { const data = await r.json(); if (active) { acceptSnapshot(data); setAuthenticated(true); } } }).catch(() => {}); return () => { active = false; }; }, [acceptSnapshot]);
  useEffect(() => { if (!authenticated) return; const t = window.setInterval(refresh, 2500); return () => clearInterval(t); }, [authenticated, refresh]);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setError(""); setWorking(true);
    try { const r = await fetch("/api/host/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); initialized.current = false; setAuthenticated(true); setPassword(""); const market = await fetch("/api/host", { cache: "no-store" }); const snapshot = await market.json(); if (!market.ok) throw new Error(snapshot.error); acceptSnapshot(snapshot); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not sign in."); }
    finally { setWorking(false); }
  }
  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (actionPending.current) return;
    actionPending.current = true;
    generation.current += 1;
    setWorking(true); setError("");
    try {
      const r = await fetch("/api/host", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
      const data = await r.json();
      if (r.status === 401) { setAuthenticated(false); initialized.current = false; }
      if (!r.ok) throw new Error(data.error);
      acceptSnapshot(data);
      const actionMessage = describeHostAction(action, payload, data as HostWorld);
      if (actionMessage) {
        const entry = { id: ++actionSequence.current, at: Date.now(), message: actionMessage };
        setHostActions(current => [entry, ...current].slice(0, 8));
      }
      if (action === "start" || action === "reset") { setControls(editableControls(data)); setSelectedNewsIds([]); }
      else if (action === "headline") {
        const submittedIndices = Array.isArray(payload.indices)
          ? payload.indices.filter((index): index is number => typeof index === "number" && Number.isInteger(index))
          : [];
        const submittedIds = new Set(submittedIndices.map(index => newsOptions[index]?.id).filter((id): id is string => typeof id === "string"));
        setSelectedNewsIds(current => current.filter(id => !submittedIds.has(id)));
      }
      else if (action === "controls") { const saved = editableControls(data); setControls(current => ({ ...current, ...Object.fromEntries(Object.keys(payload).filter(key => key in saved).map(key => [key, saved[key as keyof typeof saved]])) })); }
    }
    catch (e) { setError(e instanceof Error ? e.message : "That market action did not complete."); }
    finally { actionPending.current = false; setWorking(false); }
  }
  async function logout() { if (actionPending.current) return; setWorking(true); try { const response = await fetch("/api/host/logout", { method: "POST" }); if (!response.ok) throw new Error("Could not sign out. Try again."); generation.current += 1; initialized.current = false; setAuthenticated(false); setWorld(null); setError(""); } catch(e) { setError(e instanceof Error ? e.message : "Could not sign out."); } finally { setWorking(false); } }
  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = noteDraft.trim().slice(0, MAX_HOST_NOTE_LENGTH);
    if (!text) return;
    if (!editingNoteId && hostNotes.length >= MAX_HOST_NOTES) { setNotesError(`Keep up to ${MAX_HOST_NOTES} notes. Delete one before adding another.`); return; }
    const saved = await postNoteAction("save-note", { text, ...(editingNoteId ? { noteId: editingNoteId } : {}) });
    if (!saved) return;
    setNoteDraft("");
    setEditingNoteId(null);
  }
  function editNote(note: HostNote) { setEditingNoteId(note.id); setNoteDraft(note.text); setNotesError(""); }
  async function deleteNote(noteId: string) {
    notesMigrationStarted.current = false;
    const deleted = await postNoteAction("delete-note", { noteId });
    if (!deleted) { notesMigrationStarted.current = true; return; }
    if (editingNoteId === noteId) { setEditingNoteId(null); setNoteDraft(""); }
  }
  const players = useMemo<ParticipantGroup[]>(() => {
    return groupTerminalSessions(world?.sessions ?? {}, Date.now(), TERMINAL_ACTIVE_WINDOW_MS);
  }, [world?.sessions]);
  const inspectedPlayer = players.find(player => player.sessionIds.includes(inspectId ?? "")) ?? null;
  const inspectedPositions = useMemo(() => {
    if (!world || !inspectedPlayer) return [];
    const position = (symbol: string, qty: number, avg: number, side: "Long" | "Short") => ({ symbol, qty, avg, side, price: world.stocks.find(stock => stock.symbol === symbol)?.price ?? 0 });
    return [...Object.entries(inspectedPlayer.holdings).map(([symbol, p]) => position(symbol, p.qty, p.avg, "Long")), ...Object.entries(inspectedPlayer.shorts).map(([symbol, p]) => position(symbol, p.qty, p.avg, "Short"))];
  }, [world, inspectedPlayer]);
  const inspectedEquity = inspectedPlayer && world ? equity(world, inspectedPlayer) : 0;
  const connected = (player: ParticipantGroup) => player.sessionIds.some(id => Date.now() - (world?.sessions[id]?.lastSeenAt ?? 0) < TERMINAL_ACTIVE_WINDOW_MS);
  const connectedCount = players.filter(connected).length;
  const leaderboard = useMemo(() => {
    if (!world) return [];
    return players.filter(player => player