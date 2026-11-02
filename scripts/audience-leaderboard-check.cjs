// Audience leaderboard: one ranking for the wall and each terminal, kept through the batch close.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');
const { TERMINAL_ACTIVE_WINDOW_MS } = require('../src/game/terminals.ts');

const now = Date.now();
const world = E.freshWorld('live', now);
E.hostAction(world, 'start', {}, now);
E.advance(world, world.startedAt + 5_000);
const at = world.lastTickAt;
const played = player => { player.history.push({ id: `${player.id}-buy`, symbol: 'TCS', side: 'Buy', qty: 0, price: 1, time: at, realized: 0 }); return player; };
const join = (terminal, id = `terminal-${terminal}`) => { const player = played(E.newPlayer(id, world.batch, at, true, terminal)); world.sessions[id] = player; return player; };

const t1 = join(1), t2 = join(2), t3 = join(3), t4 = join(4), t5 = join(5), t6 = join(6);
t1.cash += 5_000;                     // clear leader
t2.cash += 2_000; t3.cash += 2_000;   // tied second place
t4.cash -= 3_000;                     // behind the untouched terminal
t5.lastSeenAt = Date.now() - TERMINAL_ACTIVE_WINDOW_MS - 1_000; // offline, still ranked
t6.included = false;                  // excluded by the host
const stale = played(E.newPlayer('old-login-3', world.batch, at - 10_000, true, 3)); stale.cash += 900_000; stale.lastSeenAt = at - 10_000; world.sessions[stale.id] = stale; // older login on terminal 3 is ignored
const finisher = join(7); finisher.cash += 1_000; E.settle(world, finisher, at); // finished early, still ranked

const idle = E.newPlayer('idle-8', world.batch, at, true, 8); world.sessions[idle.id] = idle; // logged in, never traded
const seller = E.newPlayer('sell-only-9', world.batch, at, true, 9); seller.history.push({ id: 's', symbol: 'TCS', side: 'Sell', qty: 0, price: 1, time: at, realized: 0 }); world.sessions[seller.id] = seller;
let board = E.toPublic(world).leaderboard;
assert(!board.some(entry => entry.terminalNumber === 8 || entry.terminalNumber === 9), 'terminals that have not bought or shorted are not ranked');
assert.equal(E.toPublic(world, idle.id).standing, null, 'an idle terminal has no position yet');
assert.deepEqual(board.map(entry => [entry.terminalNumber, entry.rank]), [[1, 1], [2, 2], [3, 2], [7, 4], [5, 5], [4, 6]], 'ranks, ties and ordering');
assert(!board.some(entry => entry.terminalNumber === 6), 'excluded terminals stay off the wall');
assert.equal(board.find(entry => entry.terminalNumber === 5).status, 'offline');
assert.equal(board.find(entry => entry.terminalNumber === 7).status, 'finished');
assert.equal(board.find(entry => entry.terminalNumber === 1).status, 'live');
const leader = board[0];
assert.equal(leader.totalValue, E.equity(world, t1));
assert.equal(leader.pnl, leader.totalValue - t1.initialCash);
assert(Math.abs(leader.returnPct - leader.pnl / t1.initialCash * 100) < 1e-9);
assert.equal(leader.cash, t1.cash);

// The wall and every terminal's own POSITION use the same rank.
for (const entry of board) {
  const session = Object.values(world.sessions).filter(player => player.terminalNumber === entry.terminalNumber && player.included).sort((a, b) => (b.lastSeenAt ?? b.joinedAt) - (a.lastSeenAt ?? a.joinedAt))[0];
  assert.equal(E.toPublic(world, session.id).standing.rank, entry.rank, `terminal ${entry.terminalNumber} position matches the wall`);
}

// Pausing is shown on the board.
E.hostAction(world, 'pause', {}, at + 1_000);
assert.equal(E.toPublic(world).leaderboard.find(entry => entry.terminalNumber === 1).status, 'paused');
E.hostAction(world, 'resume', {}, at + 2_000);

// Closing the batch keeps the final standings on screen (the old terminal strip went blank here).
E.hostAction(world, 'end', {}, at + 3_000);
assert.equal(world.status, 'closed');
const final = E.toPublic(world).leaderboard;
assert.equal(final.length, 6);
assert(final.every(entry => entry.status === 'finished'));
assert.equal(final[0].terminalNumber, 1);

// Starting the next batch clears the board; only reconnected terminals rejoin, level at the start.
const next = world.lastTickAt + 60_000;
for (const player of Object.values(world.sessions)) if (player.terminalNumber === 1 || player.terminalNumber === 2) player.lastSeenAt = next - 1_000;
E.hostAction(world, 'start', {}, next);
assert.deepEqual(E.toPublic(world).leaderboard, [], 'a new batch starts with an empty board until someone trades');

// 25 listed companies; a saved 28-stock market adopts the new list only between batches.
assert.equal(world.stocks.length, 25);
assert(!world.stocks.some(stock => ['KOTAKBANK', 'TATASTEEL', 'TATACONSUM'].includes(stock.symbol)));
const legacy = E.freshWorld('live', now);
E.hostAction(legacy, 'start', {}, now);
E.advance(legacy, legacy.startedAt + 2_000);
legacy.stocks.push({ ...legacy.stocks[0], symbol: 'KOTAKBANK' });
E.advance(legacy, legacy.startedAt + 3_000);
assert(legacy.stocks.some(stock => stock.symbol === 'KOTAKBANK'), 'a running batch keeps its stocks');
E.hostAction(legacy, 'end', {}, legacy.lastTickAt);
E.advance(legacy, legacy.lastTickAt + 1_000);
assert.equal(legacy.stocks.length, 25, 'a closed market adopts the 25-company list');

console.log('audience leaderboard checks passed');
