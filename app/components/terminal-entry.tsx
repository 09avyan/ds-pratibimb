"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DalaalMark, DalaalWordmark } from "@/components/trader-parts";

export function TerminalEntry({ prefix = "", basePath }: { prefix?: string; basePath?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = Number(code);
    if (!Number.isInteger(number) || number < 1 || number > 10) {
      setError("Enter a terminal code from 01 to 10.");
      return;
    }
    router.push(`${basePath ?? `${prefix}/play`}/${String(number).padStart(2, "0")}`);
  }
  return <main className="terminal-entry-page">
    <a className="terminal-entry-brand" href="/"><DalaalMark/><DalaalWordmark/></a>
    <section className="terminal-entry-card">
      <span className="eyebrow">PARTICIPANT ACCESS</span>
      <h1>Enter your terminal code<span>.</span></h1>
      <p>Use the two-digit code shown on this computer to open its trading terminal.</p>
      <form onSubmit={submit}>
        <label htmlFor="terminal-code">TERMINAL CODE · 01–10</label>
        <div className="terminal-entry-field"><input id="terminal-code" inputMode="numeric" pattern="(?:0?[1-9]|10)" maxLength={2} autoComplete="off" value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, "").slice(0, 2)); setError(""); }} placeholder="01" autoFocus/><button type="submit">Open terminal <span aria-hidden="true">→</span></button></div>
        {error && <div className="terminal-entry-error" role="alert">{error}</div>}
      </form>
      <div className="terminal-entry-numbers" aria-label="Available terminal codes">{Array.from({ length: 10 }, (_, index) => String(index + 1).padStart(2, "0")).map(number => <button type="button" key={number} onClick={() => setCode(number)}>{number}</button>)}</div>
      <small className="terminal-entry-note">There are 10 numbered terminals. Each code opens its own player session.</small>
    </section>
  </main>;
}
