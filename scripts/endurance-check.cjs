// Endurance: 20 live batches back to back, ten terminals trading every few seconds, some devices
// reconnecting with new sessions. The saved row (as packed for the database) must stay small and
// stop growing, so the database is not worn down over an event day.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');
const { packWorld } = require('../src/game/store.ts');
const LIMIT = Number(process.env.ENDURANCE_LIMIT_KB ?? 200);

let at = Date.now();
const w = E.freshWorld('live', at);
E.hostAction(w, 'controls', { duration: 300, priceSeconds: 1 }, at);
const sizes = [];
for (let batch = 1; batch <= 20; batch++) {
  E.hostAction(w, 'autonomous-start', {}, at);
  at = w.startedAt;
  const players = [];
  for (let n = 1; n <= 10; n++) { const p = E.newPlayer(`b${batch}t${n}-${'x'.repeat(4)}`, w.batch, at, true, n); w.sessions[p.id] = p; players.push(p); }
  while (w.status !== 'closed' && at < w.startedAt + 400_000) {
    at += 1000;
    E.advance(w, at);
    for (const p of players) {
      p.lastSeenAt = at;
      if ((at / 1000 + p.terminalNumber) % 4 === 0 && w.status === 'live') {
        const s = w.stocks[(p.terminalNumber * 3 + Math.floor(at / 4000)) % w.stocks.length];
        try { E.executeTrade(w, p, p.holdings[s.symbol]?.qty ? 'Sell' : 'Buy', s.symbol, 20 + p.terminalNumber, at); } catch {}
      }
    }
  }
  assert.equal(w.status, 'closed', `batch ${batch} closes on time`);
  sizes.push(Math.round(JSON.stringify(packWorld(structuredClone(w))).length / 1024));
  at += 30_000;
}
const peak = Math.max(...sizes), last5 = sizes.slice(-5), first5 = sizes.slice(0, 5);
console.log('row KB per batch:', sizes.join(' '));
assert(peak <= LIMIT, `the saved row peaks at ${peak} KB, over the ${LIMIT} KB budget`);
assert(Math.max(...last5) <= Math.max(...first5) * 1.25, 'the saved row keeps growing across batches');
console.log(`PASS: 20 batches with 10 terminals trading; the saved row peaks at ${peak} KB and does not grow.`);
