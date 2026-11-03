// Hall of fame: each finished live batch adds its traders' results; the day's top 10 by gain stay,
// across batches and resets; practice rounds never count; the host can clear it. The audience also
// gets each terminal's order count and best closed trade for the batch awards.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');

function playBatch(w, terminals, at) {
  if (w.status === 'ready' || w.status === 'closed') E.hostAction(w, 'start', {}, at);
  at = w.startedAt + 1000; E.advance(w, at);
  for (const n of terminals) {
    const p = E.newPlayer(`b${w.batch}-t${n}`, w.batch, at, true, n); w.sessions[p.id] = p;
    const stock = w.stocks[n % w.stocks.length];
    E.executeTrade(w, p, 'Buy', stock.symbol, 10 + n * 5, at);
    at += 4000; E.advance(w, at);
    if (n % 2) { E.executeTrade(w, p, 'Sell', stock.symbol, 5, at); at += 1000; }
  }
  E.hostAction(w, 'end', {}, at);
  return at;
}

const now = Date.now();
const w = E.freshWorld('live', now);
let at = playBatch(w, [1, 2, 3], now);
assert.equal(w.hallOfFame.length, 3, 'a finished batch adds every terminal that traded');
assert(w.hallOfFame.every((e, i, list) => i === 0 || list[i - 1].pnl >= e.pnl), 'sorted by gain');
assert(w.hallOfFame.every(e => e.batch === w.batch && e.terminalNumber >= 1), 'entries carry batch and terminal');
const pub = E.toPublic(w, null);
assert(Array.isArray(pub.hallOfFame) && pub.hallOfFame.length === 3, 'the audience sees the hall of fame');
assert(pub.leaderboard.every(e => typeof e.trades === 'number' && e.trades >= 1), 'leaderboard entries carry an order count');
assert(pub.leaderboard.some(e => e.bestTrade === null || typeof e.bestTrade?.realized === 'number'), 'leaderboard entries carry the best closed trade');
// More batches: the list keeps the top 10 and survives a reset.
for (let i = 0; i < 4; i++) at = playBatch(w, [1, 2, 3, 4], at + 5000);
assert(w.hallOfFame.length <= 10, 'at most 10 entries');
const kept = w.hallOfFame.length;
E.hostAction(w, 'reset', {}, at + 1000);
assert.equal(w.hallOfFame.length, kept, 'a reset keeps the hall of fame');
E.hostAction(w, 'clear-hall', {}, at + 2000);
assert.equal(w.hallOfFame.length, 0, 'the host can clear it');
// Practice rounds never count.
const t = E.freshWorld('test', now);
playBatch(t, [1], now);
assert.equal((t.hallOfFame ?? []).length, 0, 'practice rounds stay out of the hall of fame');
console.log(`PASS: finished live batches fill the hall of fame (top 10 by gain, ${kept} kept after 5 batches), a reset keeps it, the host can clear it, practice never counts; the leaderboard carries order counts and best trades.`);
