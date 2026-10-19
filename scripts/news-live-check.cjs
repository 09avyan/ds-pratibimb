// Verify actual prices from publication prices in mature markets and complete brain-led games.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const E=require('../src/game/engine.ts');
const scope=n=>n.scope??(n.symbols?.length?'stock':n.sector==='ALL'?'economy':'sector');
const rank=n=>({economy:1,sector:2,stock:3})[scope(n)];
const affects=(n,s)=>scope(n)==='economy'||(scope(n)==='sector'?n.sector===s.sector:n.symbols?.includes(s.symbol));
const winners=(stories,s)=>{const relevant=stories.filter(n=>affects(n,s));const top=Math.max(0,...relevant.map(rank));return relevant.filter(n=>rank(n)===top);};
let checks=0,sets=0,overlaps=0,retracements=0;
function expectDirection(stock,before,direction,context){assert((stock.price-before)*direction>0,JSON.stringify({...context,symbol:stock.symbol,before,after:stock.price,direction}));checks++;}
for(const scenario of ['Sideways','Bullish','Bearish'])for(const age of [60,180])for(const volatility of [40.8,85]){
 const now=Date.now(),base=E.freshWorld('live',now);E.hostAction(base,'start',{},now);base.controls.scenario=scenario;base.controls.volatility=volatility;base.controls.bots=100;base.controls.marketBias=scenario==='Bullish'?85:scenario==='Bearish'?15:50;E.advance(base,base.startedAt+age*1000);
 for(let index=0;index<base.news.length;index++){
  const w=structuredClone(base),story=w.news[index],before=new Map(w.stocks.map(s=>[s.symbol,s.price]));E.hostAction(w,'headline',{indices:[index]},w.lastTickAt);const start=w.lastTickAt;
  const finish=E.newsImpactRemainingSeconds(w);for(const elapsed of [...new Set([10,35,finish])].sort((a,b)=>a-b)){E.advance(w,start+elapsed*1000);for(const stock of w.stocks)if(affects(story,stock))expectDirection(stock,before.get(stock.symbol),story.direction,{scenario,age,volatility,index,elapsed});}
 }
}
// A later opposite story must replace, rather than add to, an unfinished reaction.
for(const direction of [-1,1]){
 const now=Date.now(),w=E.freshWorld('live',now);E.hostAction(w,'start',{},now);E.advance(w,w.startedAt+60000);
 const first=w.news.findIndex(n=>scope(n)==='economy'&&n.direction===-direction),second=w.news.findIndex(n=>scope(n)==='sector'&&n.direction===direction);E.hostAction(w,'headline',{indices:[first]},w.lastTickAt);E.advance(w,w.lastTickAt+15000);
 const story=w.news[second],before=new Map(w.stocks.map(s=>[s.symbol,s.price])),preview=E.previewNewsImpact(w,[second]);assert(preview.combined.every(s=>Math.sign(s.change)===direction));E.hostAction(w,'headline',{indices:[second]},w.lastTickAt);for(const stock of w.stocks)if(affects(story,stock))assert.equal(stock.newsMoves.length,1);
 const start=w.lastTickAt;E.advance(w,start+35000);for(const stock of w.stocks)if(affects(story,stock))expectDirection(stock,before.get(stock.symbol),direction,{overlap:true});overlaps++;
}
// The real autonomous planner publishes its own sets while three simulated terminals trade.
for(const duration of [240,360,900])for(const tickRate of [.5,1]){
 const now=Date.now(),w=E.freshWorld('live',now);w.duration=duration;w.controls.tickRate=tickRate;E.hostAction(w,'autonomous-start',{},now);const observations=new Map();let key='';
 for(let n=1;n<=3;n++){const p=E.newPlayer('brain-price-player-'+n,w.batch,w.startedAt,true,n);w.sessions[p.id]=p;}
 for(let elapsed=tickRate;elapsed<=duration;elapsed+=tickRate){const at=w.startedAt+elapsed*1000;for(const p of Object.values(w.sessions)){p.lastSeenAt=at;if(Number.isInteger(elapsed)&&elapsed%19===0){const stock=w.stocks[(p.terminalNumber*7+Math.floor(elapsed/19))%w.stocks.length];try{E.executeTrade(w,p,p.holdings[stock.symbol]?.qty?'Sell':'Buy',stock.symbol,1,w.lastTickAt);}catch(error){if(!/session has ended|not open|paused/.test(error.message))throw error;}}}
  E.advance(w,at);const next=(w.latestNewsIds??[]).join(',');if(next&&next!==key){key=next;sets++;const stories=w.headlines.filter(n=>w.latestNewsIds.includes(n.id));for(const stock of w.stocks){const relevant=winners(stories,stock);if(!relevant.length)continue;assert(new Set(relevant.map(n=>n.direction)).size===1,'brain must not cancel opposite same-scope news on one stock');observations.set(stock.symbol,{at,before:stock.price,previous:stock.price,direction:relevant[0].direction,finish:Math.max(...(stock.newsMoves??[]).map(m=>m.duration-m.elapsed),stock.newsBiasClock?stock.newsBiasClock.duration-stock.newsBiasClock.elapsed:0),checked:new Set()});}}
  for(const stock of w.stocks){const observation=observations.get(stock.symbol);if(!observation)continue;const age=(at-observation.at)/1000;if(age>0&&(stock.price-observation.previous)*observation.direction<0)retracements++;observation.previous=stock.price;
   for(const milestone of [10,35,observation.finish])if(age>=milestone&&!observation.checked.has(milestone)){expectDirection(stock,observation.before,observation.direction,{brain:true,duration,tickRate,elapsed,milestone});observation.checked.add(milestone);}
  }
 }
 assert.equal(w.status,'closed');assert(w.autonomousNews.history.some(e=>e.kind==='published'));
}
assert(retracements>0,'real price paths should retain small retracements');
console.log(`PASS: ${checks} publication-relative price checks in mature markets, ${sets} autonomous sets across six complete games, ${overlaps} overlapping reversals, both tick cadences and ${retracements} natural retracements.`);
