"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HostNote, World } from "@/game/types";
import { equity, NEWS_EFFECT_MAX_SECONDS, NEWS_EFFECT_MIN_SECONDS, NEWS_REACTION_SECONDS, newsImpactRange, newsImpactRemainingSeconds, previewNewsImpact, TERMINAL_ACTIVE_WINDOW_MS, VIRTUAL_BOT_COUNT } from "@/game/engine";
import { HostLogs } from "./host-logs";
import { DalaalMark } from "@/components/trader-parts";
import { groupTerminalSessions, type ParticipantGroup } from "@/game/host-sessions";
import { TERMINAL_COUNT } from "@/game/terminals";

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const signedMoney = (n: number) => `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`;
const fmtTime = (seconds: number) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, Math.floor(seconds) % 60)).padStart(2, "0")}`;
type Tab = "logs" | "brain" | "overview" | "quick" | "market" | "news" | "sessions" | "leaderboard" | "notes" | "settings" | "shortcuts";
type HostWorld = World & { logsReset?: boolean; index: number; indexChange: number };
type NewsCategory = "economy" | "sector" | "stock";
type HostActionEntry = { id: number; at: number; message: string };
const HOST_SECTIONS: { key: Tab; label: string; icon: string; keys: string; detail: string }[] = [
  { key: "overview", label: "Overview", icon: "◫", keys: "Alt + O", detail: "See batch status, terminals and recent news." },
  { key: "quick", label: "Quick access", icon: "✦", keys: "Alt + Q", detail: "Open the operating dashboard." },
  { key: "news", label: "News studio", icon: "◉", keys: "Alt + N", detail: "Choose, review and publish a news mix." },
  { key: "brain", label: "News brain", icon: "✧", keys: "Alt + B", detail: "Inspect and control autonomous news, including during a live batch." },
  { key: "market", label: "Market control", icon: "⌁", keys: "Alt + M", detail: "Open scenario and market controls." },
  { key: "sessions", label: "Sessions", icon: "▦", keys: "Alt + S", detail: "Check terminals and participant data." },
  { key: "leaderboard", label: "Leaderboard", icon: "♛", keys: "Alt + L", detail: "Rank current batch participants by return." },
  { key: "logs", label: "Logs", icon: "≡", keys: "Alt + G", detail: "Review game events, trades and brain decisions." },
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
  const logCursor = useRef("");
  const activeTab = useRef<Tab>(tab);
  useEffect(() => { activeTab.current = tab; }, [tab]);
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
    if (data.logs?.length) logCursor.current = data.logs[0].id;
    setWorld(previous => ({ ...data, logs: data.logsReset ? data.logs : data.logs ? [...new Map([...data.logs, ...(previous?.logs ?? [])].map(log => [log.id, log])).values()].slice(0, 1500) : previous?.logs }));
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
      const res = await fetch(activeTab.current === "logs" ? `/api/host?logs=1&logsAfter=${encodeURIComponent(logCursor.current)}` : "/api/host", { cache: "no-store" });
      if (requestGeneration !== generation.current) return;
      if (res.status === 401) { setAuthenticated(false); setWorld(null); logCursor.current = ""; initialized.current = false; setError("Host access expired. Sign in again."); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The shared market is temporarily unavailable.");
      acceptSnapshot(data);
    } catch (e) { if (requestGeneration === generation.current) setConnectionError(e instanceof Error ? e.message : "Connection interrupted. Reconnecting…"); }
    finally { requestPending.current = false; }
  }, [authenticated, acceptSnapshot]);
  useEffect(() => { let active = true; fetch("/api/host", { cache: "no-store" }).then(async r => { if (r.ok && active) { const data = await r.json(); if (active) { acceptSnapshot(data); setAuthenticated(true); } } }).catch(() => {}); return () => { active = false; }; }, [acceptSnapshot]);
  useEffect(() => { if (!authenticated) return; const t = window.setInterval(refresh, 2500); return () => clearInterval(t); }, [authenticated, refresh]);

  useEffect(() => { if (authenticated && tab === "logs") void refresh(); }, [authenticated, tab, refresh]);

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
  async function logout() { if (actionPending.current) return; setWorking(true); try { const response = await fetch("/api/host/logout", { method: "POST" }); if (!response.ok) throw new Error("Could not sign out. Try again."); generation.current += 1; initialized.current = false; setAuthenticated(false); setWorld(null); logCursor.current = ""; setError(""); } catch(e) { setError(e instanceof Error ? e.message : "Could not sign out."); } finally { setWorking(false); } }
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
    return players.filter(player => player.batch === world.batch).map(player => {
      const portfolio = equity(world, player);
      const initialCash = player.initialCash || 1_000_000;
      let bestTrade: ParticipantGroup["history"][number] | null = null;
      let worstTrade: ParticipantGroup["history"][number] | null = null;
      for (const trade of player.history) {
        if (trade.realized > 0 && (!bestTrade || trade.realized > bestTrade.realized)) bestTrade = trade;
        if (trade.realized < 0 && (!worstTrade || trade.realized < worstTrade.realized)) worstTrade = trade;
      }
      return { player, portfolio, profit: portfolio - initialCash, returnPct: (portfolio - initialCash) / initialCash * 100, bestTrade, worstTrade };
    }).sort((a, b) => b.returnPct - a.returnPct || b.portfolio - a.portfolio);
  }, [players, world]);
  const latestPublishedNews = world?.headlines.find(news => news.id === world.latestNewsId) ?? world?.headlines[0] ?? null;
  const impactSnapshotSeconds = world ? newsImpactRemainingSeconds(world) : 0;
  const impactSnapshotAge = world?.status === "live" && !world.controls.paused && !connectionError && hostClockNow && lastSuccessfulSync
    ? Math.max(0, (hostClockNow - lastSuccessfulSync) / 1000)
    : 0;
  const impactRemainingSeconds = Math.max(0, Math.ceil(impactSnapshotSeconds - impactSnapshotAge));
  const newsImpactTimer = <div className={`news-impact-timer ${impactRemainingSeconds > 0 ? "active" : ""}`}><span className="news-impact-timer-mark" aria-hidden="true"/><span className="news-impact-timer-copy"><b>{world?.controls.paused && impactRemainingSeconds > 0 ? "News reaction paused" : impactRemainingSeconds > 0 ? "News reaction in progress" : "News impact settled"}</b><small>{latestPublishedNews ? latestPublishedNews.headline : "A published story’s market follow-through will appear here."}</small><em>The direct price move builds over {NEWS_REACTION_SECONDS}s; the full effect usually settles within {NEWS_EFFECT_MIN_SECONDS}–{NEWS_EFFECT_MAX_SECONDS}s. Pausing freezes this timer.</em></span><strong className="news-impact-timer-value">{impactRemainingSeconds > 0 ? fmtTime(impactRemainingSeconds) : latestPublishedNews ? "DONE" : "—"}</strong></div>;
  const newsOptions = world?.news ?? [];
  const selectedNews = newsOptions.filter(news => selectedNewsIds.includes(news.id));
  const selectedIndices = selectedNews.map(news => newsOptions.indexOf(news));
  const autonomous = world?.autonomousNews;
  const autonomousPlanNews = (autonomous?.nextIndices ?? []).map(index => world?.news[index]).filter((news): news is NonNullable<typeof news> => Boolean(news));
  const autonomousCountdown = autonomous?.enabled && autonomous.nextAt && hostClockNow ? Math.max(0, Math.ceil((autonomous.nextAt - (world?.controls.paused ? world.lastTickAt : hostClockNow)) / 1000)) : null;
  const autonomousLabel = (kind: NonNullable<World["autonomousNews"]>["history"][number]["kind"]) => ({ planned: "PLAN", published: "PUBLISHED", skipped: "SKIPPED", started: "STARTED", stopped: "STOPPED", "host-published": "HOST PUBLISHED", "host-edited": "HOST EDIT", "settings-adjusted": "SETTINGS" })[kind];
  useEffect(() => {
    if (!authenticated) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && (active.isContentEditable || active.matches("input, textarea, select, [contenteditable='true']"))) return;
      const key = event.key.toLowerCase();
      const destinations: Record<string, Tab> = { g: "logs", b: "brain", o: "overview", q: "quick", m: "market", n: "news", s: "sessions", l: "leaderboard", r: "notes", t: "settings", k: "shortcuts" };
      if (destinations[key]) {
        event.preventDefault();
        setTab(destinations[key]);
        return;
      }
      if (key === "p") {
        event.preventDefault();
        if (world?.status === "live" && !working) void act(world.controls.paused ? "resume" : "pause");
        return;
      }
      if (key === "u" && world?.status === "live" && selectedIndices.length && !working) {
        event.preventDefault();
        void act("headline", { indices: selectedIndices, delay: headlineDelay });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authenticated, world?.status, world?.controls.paused, selectedIndices, headlineDelay, working, act, newsOptions]);
  const impactPreview = useMemo(() => world && selectedIndices.length ? previewNewsImpact(world, selectedIndices) : null, [world, selectedNewsIds]);
  const visibleNewsOptions = newsOptions.filter(news => `${news.headline} ${news.sector} ${news.symbols?.join(" ") ?? ""}`.toLowerCase().includes(newsSearch.trim().toLowerCase()));
  const newsCategory = (news: World["news"][number]) => news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
  const newsByCategory: Record<NewsCategory, World["news"]> = {
    economy: visibleNewsOptions.filter(news => newsCategory(news) === "economy"),
    sector: visibleNewsOptions.filter(news => newsCategory(news) === "sector"),
    stock: visibleNewsOptions.filter(news => newsCategory(news) === "stock"),
  };
  const newsCategoryCounts: Record<NewsCategory, number> = {
    economy: newsOptions.filter(news => newsCategory(news) === "economy").length,
    sector: newsOptions.filter(news => newsCategory(news) === "sector").length,
    stock: newsOptions.filter(news => newsCategory(news) === "stock").length,
  };
  const activeCategoryNews = newsByCategory[newsCategoryTab].filter(news => (newsSector === "ALL" || news.sector === newsSector) && (newsDirection === "all" || news.direction === (newsDirection === "up" ? 1 : -1)));
  const selectedCategoryCounts = selectedNews.reduce((counts, news) => ({ ...counts, [newsCategory(news)]: counts[newsCategory(news)] + 1 }), { economy: 0, sector: 0, stock: 0 });
  const selectedCategorySummary = (["economy", "sector", "stock"] as NewsCategory[]).flatMap(category => selectedCategoryCounts[category] ? [`${selectedCategoryCounts[category]} ${category}`] : []).join(" · ");
  const newsScope = (news: World["news"][number]) => newsCategory(news) === "economy" ? "Economy · all stocks" : newsCategory(news) === "stock" ? (news.symbols?.join(", ") ?? news.sector) : `${news.sector} sector`;
  const renderNewsOption = (news: World["news"][number]) => {
    const chosen = selectedNewsIds.includes(news.id);
    const impact = newsImpactRange(news);
    return <button type="button" aria-pressed={chosen} className={`preset-option ${chosen ? "selected" : ""}`} key={news.id} onClick={() => setSelectedNewsIds(current => chosen ? current.filter(id => id !== news.id) : [...current, news.id])}>
      <span className={`preset-bullet ${news.direction < 0 ? "down" : ""}`}><NewsDirectionIcon direction={news.direction}/></span><span><b>{news.headline}</b><small>{newsScope(news)} · {news.type} · {news.direction > 0 ? "Positive: expected up" : "Negative: expected down"} about {impact.low.toFixed(1)}–{impact.high.toFixed(1)}% per affected stock</small></span><i>{chosen ? "✓" : "+"}</i>
    </button>;
  };

  const brainPanel = <section className="host-card autonomous-news-panel brain-workspace">
    <header className="brain-toolbar"><div className="brain-status"><span className={`brain-status-dot${autonomous?.enabled ? " is-running" : ""}`}/><strong>Automatic news</strong><small>{autonomous?.enabled ? autonomous.strategy === "calm" ? "Giving room" : autonomous.strategy === "lively" ? "Adding action" : "Steady" : "Stopped"}</small></div><div className="brain-toolbar-actions">{autonomous?.enabled && <span className="brain-next-release">Next set <b>{autonomousCountdown === null ? "Waiting" : fmtTime(autonomousCountdown)}</b></span>}<button type="button" className={autonomous?.enabled ? "outline-button" : "host-primary"} disabled={working || !world} onClick={() => void act(autonomous?.enabled ? "autonomous-stop" : "autonomous-start")}>{autonomous?.enabled ? "Stop brain" : "Start brain"}</button></div></header>
    <p className="brain-description">{autonomous?.enabled ? "Choosing stories, release times and gentle market adjustments as the game changes." : "Start the brain to open a batch automatically, or join the current batch."}</p>
      {autonomous?.enabled && <div className="autonomous-plan"><div className="autonomous-plan-heading"><span><b>NEXT SET</b><small>{autonomousPlanNews.length} of 2–3 headlines · baseline {controls.newsSpacing}s</small></span><strong>{autonomousCountdown === null ? "—" : autonomousCountdown === 0 ? "NOW" : `IN ${fmtTime(autonomousCountdown)}`}</strong></div>
        <div className="autonomous-plan-stories">{autonomousPlanNews.map((news, index) => <article key={`${news.id}-${index}`}><span className={news.direction > 0 ? "positive" : "negative"}><NewsDirectionIcon direction={news.direction}/></span><div><small>{newsScope(news)}</small><b>{news.headline}</b></div></article>)}{autonomousPlanNews.length < 2 && <p className="host-card-copy">The next set will appear after the brain finishes its first live reading.</p>}</div>
        <div className="autonomous-plan-actions"><button type="button" className="outline-button" disabled={working || autonomousPlanNews.length < 2} onClick={() => void act("autonomous-skip")}>Skip and reselect</button><button type="button" className="host-primary" disabled={working || world?.status !== "live" || autonomousPlanNews.length < 2} onClick={() => void act("autonomous-publish-now")}>Publish this set now</button>{selectedIndices.length >= 2 && selectedIndices.length <= 3 && <button type="button" className="outline-button" disabled={working} onClick={() => void act("autonomous-plan", { indices: selectedIndices })}>Use my {selectedIndices.length} picks</button>}</div>
      </div>}
    <section className="brain-visible-section brain-decision-section" aria-labelledby="brain-decision-title">
      <div className="brain-section-heading"><h2 id="brain-decision-title">Why this news and timing</h2><span className="secure-tag">{autonomous?.hostOverride ? "HOST SELECTED" : autonomous?.introductoryStage === 1 ? "SIMPLE OPENING" : autonomous?.introductoryStage === 2 ? "SECOND SET" : autonomous?.strategy === "calm" ? "GIVING ROOM" : autonomous?.strategy === "lively" ? "ADDING ACTION" : "BALANCED"}</span></div>
      <p className="autonomous-reason">{autonomous?.nextReason ?? "Start the brain to see its proposed stories and decision reasons."}</p>
      <div className="brain-timing-facts brain-key-facts"><span>Release interval <b>{autonomous?.enabled ? `${autonomous.nextIntervalSeconds}s` : "—"}</b></span><span>Next release <b>{autonomous?.enabled && autonomousCountdown !== null ? fmtTime(autonomousCountdown) : "Not scheduled"}</b></span></div>
    </section>
    <details className="brain-advanced">
      <summary><span><b>Advanced</b><small>Live readings, settings, decision details and activity</small></span><i aria-hidden="true">+</i></summary>
      <div className="brain-advanced-content">
      <section className="brain-reading-details brain-visible-section" aria-labelledby="brain-observations-title">
        <div className="brain-section-heading"><h2 id="brain-observations-title">What the brain is noticing</h2><small>{autonomous?.enabled ? "Live game signals" : "Last recorded reading · brain stopped"}</small></div>
        <p className="host-card-copy">These signals help adjust the pace. Inactivity or order issues can suggest that players need more time; they do not prove confusion.</p>
        <div className="autonomous-reading-grid">
        <div><small>DALAAL-10 CHANGE</small><b className={(autonomous?.reading.indexChange ?? world?.indexChange ?? 0) >= 0 ? "positive" : "negative"}>{(autonomous?.reading.indexChange ?? world?.indexChange ?? 0).toFixed(2)}%</b></div>
        <div><small>RECENT INDEX MOVE</small><b>{(autonomous?.reading.recentIndexChange ?? 0).toFixed(2)}%</b></div>
        <div><small>RECENT VOLATILITY</small><b>{(autonomous?.reading.recentVolatility ?? 0).toFixed(2)}%</b></div>
        <div><small>ACTIVE TERMINALS</small><b>{autonomous?.reading.activeTerminals ?? connectedCount}</b></div>
        <div><small>TRADING · LAST 45 SEC</small><b>{autonomous?.reading.engagedTerminals ?? 0} terminals</b></div>
        <div><small>TRADES · LAST 45 SEC</small><b>{autonomous?.reading.recentTrades ?? 0}</b></div>
        <div><small>BUYS / SELLS / SHORTS</small><b>{autonomous?.reading.recentBuys ?? 0} / {autonomous?.reading.recentSells ?? 0} / {autonomous?.reading.recentShorts ?? 0}</b></div>
        <div><small>OPEN POSITIONS</small><b>{autonomous?.reading.openPositions ?? 0}</b></div>
        <div><small>MOST CASH UNUSED</small><b>{Math.round((autonomous?.reading.idleCashShare ?? 0) * 100)}% of players</b></div>
        <div><small>PORTFOLIO DOWN &gt;8%</small><b>{Math.round((autonomous?.reading.stressedShare ?? 0) * 100)}% of players</b></div>
        <div><small>ORDER ISSUES · 60 SEC</small><b>{autonomous?.reading.rejectedOrders ?? 0} across {autonomous?.reading.strugglingTerminals ?? 0} terminals</b></div>
        <div><small>NEWS STILL MOVING</small><b>{autonomous?.reading.unresolvedNewsSeconds ?? 0}s</b></div>
        <div><small>BATCH DURATION</small><b>{fmtTime(autonomous?.reading.sessionDuration ?? world?.duration ?? 0)}</b></div>
        <div><small>TIME PLAYED</small><b>{fmtTime(autonomous?.reading.elapsedSeconds ?? 0)}</b></div>
        <div><small>TIME REMAINING</small><b>{fmtTime(autonomous?.reading.secondsRemaining ?? world?.remaining ?? 0)}</b></div>
        </div>
      </section>
      <section className="brain-visible-section" aria-labelledby="brain-full-decision-title">
        <div className="brain-section-heading"><h2 id="brain-full-decision-title">Decision and timing details</h2><small>Selection and release rules</small></div>
        <div className="brain-timing-facts"><span>Chosen gap <b>{autonomous?.enabled ? `${autonomous.nextIntervalSeconds}s` : "—"}</b></span><span>Host baseline <b>{world?.controls.newsSpacing ?? 75}s</b></span><span>Plan review <b>{autonomous?.hostOverride ? "Host mix protected" : autonomous?.enabled ? "Every 5 seconds" : "Stopped"}</b></span></div>
        <p className="host-card-copy">The brain can revise unpublished combinations of 2–3 compatible stories as the game changes. It normally lets earlier effects settle, allows limited overlap when useful, and keeps the original release-time anchor. Published stories stay unchanged.</p>
      </section>
      <section className="brain-visible-section" aria-labelledby="brain-settings-title">
      <div className="brain-section-heading"><h2 id="brain-settings-title">Market settings and recent changes</h2><small>Volatility and bot activity only</small></div>
      <div className="brain-timing-facts"><span>Volatility <b>{world?.controls.volatility ?? "—"}</b>{autonomous?.marketTuning && <small>Host baseline {autonomous.marketTuning.volatility}</small>}</span><span>Bot activity <b>{world?.controls.bots ?? "—"}</b>{autonomous?.marketTuning && <small>Host baseline {autonomous.marketTuning.bots}</small>}</span></div>
      <p className="autonomous-reason">{autonomous?.marketTuning?.reason ?? "No automatic setting adjustment is active. Host settings remain the reference."}</p>
      <p className="host-card-copy">Observes for 45 seconds; changes by at most 5% of the host baseline every 30 seconds, within 75–110% of that baseline and the normal setting limits. Disabled bots stay off. Stopping restores the host baseline. Cash, duration, tick speed and trading rules stay under host control.</p>
      <div className="brain-setting-history">{autonomous?.history.filter(entry => entry.kind === "settings-adjusted").slice(0, 5).map((entry, index) => <article key={`${entry.at}-${index}`}><time>T+{fmtTime(Math.max(0, (entry.at - (world?.startedAt ?? entry.at)) / 1000))}</time><p>{entry.reason}</p></article>)}{!autonomous?.history.some(entry => entry.kind === "settings-adjusted") && <p className="host-card-copy">No automatic settings changes recorded in this batch.</p>}</div>
      </section>
      <section className="autonomous-history brain-visible-section" aria-labelledby="brain-activity-title"><div className="brain-section-heading"><h2 id="brain-activity-title">Recent brain activity</h2><button type="button" className="text-link" onClick={() => setTab("logs")}>Full game logs <small>Alt + G</small></button></div>{autonomous?.history.length ? <div className="autonomous-history-list">{autonomous.history.slice(0, 12).map((entry, index) => <article key={`${entry.at}-${entry.kind}-${index}`}><span className={`autonomous-history-kind ${entry.kind}`}>{autonomousLabel(entry.kind)}</span><time>T+{fmtTime(Math.max(0, (entry.at - (world?.startedAt ?? entry.at)) / 1000))}</time><div>{entry.indices.map(newsIndex => world?.news[newsIndex]?.headline).filter(Boolean).join(" · ") || (entry.kind === "settings-adjusted" ? "Market difficulty" : "Brain control")}<small>{entry.reason}</small></div><b>{entry.intervalSeconds}s</b></article>)}</div> : <p className="host-card-copy">Decisions, publications and host overrides will appear here as they happen.</p>}<p className="host-card-copy">Latest {Math.min(12, autonomous?.history.length ?? 0)} records shown. The Logs section contains the retained game journal.</p></section>
      <section className="news-automation-fast brain-visible-section"><div className="brain-section-heading"><h2>Brain pacing</h2></div>
            <label className="host-field brain-baseline-setting"><span className="brain-baseline-label">NEWS INTERVAL BASELINE <b>{controls.newsSpacing}s</b></span><input aria-label="News interval baseline in seconds" type="range" min="50" max="90" step="1" value={controls.newsSpacing} onChange={e => setControls(c => ({ ...c, newsSpacing: Number(e.target.value) }))}/><span className="brain-baseline-scale"><small>50s · quicker</small><small>75s · default</small><small>90s · more time</small></span></label>
            <p className="host-card-copy">This is the brain’s normal starting point. It can adjust the next release between 50 and 105 seconds after reviewing player activity and how much news is still moving the market.</p>
            <button className="outline-button full" disabled={working || controls.newsSpacing === (world?.controls.newsSpacing ?? 75)} onClick={() => void act("controls", { newsSpacing: controls.newsSpacing })}>Save baseline interval</button>
</section>
      </div>
    </details>
  </section>;

  const newsWorkspace = <div className="host-news-workspace">
    <section className="brain-quick-control" aria-label="Autonomous news controls"><button type="button" className={autonomous?.enabled ? "outline-button" : "host-primary"} disabled={working || !world} onClick={() => void act(autonomous?.enabled ? "autonomous-stop" : "autonomous-start")}>{autonomous?.enabled ? "Stop brain" : "Start brain"}</button><p>{autonomous?.enabled ? `Running · ${autonomousCountdown === null ? "reading market" : `next set in ${fmtTime(autonomousCountdown)}`}` : "Automatic news · starts a batch if one is not running."}</p><button type="button" className="outline-button" onClick={() => setTab("brain")}>Brain controls <small className="host-button-shortcut">Alt + B</small></button></section>
    <section className="host-card news-library-fast">
      <div className="host-card-title"><div><span className="eyebrow">NEWS LIBRARY</span><h2>Build your next move</h2></div><span className="secure-tag">{newsOptions.length} headlines</span></div>
      <label className="host-field news-fast-search">FIND NEWS<input type="search" value={newsSearch} onChange={event => setNewsSearch(event.target.value)} placeholder="Search a company, sector or headline…"/></label>
      <div className="news-category-tabs" role="group" aria-label="News categories">{(["economy", "sector", "stock"] as NewsCategory[]).map(category => <button type="button" key={category} aria-pressed={newsCategoryTab === category} className={`news-category-tab ${newsCategoryTab === category ? "active" : ""}`} onClick={() => { setNewsCategoryTab(category); setNewsSector("ALL"); }}><b>{category === "stock" ? "Stocks" : category === "sector" ? "Sectors" : "Economy"}</b><small>{newsCategoryCounts[category]}{selectedCategoryCounts[category] ? ` · ${selectedCategoryCounts[category]} picked` : ""}</small></button>)}</div>
      <div className="news-fast-filters">
        {newsCategoryTab !== "economy" && <label className="host-field">SECTOR<select value={newsSector} onChange={event => setNewsSector(event.target.value)}><option value="ALL">All sectors</option>{Array.from(new Set(newsOptions.filter(news => newsCategory(news) !== "economy").map(news => news.sector))).sort().map(sector => <option key={sector}>{sector}</option>)}</select></label>}
        <label className="host-field">DIRECTION<select value={newsDirection} onChange={event => setNewsDirection(event.target.value)}><option value="all">Positive & negative</option><option value="up">Positive only ↗</option><option value="down">Negative only ↘</option></select></label>
        <span>{activeCategoryNews.length} results</span>
      </div>
      <div className="preset-list news-fast-list">{activeCategoryNews.length ? activeCategoryNews.map(renderNewsOption) : <div className="no-news-options">No matching headlines.<button className="text-link" onClick={() => { setNewsSearch(""); setNewsSector("ALL"); setNewsDirection("all"); }}>Reset filters</button></div>}</div>
      <p className="news-precedence-note">Stock news takes priority for its company, then sector news, then economy news. Picks stay selected across categories.</p>
    </section>
    <section className="host-card news-compose-fast">
      <div className="host-card-title"><div><span className="eyebrow">READY TO PUBLISH</span><h2>Your news mix <span className="news-mix-count">{selectedNews.length}</span></h2></div>{selectedNews.length > 0 && <button className="text-link" onClick={() => setSelectedNewsIds([])}>Clear all</button>}</div>
      <p className="host-card-copy">{selectedCategorySummary || "Tap headlines in the library to build your mix."}</p>
      <div className="news-picked-list">{selectedNews.map(news => <div className="news-picked-row" key={news.id}><span className={news.direction > 0 ? "positive" : "negative"}><NewsDirectionIcon direction={news.direction}/></span><span><small>{newsScope(news)}</small><b>{news.headline}</b></span><button type="button" aria-label={`Remove ${news.headline}`} onClick={() => setSelectedNewsIds(current => current.filter(id => id !== news.id))}>×</button></div>)}{!selectedNews.length && <div className="news-mix-empty">Your selected headlines appear here.</div>}</div>
      <div className="news-publish-fast"><label className="host-field">DELAY · SECONDS<input type="number" min="0" max="300" step="1" value={headlineDelay} onChange={event => setHeadlineDelay(Math.max(0,Math.min(300,Number(event.target.value) || 0)))}/></label><button type="button" className="host-primary" disabled={working || world?.status !== "live" || !selectedIndices.length} onClick={() => void act("headline", { indices: selectedIndices, delay: headlineDelay })}><span>{working ? "Publishing…" : world?.status !== "live" ? "Start batch first" : `${headlineDelay ? "Schedule" : "Publish"} ${selectedIndices.length || "selected"}`}</span><small className="host-button-shortcut">Alt + U</small></button></div>
      <div className="news-delay-presets" role="group" aria-label="Quick publish timing">{[0,15,30,60].map(seconds => <button key={seconds} type="button" aria-pressed={headlineDelay === seconds} onClick={() => setHeadlineDelay(seconds)}>{seconds ? `After ${seconds}s` : "Now"}</button>)}</div>
      {impactPreview && <section className="news-impact-preview"><div className="impact-heading"><b>Target stock effects</b><span>{impactPreview.combined.filter(stock => stock.change > 0).length} up · {impactPreview.combined.filter(stock => stock.change < 0).length} down</span></div><p>The direct price move builds over about {NEWS_REACTION_SECONDS} seconds; the follow-through usually settles within {NEWS_EFFECT_MIN_SECONDS}–{NEWS_EFFECT_MAX_SECONDS} seconds.</p><div className="impact-table">{impactPreview.combined.map(stock => <div className="impact-row" key={stock.symbol}><b>{stock.symbol}</b><span>{money(stock.before)} → {money(stock.after)}</span><strong className={stock.change >= 0 ? "positive" : "negative"}>{stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%</strong></div>)}</div><details className="news-effect-details"><summary>Individual headline effects</summary>{impactPreview.headlines.map(({ news, stocks }) => <details className="news-effect-details" key={news.id}><summary>{news.headline}</summary><p className="host-card-copy">Standalone target, before scope priority is applied to the mix.</p><div className="impact-table">{stocks.map(stock => <div className="impact-row" key={stock.symbol}><b>{stock.symbol}</b><span>{money(stock.after)}</span><strong className={stock.change >= 0 ? "positive" : "negative"}>{stock.changePct.toFixed(2)}%</strong></div>)}</div></details>)}</details></section>}
      {newsImpactTimer}
      {Boolean(world?.scheduledNews.length) && <details className="news-automation-fast"><summary>{world!.scheduledNews.length} headlines scheduled</summary>{world!.scheduledNews.map((event,index) => <div className="news-queued-row" key={`${event.at}-${index}`}><b>{world!.news[event.index]?.headline ?? "Scheduled headline"}</b><span>{Math.max(0, Math.ceil((event.at - hostClockNow) / 1000))}s</span></div>)}</details>}

    </section>
  </div>;

  if (!authenticated) return <main className="host-login"><a href="/play" className="login-wordmark"><DalaalMark/> Dalaal Street</a><section className="login-card"><span className="eyebrow">PRATIBIMB / EVENT OPERATIONS</span><h1>Host access<span>.</span></h1><p>Sign in to manage the shared market, batch sessions and live audience display.</p><form onSubmit={login}><label htmlFor="hostPass">HOST PASSWORD</label><input id="hostPass" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter host password" required/><button className="host-primary" disabled={working}>{working ? "Checking…" : "Open Host Console →"}</button></form>{error && <div className="host-error">{error}</div>}<small className="login-note">Private host tools · This URL is not linked from participant screens.</small></section><div className="login-foot">DALAA<span>L</span> STREET · MARKET SIMULATION</div></main>;

  return <main className="host-app"><header className="host-top"><a className="login-wordmark" href="/host"><DalaalMark/> Dalaal Street</a><div className="host-top-center"><i/> HOST CONSOLE <span>·</span> BATCH {String(world?.batch ?? 0).padStart(2, "0")}</div><div className="host-top-actions"><a className="host-quiet" href="/audience" target="_blank">Open audience wall ↗</a><button className="theme-button host-theme" onClick={() => setTheme(current => current === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? "◐" : "☀"}</button><button className="host-quiet" disabled={working} onClick={() => void logout()}>Sign out</button></div></header>
    <div className={`host-layout${navCollapsed ? " nav-collapsed" : ""}`}>
      <aside className={`host-nav${navCollapsed ? " is-collapsed" : ""}`}>
        <div className="host-nav-heading">
          <span className="eyebrow">OPERATIONS</span>
          <button type="button" className="host-nav-toggle" aria-label={navCollapsed ? "Expand host navigation" : "Collapse host navigation"} title={navCollapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!navCollapsed} onClick={() => setNavCollapsed(collapsed => !collapsed)}><span aria-hidden="true">{navCollapsed ? "»" : "«"}</span></button>
        </div>
        {HOST_SECTIONS.map(section => <button key={section.key} type="button" title={`${section.label} · ${section.keys}`} onClick={() => setTab(section.key)} className={tab === section.key ? "active" : ""} aria-current={tab === section.key ? "page" : undefined}><span className="host-nav-icon" aria-hidden="true">{section.icon}</span><span className="host-nav-label">{section.label}</span><small className="host-nav-shortcut">{section.keys}</small></button>)}
        <div className="host-nav-bottom"><span className={`server-state ${world ? "healthy" : ""}`}/><span><b>Market engine</b><small>{world ? "Connected · Supabase" : "Connecting…"}</small></span></div>
      </aside>      <section className="host-content"><div className="host-page-title"><div><span className="eyebrow">MARKET OPERATIONS / {tab.toUpperCase()}</span><h1>{({ logs: "Game logs", brain: "News brain", overview: "Overview", quick: "Quick access", market: "Market control", news: "News studio", sessions: "Participant sessions", leaderboard: "Participant leaderboard", notes: "Host notes", settings: "Batch settings", shortcuts: "Keyboard shortcuts" })[tab]}<span>.</span></h1><p>{({ logs: "Review material activity across batches. The brain uses relevant recent events alongside live market readings.", brain: "Watch decisions, adjust the next set or start and stop autonomous news during any live batch.", overview: "Your batch, participant terminals and latest market activity at a glance.", quick: "Build and publish news, then reach the live controls beside it.", market: "Tune the conditions that shape every order and price tick.", news: "Build a mix of clear economy, sector and company news, then review its effects before publishing.", sessions: "Monitor connected participant devices and manage their participation.", leaderboard: "See current batch standings and each terminal’s best and worst closed trade.", notes: "Private reminders shared across host devices.", settings: "Choose the synchronized batch duration and market update rate.", shortcuts: "Alt plus a matching letter opens host sections or runs a live action." })[tab]}</p></div><div className={`host-status ${world?.status === "live" && !world.controls.paused ? "live" : ""}`}><i/>{world?.controls.paused ? "PAUSED" : world?.status === "countdown" ? "OPENING BELL" : world?.status === "live" ? "MARKET LIVE" : world?.status === "closed" ? "MARKET CLOSED" : "READY"}<b>{world?.status === "countdown" ? `OPENING IN ${Math.max(0, Math.ceil((world.startedAt - Date.now()) / 1000))}s` : world?.status === "live" ? fmtTime(world.remaining) : `BATCH ${String(world?.batch ?? 1).padStart(2, "0")}`}</b></div></div>
        {(error || connectionError) && <div className="host-error wide-error" role="alert">{error || connectionError}<button onClick={() => { setError(""); setConnectionError(""); }}>×</button></div>}

        {tab === "overview" && <div className="host-overview">
          <section className="launch-panel"><div className="launch-label"><span className="eyebrow">BATCH {world?.batch || 1}</span><span className="secure-tag">{connectedCount} TERMINALS ONLINE</span></div><div className="launch-main"><div><h2>{world?.status === "live" ? world.controls.paused ? "Market paused" : "The floor is live" : world?.status === "countdown" ? "Opening bell…" : world?.status === "closed" ? "Batch complete" : "Ready for the next batch"}</h2><p>{world?.status === "live" ? `${fmtTime(world.remaining)} remaining` : `${Math.round((world?.duration ?? 360) / 60)} minute batch`} · ₹10,00,000 per player</p></div><div className="launch-buttons">{world?.status === "live" ? <><button className="host-primary" disabled={working} onClick={() => void act(world.controls.paused ? "resume" : "pause")}>{world.controls.paused ? "Resume market" : "Pause market"}<small className="host-button-shortcut">Alt + P</small></button><button className="host-danger" disabled={working} onClick={() => { if (confirm("End this batch and close all positions?")) void act("end"); }}>End batch</button></> : <button className="host-primary" disabled={working || !world || world.status === "countdown"} onClick={() => void act("start")}>{world?.status === "closed" ? "Start next batch" : "Start batch"}</button>}</div></div></section>
          <div className="host-metric-grid"><HostMetric label="DALAAL-10" value={Number(world?.index ?? 10000).toLocaleString("en-IN", {maximumFractionDigits:2})} sub={`${Number(world?.indexChange ?? 0).toFixed(2)}% this batch`} positive={!world || world.indexChange >= 0}/><HostMetric label="TERMINALS ONLINE" value={String(connectedCount)} sub={`of ${TERMINAL_COUNT} stations`}/><HostMetric label="NEWS PUBLISHED" value={String(world?.headlines.length ?? 0)} sub={`${world?.scheduledNews.length ?? 0} scheduled`}/><HostMetric label="MARKET STATUS" value={world?.controls.paused ? "Paused" : world ? ({live:"Live",ready:"Ready",closed:"Closed",countdown:"Opening"})[world.status] : "Connecting"} sub={`${world?.controls.tickRate ?? 1}s updates`}/></div>
          <div className="overview-jump-grid">{HOST_SECTIONS.filter(section => ["news","quick","market","settings"].includes(section.key)).map(section => <button key={section.key} className="host-card overview-jump" onClick={() => setTab(section.key)}><span className="host-nav-icon">{section.icon}</span><b>{section.label}</b><small>{section.keys}</small><span>↗</span></button>)}</div>
          <div className="host-control-columns"><section className="host-card"><div className="host-card-title"><h2>Terminal status</h2><button className="text-link" onClick={() => setTab("sessions")}>Sessions <small>Alt + S</small></button></div><div className="overview-terminal-grid">{players.map(player => <button key={player.id} onClick={() => { setInspectId(player.id); setTab("sessions"); }}><span><b>{player.terminalNumber ? `Terminal ${String(player.terminalNumber).padStart(2,"0")}` : "Unnumbered terminal"}</b><small>{!connected(player) ? "Offline" : player.ended ? "Finished" : player.paused ? "Paused" : player.included ? "Connected" : "Excluded"}</small></span><strong>{money(world ? equity(world,player) : player.cash)}</strong></button>)}</div>{!players.length && <p className="host-card-copy">Waiting for participants to join their terminals.</p>}</section><section className="host-card"><div className="host-card-title"><h2>Latest news</h2><button className="text-link" onClick={() => setTab("news")}>Publish news <small>Alt + N</small></button></div>{newsImpactTimer}<div className="overview-bulletins">{world?.headlines.slice(0,4).map(news => <article key={news.id}><span className={news.direction > 0 ? "positive" : "negative"}><NewsDirectionIcon direction={news.direction}/></span><div><small>{newsScope(news)}</small><b>{news.headline}</b></div></article>)}</div>{!world?.headlines.length && <p className="host-card-copy">Published headlines will appear here.</p>}</section></div>
        </div>}

        {tab === "quick" && <div className="host-quick-dashboard"><div className="quick-start-row"><button className="quick-start-batch" type="button" disabled={working || !world || world.status === "live" || world.status === "countdown"} onClick={() => void act("start")}>Start batch</button></div><div className="quick-access-columns quick-news-layout">
            {newsWorkspace}
            <div className="host-quick-stack">
          <section className="launch-panel"><div className="launch-label"><span className="eyebrow">BATCH {String(world?.batch ?? 0).padStart(2, "0")} / LIVE STATUS</span><span className="secure-tag">{connectedCount} TERMINALS ONLINE</span></div><div className="launch-main"><div><h2>{world?.status === "countdown" ? "Opening bell in a moment" : world?.status === "live" ? world.controls.paused ? "Market paused" : "Market in session" : world?.status === "closed" ? "Session wrapped" : "Ready for the floor?"}</h2><p>{world?.status === "live" ? `Dalaal-10 ${Number(world.index ?? 10_000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} · ${world.indexChange >= 0 ? "+" : ""}${Number(world.indexChange ?? 0).toFixed(2)}% · ${fmtTime(world.remaining)} left` : `${TERMINAL_COUNT} terminal stations · ${Math.floor((world?.duration ?? 480) / 60)} minute batch · ₹10,00,000 starting cash`}</p></div><div className="launch-buttons">{world?.status === "countdown" ? <button className="host-primary" disabled>Opening bell…</button> : world?.status === "live" ? <button className="host-primary" disabled={working} onClick={() => void act(world.controls.paused ? "resume" : "pause")}><small className="host-button-shortcut">Alt + P</small>{world.controls.paused ? "Resume market" : "Pause market"}</button> : <button className="host-primary" disabled={working || !world} onClick={() => void act("start")}>{world?.status === "closed" ? "Start next batch" : "Start batch →"}</button>}{world?.status === "live" && <button className="host-danger" disabled={working} onClick={() => { if (confirm("End this batch and close all open long and short positions at current simulated prices?")) void act("end"); }}>End batch</button>}</div></div><div className="launch-foot"><span><i className="live-dot"/> {connectedCount} connected devices</span><span>{world?.controls.scenario ?? "Sideways"} market · {world?.controls.volatility ?? 40.8}% volatility · {VIRTUAL_BOT_COUNT} simulated traders at {world?.controls.bots ?? 58}% activity</span></div></section>
          <div className="host-metric-grid"><HostMetric label="DALAAL-10" value={Number(world?.index ?? 10_000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} sub={`${world && world.indexChange >= 0 ? "+" : ""}${Number(world?.indexChange ?? 0).toFixed(2)}% this batch`} positive={!world || world.indexChange >= 0}/><HostMetric label="TERMINALS ONLINE" value={`${connectedCount}`} sub={`of ${TERMINAL_COUNT} stations`}/><HostMetric label="LATEST NEWS" value={`${world?.headlines.length ?? 0}`} sub={`${world?.scheduledNews.length ?? 0} headlines queued`}/><HostMetric label="MARKET UPDATES" value={`${world?.tick ?? 0}`} sub={`${world?.controls.tickRate ?? 1}s shared update cadence`}/></div>
          <section className="host-card latest-host-news"><div className="host-card-title"><div><span className="eyebrow">LATEST BULLETIN</span><h2>Market news</h2></div><button className="text-link" onClick={() => setTab("news")}><small className="host-inline-shortcut">Alt + N</small>News studio →</button></div><p>{world?.headlines.slice(0, 3).map(news => news.headline).join(" · ") || "No headlines published in this batch yet."}</p><button className="quick-secondary-action" onClick={() => setTab("news")}>{selectedNews.length ? `${selectedNews.length} picked · review effects and publish` : "Build a news mix and review its effect"} →</button></section><section className="host-card"><div className="host-card-title"><div><span className="eyebrow">PARTICIPANT DEVICES</span><h2>Terminal activity</h2></div><button className="text-link" onClick={() => setTab("sessions")}><small className="host-inline-shortcut">Alt + S</small>Sessions →</button></div>{players.length ? players.slice(0, 4).map(player => <div className="device-row" key={player.id}><span className="device-avatar">{player.terminalNumber ? String(player.terminalNumber).padStart(2, "0") : "—"}</span><span><b>{player.terminalNumber ? `Terminal ${String(player.terminalNumber).padStart(2, "0")}` : "Unnumbered device"}</b><small>{!connected(player) ? "Offline" : player.ended ? "Ended" : player.paused ? "Paused" : player.included ? "Ready to trade" : "Excluded"}</small></span><span className="device-value">{money(player.cash)}</span><i className={`device-indicator ${!connected(player) || player.ended ? "off" : player.included ? "" : "paused"}`}/></div>) : <div className="host-empty">No terminals yet.<small>Participants can open /play/01 through /play/10.</small></div>}<button className="quick-secondary-action" onClick={() => setTab("sessions")}><small className="host-inline-shortcut">Alt + S</small>See all terminal data →</button></section><section className="host-card host-action-history"><div className="host-card-title"><div><span className="eyebrow">RECENT HOST ACTIONS</span><h2>Activity</h2></div><span className="secure-tag">THIS CONSOLE</span></div>{hostActions.length ? <div className="host-action-list">{hostActions.map(entry => <div className="host-action-row" key={entry.id}><span>{entry.message}</span><time>{new Date(entry.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div>)}</div> : <p className="host-card-copy host-action-empty">Host actions appear here while this console is open.</p>}</section></div></div>
        </div>}

        {tab === "market" && <div className="host-control-columns"><section className="host-card"><div className="host-card-title"><div><span className="eyebrow">MARKET DIRECTION</span><h2>Scenario &amp; impact</h2></div></div><div className="scenario-grid">{["Bullish", "Bearish", "Sideways", "Volatile"].map(s => <button key={s} className={world?.controls.scenario === s ? "selected" : ""} disabled={working} onClick={() => void act("scenario", { value: s })}><span>{s === "Bullish" ? "↗" : s === "Bearish" ? "↘" : s === "Volatile" ? "⌁" : "→"}</span><b>{s}</b><small>{s === "Bullish" ? "Positive drift" : s === "Bearish" ? "Negative drift" : s === "Volatile" ? "Higher swings" : "Balanced flow"}</small></button>)}</div><Slider label="Market bias" value={controls.marketBias} min={0} max={100} left="Bearish" right="Bullish" onChange={n => setControls(c => ({ ...c, marketBias: n }))} onCommit={() => void act("controls", { marketBias: controls.marketBias })}/><Slider label="Volatility" value={controls.volatility} min={12.8} max={85} step={0.1} left="Calm" right="High" onChange={n => setControls(c => ({ ...c, volatility: n }))} onCommit={() => void act("controls", { volatility: controls.volatility })}/><Slider label="Bot activity" value={controls.bots} min={0} max={100} left="Quiet" right="Active" onChange={n => setControls(c => ({ ...c, bots: n }))} onCommit={() => void act("controls", { bots: controls.bots })}/></section>
          <section className="host-card"><div className="host-card-title"><div><span className="eyebrow">PRICE INTERVENTION</span><h2>Move a market</h2></div><span className="secure-tag">ACTIVE BATCH ONLY</span></div><p className="host-card-copy">Immediate and scheduled changes run through the same market feed.</p><label className="host-field">AFFECTED MARKET<select value={intervention.sector} onChange={e => setIntervention(i => ({ ...i, sector: e.target.value }))}>{["ALL", ...Array.from(new Set(world?.stocks.map(s => s.sector) ?? [])), ...(world?.stocks.map(s => s.symbol) ?? [])].map(s => <option key={s} value={s}>{s === "ALL" ? "Whole market" : s}</option>)}</select></label><div className="inline-fields"><label className="host-field">DIRECTION<select value={intervention.direction} onChange={e => setIntervention(i => ({ ...i, direction: e.target.value }))}><option value="up">Positive ↗</option><option value="down">Negative ↘</option></select></label><label className="host-field">MOVE SIZE<select value={intervention.magnitude} onChange={e => setIntervention(i => ({ ...i, magnitude: Number(e.target.value) }))}><option value="0.5">0.5% gradual</option><option value="1.5">1.5% move</option><option value="3">3% shock</option><option value="5">5% shock</option></select></label></div><label className="host-field">SCHEDULE (SECONDS)<input type="number" min="0" max="300" value={intervention.delay} onChange={e => setIntervention(i => ({ ...i, delay: Number(e.target.value) }))}/></label><button className="host-primary full" disabled={working || world?.status !== "live"} onClick={() => {
            const targetCount = world?.stocks.filter(stock => intervention.sector === "ALL" || stock.sector === intervention.sector || stock.symbol === intervention.sector).length ?? 0;
            if (intervention.magnitude >= 3) {
              const direction = intervention.direction === "up" ? "positive" : "negative";
              const timing = intervention.delay ? `in ${intervention.delay} seconds` : "now";
              if (!window.confirm(`Apply a ${intervention.magnitude}% ${direction} move to ${targetCount} stocks in ${intervention.sector === "ALL" ? "the whole market" : intervention.sector} ${timing}?`)) return;
            }
            void act("intervene", intervention);
          }}>{intervention.delay ? `Schedule within batch · ${intervention.delay}s` : "Apply intervention now"} →</button></section>
        </div>}

        {tab === "logs" && <HostLogs logs={world?.logs}/> }
        {tab === "brain" && brainPanel}
        {tab === "news" && newsWorkspace}

        {tab === "sessions" && <section className="host-card sessions-card"><div className="host-card-title"><div><span className="eyebrow">BATCH {String(world?.batch ?? 1).padStart(2, "0")} / DEVICE MONITOR</span><h2>Participant sessions</h2></div><button className="host-quiet" onClick={() => void refresh()}>↻ Refresh</button></div><p className="host-card-copy">Cash, equity and trades show the newest login per terminal. Older duplicate browser IDs do not get added together.</p>{!players.length ? <div className="host-empty">No participants yet.<small>Ask players to open /play/01 through /play/10 for numbered terminals.</small></div> : <div className="session-list"><div className="session-head"><span>DEVICE</span><span>STATUS</span><span>AVAILABLE CASH</span><span>EQUITY</span><span>ACTIONS</span></div>{players.map(p => <div className="session-row" key={p.id}><span className="session-device"><i>{p.terminalNumber ? String(p.terminalNumber).padStart(2, "0") : "—"}</i><span><b>{p.terminalNumber ? `Terminal ${String(p.terminalNumber).padStart(2, "0")}` : "Unnumbered device"}</b>{p.linkedSessionCount > 1 && <small>{p.activeSessionCount > 1 ? `${p.activeSessionCount} active logins · newest shown` : `${p.linkedSessionCount} linked records · newest shown`}</small>}</span></span><span><span className={`session-state ${!connected(p) || p.ended ? "ended" : p.paused ? "paused" : p.included ? "trading" : "excluded"}`}>{!connected(p) ? "Offline" : p.ended ? "Ended" : p.paused ? "Paused" : p.included ? (world?.status === "live" ? "Trading" : "Ready") : "Excluded"}</span></span><span>{money(p.cash)}</span><span>{money(world ? equity(world, p) : p.cash)}</span><span className="session-actions"><button className={p.sessionIds.includes(inspectId ?? "") ? "inspecting" : ""} onClick={() => setInspectId(current => p.sessionIds.includes(current ?? "") ? null : p.id)}>{p.sessionIds.includes(inspectId ?? "") ? "Hide data" : "View data"}</button><button disabled={working} onClick={() => void act("participant", { ids: p.sessionIds, command: "pause", value: !p.paused })}>{p.paused ? "Resume" : "Pause"}</button><button disabled={working} onClick={() => void act("participant", { ids: p.sessionIds, command: "include", value: !p.included })}>{p.included ? "Exclude" : "Include"}</button><button disabled={working} onClick={() => { if (confirm("End sessions linked to this terminal and close their open long and short positions?")) void act("participant", { ids: p.sessionIds, command: "end" }); }}>End</button></span></div>)}</div>}{inspectedPlayer && <div className="terminal-inspection"><div className="terminal-inspection-head"><div><span className="eyebrow">READ-ONLY TERMINAL VIEW</span><h3>{inspectedPlayer.terminalNumber ? `Terminal ${String(inspectedPlayer.terminalNumber).padStart(2, "0")}` : "Unnumbered device"} · {inspectedPlayer.ended ? "Session ended" : inspectedPlayer.paused ? "Paused" : "Active"}</h3></div><button className="host-quiet" onClick={() => setInspectId(null)}>Close</button></div><div className="terminal-inspection-metrics"><div><small>AVAILABLE CASH</small><b>{money(inspectedPlayer.cash)}</b></div><div><small>PORTFOLIO EQUITY</small><b>{money(inspectedEquity)}</b></div><div><small>OPEN POSITIONS</small><b>{inspectedPositions.length}</b></div><div><small>TRADES</small><b>{inspectedPlayer.history.length}</b></div></div><div className="terminal-inspection-columns"><div><b>Positions</b>{inspectedPositions.length ? inspectedPositions.map(position => <div className="inspect-row" key={`${position.symbol}-${position.side}`}><span>{position.symbol}<small>{position.side} · {position.qty} shares</small></span><span>{money(position.price * position.qty)}<small className={((position.price - position.avg) * position.qty * (position.side === "Long" ? 1 : -1)) >= 0 ? "positive" : "negative"}>{money((position.price - position.avg) * position.qty * (position.side === "Long" ? 1 : -1))} P&amp;L</small></span></div>) : <p className="inspect-empty">No open positions.</p>}</div><div><b>Recent trades</b>{inspectedPlayer.history.length ? inspectedPlayer.history.slice(0, 5).map((trade, index) => <div className="inspect-row" key={`${trade.time}-${index}`}><span>{trade.symbol}<small>{trade.side} · {trade.qty} shares</small></span><span>{money(trade.price * trade.qty)}<small>{new Date(trade.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</small></span></div>) : <p className="inspect-empty">No trades placed.</p>}</div></div><p className="inspect-note">This view shows the newest login. Host actions apply to every linked record.</p></div>}<div className="session-footer"><span>{connectedCount} connected / {TERMINAL_COUNT} terminal stations</span><span>Terminal actions apply to linked records; portfolio values show the newest login.</span></div></section>}

        {tab === "leaderboard" && <section className="host-card leaderboard-card"><div className="host-card-title"><div><span className="eyebrow">BATCH {String(world?.batch ?? 1).padStart(2, "0")} / HOST ONLY</span><h2>Participant leaderboard</h2></div><span className="secure-tag">RANKED BY RETURN</span></div><p className="host-card-copy">Standings use portfolio value against each terminal’s ₹10,00,000 starting cash. Open positions are valued at current simulated prices; best and worst trades show realized results from closed trades.</p>{leaderboard.length ? <div className="leaderboard-list">{leaderboard.map((entry, index) => { const player = entry.player; const status = !connected(player) ? "Offline" : player.ended ? "Finished" : player.paused ? "Paused" : player.included ? (world?.status === "live" ? "Trading" : "Ready") : "Excluded"; return <article className={`leaderboard-row ${index === 0 ? "leaderboard-first" : ""}`} key={player.id}><div className="leaderboard-player"><b className="leaderboard-rank">{String(index + 1).padStart(2, "0")}</b><span><strong>{player.terminalNumber ? `Terminal ${String(player.terminalNumber).padStart(2, "0")}` : "Unnumbered terminal"}</strong><small>{status}</small></span></div><div className="leaderboard-return"><small>RETURN</small><b className={entry.profit >= 0 ? "positive" : "negative"}>{entry.returnPct >= 0 ? "+" : ""}{entry.returnPct.toFixed(2)}%</b><span className={entry.profit >= 0 ? "positive" : "negative"}>{signedMoney(entry.profit)}</span></div><div className="leaderboard-value"><small>PORTFOLIO VALUE</small><b>{money(entry.portfolio)}</b></div><div className="leaderboard-trades"><span><small>BEST CLOSED TRADE</small><b>{entry.bestTrade ? `${entry.bestTrade.symbol} · ${signedMoney(entry.bestTrade.realized)}` : "—"}</b></span><span><small>WORST CLOSED TRADE</small><b>{entry.worstTrade ? `${entry.worstTrade.symbol} · ${signedMoney(entry.worstTrade.realized)}` : "—"}</b></span></div></article>; })}</div> : <div className="host-empty">No participants have joined this batch yet.<small>Once terminals start trading, their standings will appear here.</small></div>}</section>}

        {tab === "notes" && <section className="host-card host-notes-panel"><div className="host-card-title"><div><span className="eyebrow">PRIVATE HOST NOTES</span><h2>Quick notes</h2></div><span className="secure-tag">{hostNotes.length}/{MAX_HOST_NOTES} · SYNCED</span></div><p className="host-card-copy">Short reminders sync through the host account, so they’re available after sign-in on any device. Players can’t see them.</p><form className="host-note-form" onSubmit={saveNote}><label className="host-field" htmlFor="host-note-text">{editingNoteId ? "EDIT NOTE" : "NEW NOTE"}<textarea id="host-note-text" rows={3} maxLength={MAX_HOST_NOTE_LENGTH} value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder="Add a short reminder…"/></label><div className="host-note-form-footer"><small>{noteDraft.length}/{MAX_HOST_NOTE_LENGTH} characters</small><div>{editingNoteId && <button type="button" className="outline-button" disabled={working} onClick={() => { setEditingNoteId(null); setNoteDraft(""); setNotesError(""); }}>Cancel</button>}<button className="host-primary" disabled={working || !notesReady || !noteDraft.trim() || (!editingNoteId && hostNotes.length >= MAX_HOST_NOTES)}>{working ? "Saving…" : editingNoteId ? "Save changes" : "Add note"}</button></div></div></form>{hostNotes.length >= MAX_HOST_NOTES && !editingNoteId && <p className="host-note-error" role="status">Delete a note before adding another.</p>}{notesError && <p className="host-note-error" role="alert">{notesError} <button type="button" onClick={retryNotesMigration}>Retry sync</button></p>}{!notesReady ? <div className="host-empty">Loading notes…</div> : hostNotes.length ? <div className="host-note-list">{hostNotes.map(note => <article className="host-note" key={note.id}><p>{note.text}</p><div className="host-note-meta"><time>{new Date(note.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{note.updatedAt > note.createdAt ? " · edited" : ""}</time><span><button type="button" disabled={working} onClick={() => editNote(note)}>Edit</button><button type="button" className="delete" disabled={working} onClick={() => void deleteNote(note.id)}>Delete</button></span></div></article>)}</div> : <div className="host-empty host-note-empty">No notes yet.<small>Add reminders or quick event details for yourself.</small></div>}</section>}

        {tab === "shortcuts" && <section className="host-card host-shortcuts-panel"><div className="host-card-title"><div><span className="eyebrow">HOST OPERATIONS</span><h2>Shortcuts</h2></div><span className="secure-tag">HOST PANEL ONLY</span></div><p className="host-shortcuts-intro">Press Alt and the matching letter together anywhere in the host panel to open a section or run a live action.</p><div className="host-shortcut-list">{HOST_SHORTCUTS.map(shortcut => <article className="host-shortcut-row" key={shortcut.label}><span><b>{shortcut.label}</b><small>{shortcut.detail}</small></span><kbd>{shortcut.keys}</kbd></article>)}</div><p className="host-shortcuts-note">The letters match each action where possible. Navigation works even when its section is off screen. Shortcuts pause or publish only while a batch is live, and are ignored while a text field is active. They do not apply to audience or trading screens.</p></section>}
        {tab === "settings" && <div className="host-control-columns"><section className="host-card"><div className="host-card-title"><div><span className="eyebrow">BATCH CONFIGURATION</span><h2>Session clock</h2></div></div><p className="host-card-copy">The countdown is stored in the shared market and starts for every connected device together.</p><label className="host-field">BATCH LENGTH<select value={controls.duration} onChange={e => setControls(c => ({ ...c, duration: Number(e.target.value) }))}>{Array.from({ length: 12 }, (_, index) => index + 4).map(minutes => <option key={minutes} value={minutes * 60}>{minutes} minutes</option>)}</select></label><div className="setting-current"><span>Current remaining</span><b>{world?.status === "live" ? fmtTime(world.remaining) : "Not started"}</b></div><button className="host-primary full" disabled={working || world?.status === "live"} onClick={() => void act("controls", { duration: controls.duration })}>Set duration for next batch</button></section><section className="host-card"><div className="host-card-title"><div><span className="eyebrow">DISPLAY &amp; RESET</span><h2>System settings</h2></div></div><p className="host-card-copy">Changes to the market cadence apply to all active devices.</p><div className="tick-options"><button className={controls.tickRate === .5 ? "active" : ""} disabled={working} onClick={() => {setControls(c => ({ ...c, tickRate: .5 }));void act("controls", { tickRate: .5 });}}><b>0.5 sec</b><small>Fast display</small></button><button className={controls.tickRate === 1 ? "active" : ""} disabled={working} onClick={() => {setControls(c => ({ ...c, tickRate: 1 }));void act("controls", { tickRate: 1 });}}><b>1 sec</b><small>Standard display</small></button></div><div className="setting-current"><span>Connected devices</span><b>{connectedCount}</b></div><button className="host-danger full" disabled={working} onClick={() => {if (confirm("Reset this batch? Current prices, news, portfolios and trades will be cleared.")) void act("reset");}}>Reset batch &amp; sessions</button></section></div>}
      </section>
    </div>
  </main>;
}

function describeHostAction(action: string, payload: Record<string, unknown>, world: HostWorld): string | null {
  const batch = `Batch ${String(world.batch).padStart(2, "0")}`;
  if (action === "start") return `Started ${batch}`;
  if (action === "end") return `Ended ${batch}`;
  if (action === "reset") return `Reset ${batch} and cleared its sessions`;
  if (action === "pause") return `Paused the market in ${batch}`;
  if (action === "resume") return `Resumed the market in ${batch}`;
  if (action === "autonomous-start") return `Started the autonomous news brain${world.status === "live" ? ` in ${batch}` : " for the next batch"}`;
  if (action === "autonomous-stop") return "Stopped the autonomous news brain; manual news remains available";
  if (action === "autonomous-plan") return `Replaced the brain’s next set with ${Array.isArray(payload.indices) ? payload.indices.length : 0} host-selected headlines`;
  if (action === "autonomous-publish-now") return `Published the brain’s planned set early in ${batch}`;
  if (action === "autonomous-skip") return "Skipped the proposed news set and asked the brain to reselect";
  if (action === "scenario") return `Set market scenario to ${String(payload.value)}`;
  if (action === "intervene") {
    const sign = payload.direction === "down" ? "−" : "+";
    const magnitude = Number(payload.magnitude ?? 1).toFixed(1);
    const market = String(payload.sector ?? "ALL") === "ALL" ? "whole market" : String(payload.sector);
    const when = Number(payload.delay) > 0 ? `scheduled for ${payload.delay}s later` : "applied now";
    return `${sign}${magnitude}% ${market} move ${when}`;
  }
  if (action === "headline") {
    const indices = Array.isArray(payload.indices) ? payload.indices.map(Number) : [];
    if (Number(payload.delay) > 0) return `Scheduled ${indices.length} ${indices.length === 1 ? "headline" : "headlines"} for ${payload.delay}s later`;
    const titles = indices.map(index => world.news[index]?.headline).filter((title): title is string => Boolean(title));
    if (!titles.length) return "Published market news";
    const first = titles[0].length > 72 ? `${titles[0].slice(0, 69)}…` : titles[0];
    return titles.length > 1 ? `${first} (+${titles.length - 1} more)` : `Published: ${first}`;
  }
  if (action === "controls") {
    const labels: Record<string, string> = { volatility: "volatility", bots: "bot activity", tickRate: "update speed", marketBias: "market bias", duration: "batch length", newsEnabled: "automatic news", majorAuto: "major news count", minorAuto: "minor news count", newsSpacing: "news spacing" };
    const changed = Object.keys(payload).map(key => labels[key]).filter(Boolean);
    return changed.length ? `Updated ${changed.join(", ")}` : "Saved market settings";
  }
  if (action === "participant") {
    const ids = Array.isArray(payload.ids) ? payload.ids.map(String) : [];
    const terminal = ids.map(id => world.sessions[id]?.terminalNumber).find(Boolean);
    const target = terminal ? `Terminal ${String(terminal).padStart(2, "0")}` : "participant";
    const command = String(payload.command ?? "updated");
    const verb = command === "pause" ? payload.value ? "Paused" : "Resumed" : command === "include" ? payload.value ? "Included" : "Excluded" : command === "end" ? "Ended" : "Reset";
    return `${verb} ${target}`;
  }
  return null;
}

function HostMetric({ label, value, sub, positive }: { label: string; value: string; sub: string; positive?: boolean }) { return <div className="host-metric"><span>{label}</span><b className={positive === undefined ? "" : positive ? "positive" : "negative"}>{value}</b><small>{sub}</small></div>; }
function Slider({ label, value, min, max, left, right, step = 1, onChange, onCommit }: { label: string; value: number; min: number; max: number; left: string; right: string; step?: number; onChange: (n: number) => void; onCommit: () => void }) { return <label className="host-slider"><span><b>{label}</b><strong>{Number.isInteger(value) ? value : value.toFixed(1)}%</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} onMouseUp={onCommit} onTouchEnd={onCommit}/><small><span>{left}</span><span>{right}</span></small></label>; }
