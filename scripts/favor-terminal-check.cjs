// Host bias: with a terminal favoured, the brain's planned stories help that terminal's positions
// (good news on what it holds, bad news on what it has shorted); switched off, the bias is gone.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');

function effect(w, n) {
  const p = Object.values(w.sessions).find(x => x.terminalNumber === n);
  let sum = 0;
  for (const i of w.autonomousNews.nextIndices) {
    const news = w.news[i]; const scope = news.scope ?? (news.symbols?.length ? 'stock' : news.sector === 'ALL' ? 'economy' : 'sector');
    for (const s of w.stocks) if (scope === 'economy' || (scope === 'sector' ? s.sector === news.sector : news.symbols?.includes(s.symbol))) {
      const exp = (p.holdings[s.symbol]?.qty ?? 0) - (p.shorts[s.symbol]?.qty ?? 0);
      sum += Math.sign(exp * news.direction);
    }
  }
  return sum;
}
let helped = 0, total = 0;
for (let seed = 0; seed < 8; seed++) {
  const now = Date.now() + seed * 9_973;
  const w = E.freshWorld('live', now);
  E.hostAction(w, 'autonomous-start', {}, now);
  let at = w.startedAt + 2000; E.advance(w, at);
  const banks = w.stocks.filter(s => s.sector === 'Banking');
  const long = E.newPlayer(`long-${seed}-xxxx`, w.batch, at, true, 3); w.sessions[long.id] = long;
  const short = E.newPlayer(`short-${seed}-xxx`, w.batch, at, true, 5); w.sessions[short.id] = short;
  for (const s of banks.slice(0, 3)) { E.executeTrade(w, long, 'Buy', s.symbol, 200, at); E.executeTrade(w, short, 'Short', s.symbol, 60, at); }
  for (const [n] of [[3], [5]]) {
    E.hostAction(w, 'favor-terminal', { terminal: n }, at);
    total++; if (effect(w, n) > 0) helped++;
  }
  E.hostAction(w, 'favor-terminal', { terminal: '' }, at);
  assert.equal(w.autonomousNews.favorTerminal, null, 'switching off clears the bias');
}
assert(helped >= total * .75, `the favoured terminal is helped in most plans (${helped} of ${total})`);
console.log(`PASS: with a terminal favoured, the planned news helps its positions in ${helped} of ${total} plans (long and short); switching off clears it.`);
