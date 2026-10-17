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
 assert(Math.log(prices[20]/100)/Math.log(target/100)<.6,'opening move must not be mostly complete at 20 seconds');
 assert(Math.log(prices[30]/100)/Math.log(target/100)>.8,'direct move should approach its target between 30 and 35 seconds');
}
const a={headline:'Business loan rates fall',topic:'credit-cost',direction:1},b={headline:'Business loan rates rise',topic:'credit-cost',direction:-1};
assert(newsContradicts(a,b));assert.throws(()=>validateNewsSelection([a,b]));assert.throws(()=>validateNewsSelection([b],[a]));
const w=E.freshWorld('live',now);E.hostAction(w,'start',{},now);E.advance(w,w.startedAt+60_000);
const tickBefore=w.tick,batchBefore=w.batch;E.hostAction(w,'autonomous-start',{},w.lastTickAt);
assert(w.autonomousNews.enabled);assert.equal(w.batch,batchBefore);assert.equal(w.tick,tickBefore);assert(w.autonomousNews.nextAt>w.lastTickAt);
for(let second=5;second<=40;second+=5){E.advance(w,w.startedAt+60_000+second*1000);assert.equal(w.autonomousNews.plannedAt,w.startedAt+60_000);assert(w.autonomousNews.nextAt<=w.autonomousNews.plannedAt+105_000);}
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

// Follow-through takes ~15% longer and conserves its integrated price signal.
const timing=require('../src/game/news-timing.ts');
for(const initial of [.0011,.003,.0045]) {
 const oldSeconds=Math.ceil(Math.log(timing.NEWS_IMPACT_FADE_THRESHOLD/initial)/Math.log(Math.pow(.94,1/1.25)));
 const seconds=Math.ceil(Math.log(timing.NEWS_IMPACT_FADE_THRESHOLD/initial)/Math.log(timing.NEWS_IMPACT_DECAY));
 assert(Math.abs(seconds-oldSeconds*1.15)<=1.2);
 const stock=structuredClone(E.freshWorld('live',now).stocks[0]);
 stock.newsBias=initial;stock.newsBiasClock={elapsed:0,duration:seconds};
 let total=0,opening=0;
 for(let n=1;n<=seconds;n++){const drift=E.advanceNewsDrift(stock,1);total+=drift;if(n<=15)opening+=drift;}
 const expected=initial*(1-timing.NEWS_IMPACT_DECAY**seconds)/.06;
 assert(Math.abs(total-expected)<1e-11);
 assert(opening<total*.05,'follow-through must not front-load the first 15 seconds');
 assert.equal(stock.newsBias,0);
 assert.equal(stock.newsBiasClock,undefined);
}
assert.equal(timing.NEWS_REACTION_SECONDS,35);
assert.equal(E.freshWorld('live',now).controls.tickRate,1,'price updates keep their existing cadence');
const flat=()=>{const x=E.freshWorld('live',now);x.status='live';x.stocks.forEach(stock=>{stock.price=stock.previousClose;stock.candles=Array.from({length:8},(_,i)=>({time:now-(8-i)*1500,open:stock.price,high:stock.price,low:stock.price,close:stock.price,volume:1000}));});return x;};
const quiet=flat();assert.equal(chooseAutonomousNewsPlan(quiet,now).strategy,'lively');
const turbulent=flat();turbulent.autonomousNews.plannedAt=now-15000;
for(let n=1;n<=3;n++){const p=E.newPlayer('reader-'+n,turbulent.batch,now,true,n);turbulent.sessions[p.id]=p;}
turbulent.headlines=[{...turbulent.news[0],createdAt:now-15000}];
turbulent.stocks.forEach(stock=>{stock.newsBias=.003;stock.newsBiasClock={elapsed:15,duration:90};stock.newsMoves=[{logReturn:.04,elapsed:15,duration:35}];});
const calm=chooseAutonomousNewsPlan(turbulent,now);assert.equal(calm.strategy,'calm');assert.equal(calm.indices.length,2);assert(calm.intervalSeconds>=85);
assert(calm.indices.some(i=>turbulent.news[i].type==='minor'),'calm mode should include gentler stories');
const nearSettled=flat();nearSettled.autonomousNews.plannedAt=now-60000;
nearSettled.headlines=[{...nearSettled.news[0],createdAt:now-60000}];
nearSettled.sessions.p=E.newPlayer('quiet-player',nearSettled.batch,now,true,1);
nearSettled.stocks[0].newsBias=.001;nearSettled.stocks[0].newsBiasClock={elapsed:60,duration:75};
const overlap=chooseAutonomousNewsPlan(nearSettled,now);assert.equal(overlap.strategy,'lively');assert(overlap.intervalSeconds<=75);
const waiting=structuredClone(nearSettled);waiting.stocks[0].newsBiasClock={elapsed:40,duration:90};waiting.autonomousNews.plannedAt=now-40000;
const waitPlan=chooseAutonomousNewsPlan(waiting,now);assert(waitPlan.intervalSeconds>=87,'substantial remaining effects get room to settle');
const wealthy=structuredClone(nearSettled);wealthy.sessions.p.cash=9999999;
assert.deepEqual(chooseAutonomousNewsPlan(wealthy,now).indices,overlap.indices,'player wealth alone must not change story selection');
const closing=flat();closing.remaining=20;E.hostAction(closing,'autonomous-start',{},now);closing.autonomousNews.nextAt=now;
E.advance(closing,now+1000);assert.equal(closing.headlines.length,0,'no unfinished new set in closing seconds');

console.log('PASS: 61 detailed categorized stories, direct effect signs, 35-second reactions with retracements, deferred follow-through, conserved targets, 15% longer full effects, calm/balanced/lively decisions, bounded overlap, closing-round guard, conflicting-story guards, mid-batch brain start, anchored live review, paused timer, stable final ranks and a complete 15-minute autonomous round ('+publications.length+' sets).');

// The brain sees duration, time left, participation, buys, sells, shorts and exposure.
const {readAutonomousNewsSignals}=require('../src/game/autonomous-news.ts');
const context=E.freshWorld('live',now);context.duration=600;E.hostAction(context,'start',{},now);E.advance(context,context.startedAt+20_000);
const participant=E.newPlayer('context-player',context.batch,context.lastTickAt,true,1);context.sessions[participant.id]=participant;
E.executeTrade(context,participant,'Buy',context.stocks[0].symbol,2,context.lastTickAt);
E.executeTrade(context,participant,'Sell',context.stocks[0].symbol,1,context.lastTickAt);
E.executeTrade(context,participant,'Short',context.stocks[1].symbol,1,context.lastTickAt);
const contextReading=readAutonomousNewsSignals(context,context.lastTickAt);
assert.equal(contextReading.sessionDuration,600);assert.equal(contextReading.secondsRemaining,580);assert.equal(contextReading.elapsedSeconds,20);
assert.equal(contextReading.engagedTerminals,1);assert.equal(contextReading.recentBuys,1);assert.equal(contextReading.recentSells,1);assert.equal(contextReading.recentShorts,1);assert.equal(contextReading.openPositions,2);
console.log('PASS: live session context and all trading-side signals.');
