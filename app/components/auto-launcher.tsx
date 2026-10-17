"use client";

import { useEffect, useState } from "react";
import { DalaalMark } from "@/components/trader-parts";

type AutoStatus = { status: "ready" | "countdown" | "live" | "closed"; batch: number; duration: number; remaining: number; startedAt: number; index: number; indexChange: number; autonomousNewsActive: boolean };
const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const clock = (seconds: number) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, Math.floor(seconds) % 60)).padStart(2, "0")}`;

export function AutoLauncher() {
  const [status, setStatus] = useState<AutoStatus | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/auto", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The shared game could not be reached.");
        if (mounted) { setStatus(result as AutoStatus); setError(""); }
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "The shared game could not be reached.");
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  async function start() {
    if (working) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The game could not be started.");
      setStatus(result as AutoStatus);
      setMessage(result.result?.message || "The game is starting.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The game could not be started.");
    } finally { setWorking(false); }
  }

  const countdown = status?.status === "countdown" ? Math.ceil((status.startedAt - Date.now()) / 1000) : 0;
  const live = status?.status === "live" || status?.status === "countdown";
  const closed = status?.status === "closed";
  return <main className="auto-launch-page">
    <a className="auto-launch-brand" href="/"><DalaalMark/><span>DALAA<span>L</span> STREET</span></a>
    <section className="auto-launch-card">
      <div className="auto-launch-kicker"><i/> DALAA<span>L</span> STREET · LIVE MARKET GAME</div>
      <h1>{live ? "The market is open." : closed ? "Ready for another round?" : "Ready to ring the bell?"}</h1>
      <p className="auto-launch-intro">Start a shared batch for the trading terminals and audience board. The autonomous news brain will choose story sets and pace them as the market unfolds.</p>
      <div className="auto-launch-metrics">
        <div><small>MARKET</small><b>{status ? money(status.index) : "—"}</b><span className={status && status.indexChange >= 0 ? "positive" : "negative"}>{status ? `${status.indexChange >= 0 ? "+" : ""}${status.indexChange.toFixed(2)}%` : "Connecting"}</span></div>
        <div><small>BATCH</small><b>{String(status?.batch ?? 0).padStart(2, "0")}</b><span>{status ? `${Math.round(status.duration / 60)} minute round` : "Shared game"}</span></div>
        <div><small>NEWS BRAIN</small><b>{status?.autonomousNewsActive ? "ACTIVE" : live ? "HOST PAUSED" : "READY"}</b><span>{status?.autonomousNewsActive ? "Choosing the next 2 or 3 stories" : live ? "Host controls its operation" : "Starts with this round"}</span></div>
      </div>
      {live ? <div className="auto-launch-live"><span><i/>{status?.status === "countdown" ? "OPENING BELL" : "BATCH IN PROGRESS"}</span><strong>{status?.status === "countdown" ? `Starts in ${Math.max(0, countdown)}s` : `${clock(status?.remaining ?? 0)} remaining`}</strong><small>{status?.autonomousNewsActive ? "News decisions and market activity are visible to the host." : "The host can restart autonomous news from the Host Console."}</small></div>
        : <button className="auto-launch-button" disabled={working || !status} onClick={() => void start()}>{working ? "Starting the shared game…" : status ? closed ? "Start the next batch" : "Start the game" : "Connecting to game…"}<span aria-hidden="true">→</span></button>}
      {(message || error) && <p className={`auto-launch-message ${error ? "error" : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
      <div className="auto-launch-foot"><span>10 numbered player terminals</span><span>Shared host and audience screens</span></div>
    </section>
    <p className="auto-launch-note">Anyone can start a round here. The host console remains protected and can inspect, pause, or override the news brain at any time.</p>
  </main>;
}
