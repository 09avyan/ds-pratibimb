const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);const E=require('../src/game/engine.ts'),{newsContradicts}=require('../src/game/news-rules.ts');
let rounds=0,sets=0,overlaps=0;const modes={calm:0,balanced:0,lively:0};
for(const duration of [240,360,900])for(const style of ['spectators','cautious','active','busy']){
 const now=Date.now();const w=E.freshWorld('live',now);w.duration=duration;w.controls.volatility=style==='cautious'?12.8:style==='busy'?75:40.8;E.hostAction(w,'start',{autonomous:true},now);
 const count=style==='spectators'?0:style==='cautious'?3:10;
 for(let n=1;n<=count;n++){const p=E.newPlayer('sim-player-'+n,w.batch,now,true,n);w.sessions[p.id]=p;}
 let lastAt=0,lastRemaining=0,lastPublished=0;const previous=[];
 for(let second=1;second<=duration;second++){
  const at=w.startedAt+second*1000;
  for(const p of Object.values(w.sessions)){p.lastSeenAt=at;if(second%(style==='cautious'?30:7)===0){const stock=w.stocks[(p.terminalNumber*3+Math.floor(second/20))%w.stocks.length];try{E.executeTrade(w,p,p.holdings[stock.symbol]?.qty?'Sell':'Buy',stock.symbol,1,at);}catch(e){if(!/not open|paused|enough cash/.test(e.message))throw e;}}}
  E.advance(w,at);if(w.autonomousNews.enabled)modes[w.autonomousNews.strategy??'balanced']++;
  const published=w.autonomousNews.history.filter(x=>x.kind==='published').sort((a,b)=>a.at-b.at);
  if(published.length>lastPublished){const entry=published.at(-1);assert([2,3].includes(entry.indices.length));assert(w.remaining>=35,'new reactions must have time to complete');if(lastAt){const gap=(entry.at-lastAt)/1000;assert(gap>=50&&gap<=105,{duration,style,gap});const overlap=lastRemaining-gap;if(overlap>1)overlaps++;assert(overlap<=18.01,JSON.stringify({duration,style,overlap,gap}));}
   const stories=entry.indices.map(index=>w.news[index]);
   if(lastPublished===0){assert.equal(stories.length,2);assert(stories.every(n=>n.scope==='stock'));assert.notEqual(stories[0].sector,stories[1].sector);assert(stories.filter(n=>n.type==='major').length<=1);}
   if(lastPublished===1){assert.equal(stories.length,2);assert(stories.some(n=>n.scope==='stock'));assert(stories.some(n=>n.scope==='sector'));assert.notEqual(stories[0].sector,stories[1].sector);}
   assert.equal(w.autonomousNews.reading.sessionDuration,duration);assert(w.autonomousNews.reading.secondsRemaining<=duration);
   for(const index of entry.indices){const news=w.news[index];assert(!previous.some(n=>n.headline===news.headline));assert(!previous.some(n=>newsContradicts(n,news)));previous.push(news);}lastAt=entry.at;lastRemaining=E.newsImpactRemainingSeconds(w);lastPublished=published.length;sets++;
  }
 }
 assert.equal(w.status,'closed');assert(lastPublished>=2);rounds++;console.log(duration,style,lastPublished,'sets');
}
console.log('PASS:',rounds,'simulated games,',sets,'sets, limited-overlap events:',overlaps,'strategy samples:',JSON.stringify(modes));
