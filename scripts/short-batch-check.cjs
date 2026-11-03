// Short batches (1–3 minutes): the news brain still publishes, spaced at least 15 s apart, and leaves
// the closing seconds alone; batches of 4 minutes or more keep the normal 35–50 s pacing.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');
const { newsPace } = require('../src/game/news-timing.ts');

const summary = [];
for (const minutes of [1, 2, 3]) {
  const now = Date.now();
  const w = E.freshWorld('live', now);
  E.hostAction(w, 'controls', { duration: minutes * 60 }, now);
  E.hostAction(w, 'autonomous-start', {}, now);
  let at = w.startedAt;
  while (w.status !== 'closed' && at < w.startedAt + minutes * 60_000 + 60_000) { at += 1000; E.advance(w, at); }
  const times = [...new Set(w.headlines.map(news => news.createdAt))].sort((a, b) => a - b).map(t => (t - w.startedAt) / 1000);
  assert(times.length >= 2, `${minutes}-min batch: at least two sets, got ${times.length}`);
  let last = 0;
  for (const t of times) { assert(t - last >= 14, `${minutes}-min batch: sets ${t - last}s apart`); last = t; }
  assert(minutes * 60 - times[times.length - 1] >= newsPace(minutes * 60).reaction, `${minutes}-min batch: the last set has time to play out`);
  summary.push(`${minutes} min: ${times.length} sets`);
}
const full = newsPace(240);
assert.deepEqual([full.minGap, full.maxGap, full.reaction, full.minSets], [35, 50, 35, 4], '4-minute batches keep the normal pacing');
console.log(`PASS: short batches get news (${summary.join(', ')}); 4 minutes and longer keep 35–50 s gaps.`);
