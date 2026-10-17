const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const E=require('../src/game/engine.ts');
const {newsContradicts,validateNewsSelection}=require('../src/game/news-rules.ts');
const {NEWS_PRESETS}=require('../src/game/catalog.ts');
const {chooseAutonomousNewsPlan}=require('../src/game/autonomous-news.ts');
const now=Date.now();
assert.equal(NEWS_PRESETS.length,61);
assert.equal(NEWS_PRESETS.filter(n=>n.scope==='economy').length,12);
assert.equal(NEWS_PRESETS.filter(n=>n.scope==='stock').length,25);
for(const sector of new Set(NEWS_PRESETS.filter(n=>n.scope==='sector').map(n=>n.sector))) assert.equal(NEWS_PRESETS.filter(n=>n.scope==='sector'&&n.sector===sector).length,3);
assert(NEWS_PRESETS.every(n=>n.topic&&n.headline.length>=85&&n.headline.length<=165));
for(const sign of [1,-1]) {
 const stock=structuredClone(E.freshWorld('live',now).stocks[0]);
 stock.price=100; const target=100*(1+sign*.06);
 stock.newsMoves=[{logReturn:Math.log(target/100),elapsed:0,duration:E.NEWS_REACTION_SECONDS}];
 const prices=[100];
 for(let second=0;second<E.NEWS_REACTION_SECONDS;second++){stock.price*=1+E.advanceNewsReaction(stock,1);prices.push(stock.price);}
 assert(Math.abs(stock.price-target)<1e-9,'reaction conserves its exact final target');
 assert(prices.some((price,i)=>i&&sign*(price-prices[i-1])<0),'reaction includes modest retracements');
 assert(E.NEWS_REACTION_SECONDS>=30);
}
const a={headline:'Business loan rates fall',topic:'credit-cost',direction:1},b={headline:'Business loan rates rise',topic:'credit-cost',direction:-1};
assert(newsContradicts(a,b));assert.throws(()=>validateNewsSelection([a,b]));assert.throws(()=>validateNewsSelection([b],[a]));
const w=E.freshWorld('live',now);E.hostAction(w,'start',{},now);E.advance(w,w.startedAt+60_000);
const tickBefore=w.tick,batchBefore=w.batch;E.hostAction(w,'autonomous-start',{},w.lastTickAt);
assert(w.autonomousNews.enabled);assert.equal(w.batch,batchBefore);assert.equal(w.tick,tickBefore);assert(w.autonomousNews.nextAt>w.lastTickAt);
for(let second=5;second<=40;second+=5){E.advance(w,w.startedAt+60_000+second*1000);assert.equal(w.autonomousNews.plannedAt,w.startedAt+60_000);assert(w.autonomousNews.nextAt<=w.autonomousNews.plannedAt+90_000);}
const pauseAt=w.lastTickAt,oldDue=w.autonomousNews.nextAt;E.hostAction(w,'pause',{},pauseAt);E.advance(w,pauseAt+10_000);E.hostAction(w,'resume',{},pauseAt+20_000);assert.equal(w.autonomousNews.nextAt,oldDue+20_000);
// Keep duplicates, offline devices and finished participants from distorting rank.
const rankWorld=E.freshWorld('live',now);rankWorld.batch=1;
for(let n=1;n<=3;n++){const p=E.newPlayer('rank-player-'+n,1,now,true,n);p.cash+=n*100;rankWorld.sessions[p.id]=p;}
const old=E.newPlayer('old-login',1,now-1000,true,3);old.cash+=999999;rankWorld.sessions[old.id]=old;
assert.deepEqual(E.toPublic(rankWorld,'rank-player-2').standing,{rank:2,total:3});
E.hostAction(rankWorld,'end',{},now);assert.deepEqual(E.toPublic(rankWorld,'rank-player-2').standing,{rank:2,total:3});
// Every catalog story points in its declared direction in the direct effect preview.
const effectWorld=E.freshWorld('live',now);
for(let i=0;i<effectWorld.news.length;i++){const story=effectWorld.news[i];const impact=E.previewNewsImpact(effectWorld,[i]);assert(impact.combined.length);assert(impact.combined.every(stock=>Math.sign(stock.change)===story.direction),story.headline);}
// A long autonomous round publishes complete, unique, compatible sets.
const long=E.freshWorld('live',now);long.duration=900;E.hostAction(long,'start',{autonomous:true},now);
for(let t=1;t<=900;t++){E.advance(long,long.startedAt+t*1000);}
const publications=long.autonomousNews.history.filter(x=>x.kind==='published');
assert(publications.length>=8);const published=publications.flatMap(x=>x.indices);assert.equal(new Set(published).size,published.length);
assert(publications.every(x=>[2,3].includes(x.indices.length)));
assert.equal(long.status,'closed');
console.log('PASS: 61 detailed categorized stories, direct effect signs, 36-second reactions with retracements and exact targets, conflicting-story guards, mid-batch brain start, anchored live review, paused timer, stable final ranks and a complete 15-minute autonomous round ('+publications.length+' sets).');
