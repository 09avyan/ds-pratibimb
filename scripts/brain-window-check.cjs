// News brain release window: every set 35–50 game seconds after the last publish (the start for the
// first), at least three sets in a 4-minute round, sets of two or three stories, pauses not counted.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');

let games = 0, sets = 0, threes = 0;
for (const minutes of [4, 5]) for (let seed = 0; seed < 12; seed++) {
  const now = Date.now() + seed * 7_919;
  const w = E.freshWorld('live', now);
  E.hostAction(w, 'controls', { duration: minutes * 60, newsSpacing: 35 + seed * 2 }, now);
  E.hostAction(w, 'autonomous-start', {}, now);
  // A few terminals trade so the brain's readings vary between games.
  for (let n = 1; n <= (seed % 5) + 1; n++) { const p = E.newPlayer(`t${n}`, w.batch, now, true, n); p.lastSeenAt = now; w.sessions[p.id] = p; }
  let at = w.startedAt, paused = 0;
  while (w.status !== 'closed' && at < w.startedAt + minutes * 60_000 + 120_000) {
    at += 1000;
    for (const p of Object.values(w.sessions)) { p.lastSeenAt = at; if ((at - w.startedAt) % 9000 === 0) { const s = w.stocks[(p.terminalNumber * 5 + (at - w.startedAt) / 9000) % w.stocks.length]; try { E.executeTrade(w, p, p.holdings[s.symbol]?.qty ? 'Sell' : 'Buy', s.symbol, 1, at); } catch {} } }
    // One 15-second pause mid-round in some games: it must not count toward the gap.
    if (seed % 3 === 0 && at === w.startedAt + 90_000) { E.hostAction(w, 'pause', {}, at); E.advance(w, at + 15_000); at += 15_000; paused += 15; E.hostAction(w, 'resume', {}, at); }
    E.advance(w, at);
  }
  const times = [...new Set(w.headlines.map(news => news.createdAt))].sort((a, b) => a - b);
  // Game seconds of each release (wall time minus any pause before it).
  const game = times.map(t => (t - w.startedAt) / 1000 - (seed % 3 === 0 && t > w.startedAt + 90_000 ? paused : 0));
  assert(game.length >= 4, `${minutes}-min game ${seed}: at least four sets, got ${game.length}`);
  let last = 0;
  for (const g of game) { const gap = g - last; assert(gap >= 34 && gap <= 51, `${minutes}-min game ${seed}: gap ${gap.toFixed(1)}s outside 35–50s`); last = g; }
  for (const t of times) { const size = w.headlines.filter(news => news.createdAt === t).length; assert(size >= 2 && size <= 3, 'a set holds two or three stories'); if (size === 3) threes++; }
  games++; sets += times.length;
}
assert(threes > 0, 'some sets carry three stories');
console.log(`PASS: ${games} simulated rounds (4 and 5 minutes, some paused), ${sets} sets, every gap 35–50 game seconds from the last publish, at least four sets per round, ${threes} three-story sets.`);
