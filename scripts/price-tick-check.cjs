// Prices trade in ₹0.05 steps, and the cheapest stocks still move (small moves accumulate underneath).
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');
const onTick = n => Math.abs(Math.round(n * 20) - n * 20) < 1e-6;
const now = Date.now();
const w = E.freshWorld('live', now);
for (const s of w.stocks) assert(onTick(s.price), `${s.symbol} opens on a tick`);
E.hostAction(w, 'start', {}, now);
E.hostAction(w, 'autonomous-start', {}, now);
const first = new Map(w.stocks.map(s => [s.symbol, s.price]));
const distinct = new Map(w.stocks.map(s => [s.symbol, new Set()]));
for (let i = 1; i <= 240; i++) {
  E.advance(w, w.startedAt + i * 1000);
  for (const s of w.stocks) { assert(onTick(s.price), `${s.symbol} ${s.price} is not on a ₹0.05 tick`); distinct.get(s.symbol).add(s.price); }
}
const pub = E.toPublic(w);
for (const s of pub.stocks) { assert(onTick(s.price)); assert(!('exact' in s), 'the unrounded price stays private'); for (const c of s.trend) assert(onTick(c)); }
const cheapest = [...w.stocks].sort((a, b) => a.price - b.price).slice(0, 5);
for (const s of cheapest) assert(distinct.get(s.symbol).size >= 10 && s.price !== first.get(s.symbol), `${s.symbol} should keep moving`);
console.log(`PASS: every price over a 4-minute round sits on a ₹0.05 tick; the five cheapest stocks took ${cheapest.map(s => distinct.get(s.symbol).size).join('/')} distinct prices.`);
