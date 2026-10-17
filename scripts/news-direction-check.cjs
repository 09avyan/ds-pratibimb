// Compare every headline with the same market without news, using real bots.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const E=require('../src/game/engine.ts');let checks=0;
for(const volatility of [12.8,40.8,75])for(let index=0;index<61;index++){
 const now=Date.now(),world=E.freshWorld('live',now);world.controls.volatility=volatility;
 E.hostAction(world,'start',{},now);E.advance(world,world.startedAt);
 const baseline=structuredClone(world),story=world.news[index],before=new Map(world.stocks.map(s=>[s.symbol,s.price]));
 E.hostAction(world,'headline',{indices:[index]},world.lastTickAt);const start=world.lastTickAt;
 // A neutral reaction gives the control identical temporary noise moderation,
 // isolating the headline's directional contribution from market conditions.
 for(const stock of world.stocks)if(stock.newsMoves?.length)baseline.stocks.find(s=>s.symbol===stock.symbol).newsMoves=stock.newsMoves.map(move=>({...move,logReturn:0}));
 for(let second=1;second<=100;second++){
  E.advance(world,start+second*1000);E.advance(baseline,start+second*1000);
  if(![35,95].includes(second))continue;
  for(const stock of world.stocks){
   const target=story.scope==='economy'||story.scope==='sector'&&story.sector===stock.sector||story.scope==='stock'&&story.symbols.includes(stock.symbol);
   const other=baseline.stocks.find(s=>s.symbol===stock.symbol);
   if(target){checks++;const reference=second===35?before.get(stock.symbol):other.price;
    assert((stock.price-reference)*story.direction>0,JSON.stringify({index,symbol:stock.symbol,second,volatility,story:story.headline,price:stock.price,reference}));
   }else assert.equal(stock.price,other.price,'news must not leak outside its declared scope');
  }
 }
}
console.log('PASS:',checks,'actual price checks across all 61 stories, three volatility settings, direct reaction and later net effect; unaffected stocks match the control.');
// Each company also gets an opposing sector story and an economy story in
// one set. The most direct scope must win, in previews and real prices.
let combinations=0;
for(const company of E.freshWorld('live').news.filter(n=>n.scope==='stock')){
 const now=Date.now(),w=E.freshWorld('live',now);E.hostAction(w,'start',{},now);E.advance(w,w.startedAt);
 const stockIndex=w.news.findIndex(n=>n.headline===company.headline),sectorIndex=w.news.findIndex(n=>n.scope==='sector'&&n.sector===company.sector&&n.direction===-company.direction),economyIndex=w.news.findIndex(n=>n.scope==='economy'&&n.direction===company.direction);
 assert(sectorIndex>=0&&economyIndex>=0);const selected=[economyIndex,sectorIndex,stockIndex];const preview=E.previewNewsImpact(w,selected),before=new Map(w.stocks.map(s=>[s.symbol,s.price]));
 for(const effect of preview.combined){const stock=w.stocks.find(s=>s.symbol===effect.symbol);const winner=company.symbols.includes(stock.symbol)?company:stock.sector===company.sector?w.news[sectorIndex]:w.news[economyIndex];assert.equal(Math.sign(effect.change),winner.direction);}
 E.hostAction(w,'headline',{indices:selected},w.lastTickAt);const start=w.lastTickAt;for(let s=1;s<=35;s++)E.advance(w,start+s*1000);
 for(const effect of preview.combined){const actual=w.stocks.find(s=>s.symbol===effect.symbol);assert((actual.price-before.get(actual.symbol))*Math.sign(effect.change)>0,`scope direction: ${company.headline} / ${actual.symbol}`);}
 combinations++;
}
console.log('PASS:',combinations,'mixed company/sector/economy sets obey the most-direct-news rule in previews and actual trading.');
