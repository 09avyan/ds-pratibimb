// News brain: response-driven pacing, round-wide choices and host controls.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');
const { chooseAutonomousNewsPlan, readNewsResponse } = require('../src/game/autonomous-news.ts');

const now = Date.now();
const scopeOf = news => news.scope ?? (news.symbols?.length ? 'stock' : news.sector === 'ALL' ? 'economy' : 'sector');

/** A live brain-led round, advanced past its first release, with active terminals. */
function roundAfterFirstSet(terminals = 4) {
  const w = E.freshWorld('live', now);
  w.duration = 900;
  E.hostAction(w, 'start', { autonomous: true }, now);
  for (let n = 1; n <= terminals; n++) { const p = E.newPlayer(`p${n}`, w.batch, now, true, n); w.sessions[p.id] = p; }
  let second = 0;
  while (!w.headlines.length && second < 200) { second++; const at = w.startedAt + second * 1000; for (const p of Object.values(w.sessions)) p.lastSeenAt = at; E.advance(w, at); }
  assert(w.headlines.length >= 2, 'the brain publishes its opening set');
  return w;
}
const affectedSymbols = w => {
  const at = Math.max(...w.headlines.map(n => n.createdAt));
  const stories = w.headlines.filter(n => n.createdAt === at);
  return w.stocks.filter(s => stories.some(n => scopeOf(n) === 'economy' || (scopeOf(n) === 'sector' ? s.sector === n.sector : n.symbols?.includes(s.symbol)))).map(s => s.symbol);
};
const trade = (w, p, symbol, at) => { p.lastSeenAt = at; return E.executeTrade(w, p, 'Buy', symbol, 1, at); };

// 1. Players who acted on the last set and then went quiet bring the next set sooner than a room still trading.
{
  const base = roundAfterFirstSet();
  const release = Math.max(...base.headlines.map(n => n.createdAt));
  const symbol = affectedSymbols(base)[0];
  const absorbed = structuredClone(base), busy = structuredClone(base);
  const reviewAt = release + 50_000;
  // 50s later the 35s direct reaction is over (the fixture is not ticked forward).
  for (const copy of [absorbed, busy]) for (const stock of copy.stocks) stock.newsMoves = (stock.newsMoves ?? []).map(move => ({ ...move, elapsed: move.duration }));
  for (const p of Object.values(absorbed.sessions)) trade(absorbed, p, symbol, release + 8_000);
  for (const p of Object.values(absorbed.sessions)) p.lastSeenAt = reviewAt;
  for (const p of Object.values(busy.sessions)) { trade(busy, p, symbol, release + 8_000); trade(busy, p, symbol, reviewAt - 4_000); p.lastSeenAt = reviewAt; }
  const response = readNewsResponse(absorbed, reviewAt);
  assert.equal(response.respondedTerminals, 4);
  assert.equal(response.responseShare, 1);
  assert.equal(Math.round(response.medianFirstReaction), 8);
  assert(response.quietSeconds >= 40);
  const quick = chooseAutonomousNewsPlan(absorbed, reviewAt);
  const slow = chooseAutonomousNewsPlan(busy, reviewAt);
  assert(quick.pacing.some(f => /acted on the last set/.test(f.label) && f.seconds < 0), 'absorbed set shortens the gap');
  assert(slow.pacing.some(f => /still trading/.test(f.label) && f.seconds > 0), 'ongoing trading lengthens the gap');
  assert(quick.intervalSeconds < slow.intervalSeconds, `absorbed ${quick.intervalSeconds}s should be sooner than busy ${slow.intervalSeconds}s`);
  assert(quick.intervalSeconds >= 50 && slow.intervalSeconds <= 75);
  // The factors add up to the chosen gap.
  for (const plan of [quick, slow]) assert.equal(Math.round(plan.pacing.reduce((sum, f) => sum + f.seconds, 0)), plan.intervalSeconds);
}

// 2. Rejected orders give players more time.
{
  const w = roundAfterFirstSet();
  const at = Math.max(...w.headlines.map(n => n.createdAt)) + 30_000;
  for (let i = 0; i < 4; i++) w.logs.unshift({ id: `r${i}`, at: at - 5_000, batch: w.batch, elapsedSeconds: 0, kind: 'order-rejected', terminalNumber: 1 + (i % 2), message: 'rejected' });
  const plan = chooseAutonomousNewsPlan(w, at);
  assert(plan.pacing.some(f => /rejected orders/.test(f.label) && f.seconds === 12));
}

// 3. Host intensity override is respected and can be returned to the brain.
{
  const w = roundAfterFirstSet();
  const at = w.lastTickAt;
  E.hostAction(w, 'autonomous-intensity', { value: 'lively' }, at);
  assert.equal(w.autonomousNews.hostIntensity, 'lively');
  assert.equal(w.autonomousNews.strategy, 'lively');
  E.hostAction(w, 'autonomous-intensity', { value: 'calm' }, at);
  assert.equal(w.autonomousNews.strategy, 'calm');
  E.hostAction(w, 'autonomous-intensity', { value: 'auto' }, at);
  assert.equal(w.autonomousNews.hostIntensity, null);
  assert.throws(() => E.hostAction(w, 'autonomous-intensity', { value: 'chaotic' }, at));
}

