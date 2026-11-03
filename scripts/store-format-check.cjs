// Storage format: packed price history unpacks to exactly the same world, an older unpacked state
// loads unchanged, and the stored row is much smaller.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');
const { packWorld, unpackWorld } = require('../src/game/store.ts');
const now = Date.now();
const w = E.freshWorld('live', now);
E.hostAction(w, 'start', {}, now);
E.hostAction(w, 'autonomous-start', {}, now);
for (let i = 0; i < 300; i++) E.advance(w, w.startedAt + i * 1000);
const before = JSON.stringify(w);
const stored = JSON.stringify(packWorld(w));
assert.equal(JSON.stringify(w), before, 'packing does not change the live world');
const restored = unpackWorld(JSON.parse(stored));
const original = JSON.parse(before);
// Candles are kept to the paisa (the exchange tick is 5 paise), so prices may differ only below that.
for (const [i, stock] of original.stocks.entries()) stock.candles.forEach((c, j) => { const r = restored.stocks[i].candles[j]; assert.equal(r.time, c.time); for (const k of ['open', 'high', 'low', 'close']) assert(Math.abs(r[k] - c[k]) < .006, 'candle prices survive packing to the paisa'); assert.equal(r.volume, Math.round(c.volume)); });
assert.deepEqual({ ...restored, stocks: restored.stocks.map(s => ({ ...s, candles: [] })) }, { ...original, stocks: original.stocks.map(s => ({ ...s, candles: [] })) }, 'everything except candle rounding unpacks unchanged');
assert.deepEqual(unpackWorld(JSON.parse(before)), JSON.parse(before), 'an older unpacked state loads unchanged');
const ratio = stored.length / before.length;
assert(ratio < .6, `stored row should shrink well below 60%, got ${(ratio * 100).toFixed(0)}%`);
console.log(`PASS: packed price history round-trips to the paisa; stored row ${(before.length / 1024).toFixed(0)} KB → ${(stored.length / 1024).toFixed(0)} KB (${(zlib.gzipSync(stored).length / 1024).toFixed(0)} KB gzipped).`);
