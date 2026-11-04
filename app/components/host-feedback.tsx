"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedbackRow } from "@/game/store";

const pad2 = (n: number) => String(n).padStart(2, "0");
const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const fmt = (n: number | null) => n === null ? "—" : n.toFixed(1);

/** Host feedback tab: loads on open and on Refresh only (no polling), so it costs nothing during play. */
export function HostFeedback() {
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<"all" | number>("all");
  const [onlyComments, setOnlyComments] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/host/feedback", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feedback unavailable.");
      setRows(data.rows ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Feedback unavailable."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const batches = useMemo(() => Array.from(new Set((rows ?? []).map(r => r.batch))).sort((a, b) => b - a), [rows]);
  const shown = useMemo(() => (rows ?? []).filter(r => (batch === "all" || r.batch === batch) && (!onlyComments || r.comment)), [rows, batch, onlyComments]);
  const fun = avg(shown.map(r => r.rating));
  const learned = avg(shown.flatMap(r => r.learned ? [r.learned] : []));
  const spread = [5, 4, 3, 2, 1].map(n => ({ n, count: shown.filter(r => r.rating === n).length }));
  const most = Math.max(1, ...spread.map(s => s.count));
  const download = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = ["time,batch,terminal,fun,learned,comment", ...shown.map(r => [new Date(r.at).toISOString(), r.batch, r.terminal ?? "", r.rating, r.learned ?? "", r.comment ?? ""].map(esc).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `dalaal-feedback-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return <section className="host-card host-feedback">
    <div className="host-card-title"><div><span className="eyebrow">FROM THE TRADING TERMINALS</span><h2>Player feedback</h2></div><span className="host-feedback-actions"><button className="host-quiet" disabled={!shown.length} onClick={download}>⇩ CSV</button><button className="host-quiet" disabled={loading} onClick={() => void load()}>{loading ? "Loading…" : "↻ Refresh"}</button></span></div>
    <p className="host-card-copy">Sent from the "That's a wrap" screen after each live batch. This list loads only when you open it or press Refresh.</p>
    {error && <p className="host-note-error" role="alert">{error}</p>}
    {rows && <>
      <div className="host-feedback-filters">
        <label className="host-field">BATCH<select value={String(batch)} onChange={e => setBatch(e.target.value === "all" ? "all" : Number(e.target.value))}><option value="all">All batches</option>{batches.map(b => <option key={b} value={b}>Batch {pad2(b)}</option>)}</select></label>
        <label className="host-feedback-check"><input type="checkbox" checked={onlyComments} onChange={e => setOnlyComments(e.target.checked)}/> Only with comments</label>
      </div>
      <div className="terminal-inspection-metrics host-feedback-metrics">
        <div><small>RESPONSES</small><b>{shown.length}</b></div>
        <div><small>FUN (AVG / 5)</small><b>{fmt(fun)}</b></div>
        <div><small>LEARNED (AVG / 5)</small><b>{fmt(learned)}</b></div>
        <div><small>COMMENTS</small><b>{shown.filter(r => r.comment).length}</b></div>
      </div>
      {shown.length > 0 && <div className="host-feedback-spread" aria-label="Fun ratings">{spread.map(s => <div key={s.n}><span>{s.n}</span><i style={{ width: `${(s.count / most) * 100}%` }}/><b>{s.count}</b></div>)}</div>}
      {shown.length ? <div className="host-feedback-list">{shown.map(r => <article key={r.id}>
        <header><b>{r.terminal ? `Terminal ${pad2(r.terminal)}` : "Terminal —"}</b><small>Batch {pad2(r.batch)} · {new Date(r.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</small><span>Fun {r.rating}/5{r.learned ? ` · Learned ${r.learned}/5` : ""}</span></header>
        {r.comment ? <p>{r.comment}</p> : <p className="is-empty">No comment.</p>}
      </article>)}</div> : <div className="host-empty">No feedback yet.<small>Answers appear here after players send them from the end-of-round screen.</small></div>}
    </>}
    {!rows && !error && <div className="host-empty">Loading feedback…</div>}
  </section>;
}
