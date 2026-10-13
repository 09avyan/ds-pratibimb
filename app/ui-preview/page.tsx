import Link from "next/link";
import { notFound } from "next/navigation";
import { UI_OPTIONS } from "@/ui-options";
import { DalaalMark } from "@/components/trader-parts";

export default function UiPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <main className="ui-preview-home">
    <header className="preview-home-header"><a className="preview-wordmark" href="/play"><DalaalMark/> Dalaal Street</a><span className="preview-sandbox">LOCAL DESIGN REVIEW</span></header>
    <section className="preview-home-hero">
      <span className="preview-kicker">FIVE DISTINCT GAME FLOORS · ONE SHARED MARKET</span>
      <h1>Five ways to<br/>play the market.</h1>
      <p>Each version has its own visual identity across the trading screen and audience wall. They share the same market and rules; preview trades stay separate from the live event.</p>
    </section>
    <section className="preview-option-grid" aria-label="Five themed UI previews">
      {UI_OPTIONS.map((option, index) => <article className={`preview-choice choice-${option.palette}`} key={option.slug}>
        <div className="choice-art" aria-hidden="true">
          <div className="choice-art-header"><span/><span/><b>{option.name.toUpperCase()}</b><strong>{option.number === "2" ? "BLOCK MARKET" : option.number === "3" ? "YOUR MOVE" : option.number === "4" ? "PAPER FLOOR" : option.number === "5" ? "MAZE ROUND" : "AURORA LIVE"}</strong></div>
          <div className="choice-art-body"><div className="choice-art-list">{Array.from({ length: 9 }, (_, i) => <i key={i}/>)}</div><div className="choice-art-sidebar"><div className="choice-art-chart"><span/><span/><span/><span/><span/><span/><span/><b/></div><div className="choice-art-ticket"><i/><i/><b/></div></div></div>
        </div>
        <div className="choice-copy"><div className="choice-title"><span>OPTION {option.number}</span><h2>{option.name}</h2></div><p>{option.tagline}</p><ul>{option.highlights.map(item => <li key={item}>{item}</li>)}</ul><div className="choice-actions"><Link className="choice-open" href={`/ui-preview/${option.slug}/play/01`}>Trading screen <span aria-hidden="true">↗</span></Link><Link className="choice-audience-open" href={`/ui-preview/${option.slug}/audience`}>Audience screen <span aria-hidden="true">↗</span></Link></div></div>
      </article>)}
    </section>
    <footer className="preview-home-footer"><span>PREVIEW ONLY · SAME GAME RULES · SEPARATE DEMO SESSION</span><span>Original look: <code>/play</code> or <code>/v1</code>; themed layouts: <code>/v2</code> through <code>/v6</code>.</span></footer>
  </main>;
}