// 4. Sooner / later moves the next release and survives the live review; it never goes into the past.
{
  const w = roundAfterFirstSet();
  const at = w.lastTickAt;
  const before = w.autonomousNews.nextAt;
  E.hostAction(w, 'autonomous-nudge', { seconds: 15 }, at);
  const moved = Math.round((w.autonomousNews.nextAt - before) / 1000);
  assert(moved > 0 && moved <= 15, 'Later moves the release, but never past 75 seconds after the last publish');
  E.advance(w, at + 6_000);
  assert(w.autonomousNews.pacing.some(f => f.kind === 'host' && f.seconds === 15), 'the nudge stays in the plan after a review');
  for (let i = 0; i < 6; i++) E.hostAction(w, 'autonomous-nudge', { seconds: -15 }, at + 6_000);
  assert(w.autonomousNews.nextAt >= at + 6_000 + 5_000 - 1, 'cannot move the release into the past');
  assert.throws(() => E.hostAction(w, 'autonomous-nudge', { seconds: 0 }, at));
  // Publishing clears the nudge for the following set.
  E.hostAction(w, 'autonomous-publish-now', {}, at + 7_000);
  assert.equal(w.autonomousNews.nudgeSeconds, 0);
}

// 5. Pin keeps a story; swap replaces one story and keeps the rest; skip avoids the skipped set.
{
  const w = roundAfterFirstSet();
  const at = w.lastTickAt;
  const [first] = w.autonomousNews.nextIndices;
  E.hostAction(w, 'autonomous-pin', { index: first }, at);
  assert(w.autonomousNews.pinnedIndices.includes(first));
  E.advance(w, at + 6_000);
  assert(w.autonomousNews.nextIndices.includes(first), 'a pinned story stays through reviews');
  const second = w.autonomousNews.nextIndices.find(index => index !== first);
  E.hostAction(w, 'autonomous-swap', { index: second }, at + 6_000);
  assert(!w.autonomousNews.nextIndices.includes(second), 'the swapped story is replaced');
  assert(w.autonomousNews.nextIndices.includes(first), 'the other story stays');
  assert([2, 3].includes(w.autonomousNews.nextIndices.length));
  const skipped = [...w.autonomousNews.nextIndices];
  E.hostAction(w, 'autonomous-skip', {}, at + 7_000);
  assert(!skipped.every(index => w.autonomousNews.nextIndices.includes(index)), 'skip chooses a different set');
  assert(skipped.every(index => w.autonomousNews.excludedIndices.includes(index)));
  assert.throws(() => E.hostAction(w, 'autonomous-swap', { index: 99999 }, at + 7_000));
}

// 6. Over a long round the brain spreads news across sectors and finishes with a closing set.
{
  const w = E.freshWorld('live', now);
  w.duration = 900;
  E.hostAction(w, 'start', { autonomous: true }, now);
  for (let n = 1; n <= 5; n++) { const p = E.newPlayer(`r${n}`, w.batch, now, true, n); w.sessions[p.id] = p; }
  let sawFinal = false;
  for (let second = 1; second <= 900; second++) {
    const at = w.startedAt + second * 1000;
    for (const p of Object.values(w.sessions)) { p.lastSeenAt = at; if (second % 11 === p.terminalNumber) { try { E.executeTrade(w, p, 'Buy', w.stocks[(second + p.terminalNumber) % w.stocks.length].symbol, 1, at); } catch {} } }
    E.advance(w, at);
    if (w.autonomousNews.enabled && w.autonomousNews.finalSet) sawFinal = true;
  }
  const sectors = new Set(w.headlines.filter(n => scopeOf(n) !== 'economy').map(n => n.sector));
  assert(sectors.size >= 6, `news reached ${sectors.size} sectors`);
  assert(sawFinal, 'the brain marks a closing set near the end');
  const sets = [...new Set(w.headlines.map(n => n.createdAt))].sort((a, b) => a - b);
  for (let i = 1; i < sets.length; i++) { const gap = (sets[i] - sets[i - 1]) / 1000; assert(gap >= 49 && gap <= 76, `gap ${gap}s`); }
  assert(w.status === 'closed');
}

// 7. The shown set stays the same across live reviews (host preview is reliable).
{
  const w = roundAfterFirstSet(6);
  let shown = w.autonomousNews.nextIndices.join(','), strategy = w.autonomousNews.strategy, stable = 0;
  let at = w.lastTickAt;
  for (let i = 0; i < 8; i++) {
    at += 5_000; for (const p of Object.values(w.sessions)) p.lastSeenAt = at;
    const published = w.headlines.length;
    E.advance(w, at);
    if (w.headlines.length !== published) break;
    // Only a strategy switch (or an invalid story) may change the shown set.
    if (w.autonomousNews.strategy === strategy) { assert.equal(w.autonomousNews.nextIndices.join(','), shown, 'the previewed set does not churn'); stable++; }
    shown = w.autonomousNews.nextIndices.join(','); strategy = w.autonomousNews.strategy;
  }
  assert(stable >= 2, 'several reviews kept the same set');
}

console.log('brain pacing checks passed');
