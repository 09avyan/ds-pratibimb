const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const E=require('../src/game/engine.ts'),now=Date.now();
function setup(bots=58){const w=E.freshWorld('live',now);w.duration=360;w.controls.bots=bots;E.hostAction(w,'start',{autonomous:true},now);for(let n=1;n<=3;n++){const p=E.newPlayer('idle-'+n,w.batch,now,true,n);w.sessions[p.id]=p;}return w;}
function play(w,from,to){for(let s=from;s<=to;s++){const at=w.startedAt+s*1000;for(const p of Object.values(w.sessions))p.lastSeenAt=at;E.advance(w,at);}}
const w=setup(),baseline={...w.controls};play(w,1,44);assert.equal(w.controls.volatility,baseline.volatility);assert.equal(w.controls.bots,baseline.bots);
play(w,45,170);assert(w.controls.volatility<baseline.volatility);assert(w.controls.bots<baseline.bots);assert(w.controls.volatility>=baseline.volatility*.75-.1);assert(w.controls.bots>=baseline.bots*.75-.1);
for(const key of ['scenario','tickRate','marketBias'])assert.equal(w.controls[key],baseline[key]);assert.equal(w.duration,360);for(const p of Object.values(w.sessions))assert.equal(p.initialCash,E.START_CASH);
const changes=w.autonomousNews.history.filter(e=>e.kind==='settings-adjusted').sort((a,b)=>a.at-b.at);assert(changes.length>=2);for(let i=1;i<changes.length;i++)assert(changes[i].at-changes[i-1].at>=30000);
E.hostAction(w,'controls',{volatility:30,bots:40},w.lastTickAt);assert.equal(w.autonomousNews.marketTuning.volatility,30);assert.equal(w.autonomousNews.marketTuning.bots,40);
play(w,171,210);assert.equal(w.controls.volatility,30);assert.equal(w.controls.bots,40);
play(w,211,260);E.hostAction(w,'autonomous-stop',{},w.lastTickAt);assert.equal(w.controls.volatility,30);assert.equal(w.controls.bots,40);assert(!w.autonomousNews.marketTuning);
const zero=setup(0);play(zero,1,120);assert.equal(zero.controls.bots,0,'host-disabled bots stay disabled');
E.hostAction(zero,'end',{},zero.lastTickAt);assert.equal(zero.controls.volatility,baseline.volatility);assert.equal(zero.controls.bots,0);
const paused=setup();play(paused,1,30);E.hostAction(paused,'pause',{},paused.lastTickAt);const before={...paused.controls};E.advance(paused,paused.lastTickAt+120000);assert.equal(paused.controls.volatility,before.volatility);assert.equal(paused.controls.bots,before.bots);
console.log('PASS: gentle settings bounds, observation period, 30-second cooldown, host overrides, stop/end restoration, disabled bots, paused game, and unchanged cash/duration/rules.');

const difficulties=setup();E.advance(difficulties,difficulties.startedAt);const {recordGameLog}=require('../src/game/logs.ts');
for(const p of Object.values(difficulties.sessions)){E.executeTrade(difficulties,p,'Buy',difficulties.stocks[0].symbol,1,difficulties.startedAt);E.executeTrade(difficulties,p,'Buy',difficulties.stocks[0].symbol,1,difficulties.startedAt);}
play(difficulties,1,44);for(let i=0;i<3;i++)recordGameLog(difficulties,{at:difficulties.startedAt+44000,kind:'order-rejected',terminalNumber:i%2+1,message:'Not enough cash.'});play(difficulties,45,46);assert(difficulties.autonomousNews.history.some(entry=>entry.kind==='settings-adjusted'&&entry.reason.includes('Repeated unsuccessful orders')));
console.log('PASS: logged order difficulties influence gentle difficulty adjustments.');
