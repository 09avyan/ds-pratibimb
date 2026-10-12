import Link from "next/link";
import { notFound } from "next/navigation";
import { UI_OPTIONS } from "@/ui-options";

export default function UiPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <main className="ui-preview-home">
    <header className="preview-home-header"><a className="preview-wordmark" href="/play"><span>D</span> Dalaal Street</a><span className="preview-sandbox">LOCAL DESIGN REVIEW</span></header>
    <section className="preview-home-hero">
      <span className="preview-kicker">THREE DIRECTIONS · ONE SHARED GAME</span>
      <h1>Choose a look for<br/>the trading floor.</h1>
      <p>Each option keeps the familiar trading and audience layouts and the same game rules. The difference is the colour and visual feel. Preview trades stay separate from the live event.</p>
    </section>
    <section className="preview-option-grid" aria-label="Three UI previews">
      {UI_OPTIONS.map((option, index) => <article className={`preview-choice choice-${option.palette}`} key={option.slug}>
        <div className="choice-art" aria-hidden="true">
          <div className="choice-art-header"><span/><span/><b>{index === 0 ? "DALAAL–10" : index === 1 ? "MARKET GAME" : "MARKET STUDIO"}</b><strong>{index === 0 ? "10,248" : index === 1 ? "YOUR TURN" : "₹1,00,000"}</strong></div>
          <div className="choice-art-body"><div className="choice-art-list">{Array.from({ length: 9 }, (_, i) => <i key={i}/>)}</div><div className="choice-art-sidebar"><div className="choice-art-chart"><span/><span/><span/><span/><span/><span/><span/><b/></div><div className="choice-art-ticket"><i/><i/><b/></div></div></div>
        </div>
        <div className="choice-copy"><div className="choice-title"><span>OPTION {option.number}</span><h2>{option.name}</h2></div><p>{option.tagline}</p><ul>{option.highlights.map(item => <li key={item}>{item}</li>)}</ul><div className="choice-actions"><Link className="choice-open" href={`/ui-preview/${option.slug}/play/01`}>Trading screen <span aria-hidden="true">↗</span></Link><Link className="choice-audience-open" href={`/ui-preview/${option.slug}/audience`}>Audience screen <span aria-hidden="true">↗</span></Link></div></div>
      </article>)}
    </section>
    <footer className="preview-home-footer"><span>PREVIEW ONLY · NO COMMITS · NO PUSHES</span><span>The current game at <code>/play/01</code> stays as it is.</span></footer>
  </main>;
}
