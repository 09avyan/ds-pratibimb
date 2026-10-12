import { INDEX_WEIGHTS, makeNews, makeStocks, NEWS_PRESETS } from "./catalog";
import type { Mode, Player, PublicWorld, Trade, World } from "./types";

export const START_CASH = 1_000_000;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const textSeed = (text: string) => [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % 1_000_003;
const id = () => crypto.randomUUID();

export function freshWorld(mode: Mode, now = Date.now(), batch = 1): World {
  const stocks = makeStocks(batch * (mode === "test" ? 13 : 1));
  const test = mode === "test";
  return {
    mode, batch: test ? batch : 0, status: test ? "live" : "ready", duration: 6 * 60, remaining: 6 * 60,
    startedAt: test ? now : 0, lastTickAt: now, tick: 0,
    controls: { scenario: "Sideways", volatility: 48, bots: 58, tickRate: 1, marketBias: 50, paused: false, majorAuto: 1, minorAuto: 2, newsSpacing: 65, newsEnabled: true, activeNews: 0 },
    stocks, news: makeNews(test ? batch : 1), headlines: [], sessions: {}, latestNewsId: null, latestNewsIds: [], newsNextAt: now + 75_000, error: null, version: 1, scheduledInterventions: [], scheduledNews: [],
  };
}

function applyMove(world: World, stock: World["stocks"][number], move: number, volume: number, at: number) {
  const old = stock.price;
  const close = round2(clamp(old * (1 + move), stock.previousClose * .68, stock.previousClose * 1.32));
  const bar = stock.candles.at(-1);
  if (bar && at - bar.time < 1_500) {
    bar.high = Math.max(bar.high, close); bar.low = Math.min(bar.low, close); bar.close = close; bar.volume += volume;
  } else {
    stock.candles.push({ time: at, open: old, high: Math.max(old, close), low: Math.min(old, close), close, volume });
    if (stock.candles.length > 96) stock.candles.splice(0, stock.candles.length - 96);
  }
  stock.price = close;
  stock.flow = stock.flow * .74 + move * 10000;
}

function pushHeadline(world: World, presetIndex?: number) {
  const presets = world.news;
  const idx = presetIndex ?? Math.floor(rand(world.tick + world.batch * 991) * presets.length);
  const source = presets[idx % presets.length];
  const news = { ...source, id: id(), createdAt: Date.now() };
  world.latestNewsId = news.id;
  world.headlines.unshift(news);
  if (world.headlines.length > 80) world.headlines.pop();
  for (const stock of world.stocks) {
    const scope = news.scope ?? (news.sector === "ALL" ? "economy" : "sector");
    const applies = scope === "stock" ? Boolean(news.symbols?.includes(stock.symbol)) : scope === "economy" || news.sector === stock.sector;
    if (!applies) continue;
    const intensity = news.severity / 100 * news.direction * (.8 + rand(world.tick + stock.symbol.length * 71) * .4);
    applyMove(world, stock, intensity, 2500 + Math.floor(rand(world.tick + stock.base) * 18000), news.createdAt);
  }
  world.controls.activeNews = news.severity;
}

export function advance(world: World, now = Date.now()): World {
  const existingHeadlines = new Set(world.news.map(item => item.headline));
  const missingPresets = NEWS_PRESETS.filter(item => !existingHeadlines.has(item.headline));
  if (missingPresets.length) {
    world.news.push(...missingPresets.map(item => ({ ...item, id: `catalog-${NEWS_PRESETS.indexOf(item)}`, createdAt: 0 })));
    world.version++;
  }
  if (world.status === "countdown" && now >= world.startedAt) { world.status = "live"; world.lastTickAt = world.startedAt; world.version++; }
  if (world.mode === "test" && world.status === "closed") { world.status = "live"; world.controls.paused = false; world.version++; }
  if (world.mode === "live" && (world.status !== "live" || world.controls.paused)) { world.lastTickAt = now; return world; }
  const elapsed = Math.max(0, now - world.lastTickAt);
  // Reconstruct long-idle test-market time in bounded coarse steps on reconnect.
  // This keeps the autonomous lab moving without a permanently running server process.
  const interval = world.mode === "test" ? Math.max(world.controls.tickRate * 1000, Math.ceil(elapsed / 1800)) : world.controls.tickRate * 1000;
  const due = Math.floor(Math.max(0, now - world.lastTickAt) / interval);
  const steps = Math.min(due, world.mode === "test" ? 1800 : 900);
  if (!steps) return world;
  const start = world.lastTickAt;
  for (let k = 1; k <= steps; k++) {
    world.tick++;
    const at = start + k * interval;
    const dueInterventions = world.scheduledInterventions.filter(item => item.at <= at);
    world.scheduledInterventions = world.scheduledInterventions.filter(item => item.at > at);
    for (const event of dueInterventions) for (const stock of world.stocks) {
      if (event.sector === "ALL" || stock.sector === event.sector || stock.symbol === event.sector)
        applyMove(world, stock, event.direction * event.magnitude * (.8 + rand(world.tick + stock.base) * .4), 20_000, at);
    }
    const dueNews = world.scheduledNews.filter(item => item.at <= at);
    world.scheduledNews = world.scheduledNews.filter(item => item.at > at);
    if (dueNews.length) {
      const ids: string[] = [];
      for (const event of dueNews) { pushHeadline(world, event.index); if (world.latestNewsId) ids.push(world.latestNewsId); }
      world.latestNewsIds = ids;
    }
    const vol = world.controls.volatility / 25;
    const botFleet = 80 + world.controls.bots * 2.8;
    const botParticipation = world.controls.bots === 0 ? 0 : Math.sqrt(botFleet / 240) * (world.controls.bots / 58);
    const scenarioDrift = world.controls.scenario === "Bullish" ? .000035 : world.controls.scenario === "Bearish" ? -.000035 : 0;
    const bias = (world.controls.marketBias - 50) * .0000018;
    const activeShock = world.controls.activeNews ? world.controls.activeNews / 10000 : 0;
    const sectorPulse = new Map<string, number>();
    for (const stock of world.stocks) {
      if (!sectorPulse.has(stock.sector)) {
        const pulseSeed = world.tick * 13 + textSeed(stock.sector) * 97;
        sectorPulse.set(stock.sector, rand(pulseSeed) < .19 ? (rand(pulseSeed + 1) - .5) * .0011 * vol : 0);
      }
      const hist = stock.candles;
      const momentum = hist.length > 3 ? ((hist.at(-1)!.close - hist.at(-4)!.close) / hist.at(-4)!.close) * .055 : 0;
      const symbolSeed = world.tick * 37 + textSeed(stock.symbol) * 7;
      const noise = (rand(symbolSeed) - .5) * .009 * vol;
      const meanRevert = ((stock.previousClose - stock.price) / stock.previousClose) * .009;
      const newsReaction = world.controls.activeNews ? Math.sign(activeShock) * (rand(world.tick + stock.base) - .5) * activeShock : 0;
      const sectorMove = (sectorPulse.get(stock.sector) ?? 0) * (rand(symbolSeed + 3) < .76 ? 1 : -.42);
      // Hundreds of virtual books are represented as six independent strategy flows per name.
      const botOrders = (
        momentum * (.35 + rand(symbolSeed + 5) * .45) +
        meanRevert * (.45 + rand(symbolSeed + 7) * .65) +
        newsReaction * (.25 + rand(symbolSeed + 11) * .55) +
        (rand(symbolSeed + 13) - .5) * .00018 +
        (rand(symbolSeed + 17) - .5) * .00012 -
        stock.flow / 10000 * .012
      ) * botParticipation;
      const institutional = (rand(Math.floor(world.tick / 11) + textSeed(stock.symbol) * 3) - .5) * .00009 * (world.controls.bots / 50);
      const returnRate = clamp(scenarioDrift + bias + sectorMove + momentum + meanRevert + noise + botOrders + institutional + newsReaction + stock.flow / 10000 * .02, -.009 * vol, .009 * vol);
      const botVolume = Math.round((300 + rand(world.tick + stock.base) * 5_800) * (botFleet / 100));
      applyMove(world, stock, returnRate, botVolume, at);
    }
    if (world.mode === "live") world.remaining = Math.max(0, world.remaining - interval / 1000);
    if (world.mode === "live" && world.remaining <= 0) { endWorld(world, at); break; }
    if (world.controls.activeNews > 0) world.controls.activeNews = Math.max(0, world.controls.activeNews - .0025);
    if (world.controls.newsEnabled && at >= world.newsNextAt) {
      const major = rand(world.tick * 2 + world.batch) < .42;
      const majorLeft = Math.max(0, world.controls.majorAuto);
      const minorLeft = Math.max(0, world.controls.minorAuto);
      if (world.mode === "test" && !majorLeft && !minorLeft) { world.controls.majorAuto = 3; world.controls.minorAuto = 6; }
      const refreshedMajor = Math.max(0, world.controls.majorAuto), refreshedMinor = Math.max(0, world.controls.minorAuto);
      if ((major && refreshedMajor) || (!refreshedMinor && refreshedMajor)) {
        const choice = world.news.filter(n => n.type === "major");
        pushHeadline(world, world.news.indexOf(choice[Math.floor(rand(world.tick) * choice.length)])); world.latestNewsIds = [world.latestNewsId!];
        world.controls.majorAuto--;
      } else if (refreshedMinor) {
        const choice = world.news.filter(n => n.type === "minor");
        pushHeadline(world, world.news.indexOf(choice[Math.floor(rand(world.tick) * choice.length)])); world.latestNewsIds = [world.latestNewsId!];
        world.controls.minorAuto--;
      }
      world.newsNextAt = at + world.controls.newsSpacing * 1000;
    }
  }
  world.lastTickAt = steps < due ? now : start + steps * interval;
  world.version++;
  return world;
}

function positionValue(world: World, holdings: Player["holdings"]) {
  return Object.entries(holdings).reduce((sum, [symbol, pos]) => sum + pos.qty * (world.stocks.find(s => s.symbol === symbol)?.price ?? 0), 0);
}
export const shortValue = (world: World, shorts: Player["shorts"]) => Object.entries(shorts).reduce((sum, [symbol, pos]) => sum + pos.qty * (world.stocks.find(s => s.symbol === symbol)?.price ?? 0), 0);
export function equity(world: World, player: Player) { return player.cash + positionValue(world, player.holdings) - shortValue(world, player.shorts); }
export function indexValue(world: World) { return 10_000 * Object.entries(INDEX_WEIGHTS).reduce((sum, [symbol, weight]) => { const s = world.stocks.find(x => x.symbol === symbol); return sum + weight * (s ? s.price / s.previousClose : 1); }, 0); }

function endWorld(world: World, at: number) {
  world.status = "closed"; world.controls.paused = true;
  for (const player of Object.values(world.sessions)) settle(world, player, at);
}

function settle(world: World, player: Player, at: number) {
  for (const [symbol, p] of Object.entries(player.shorts)) {
    const price = world.stocks.find(s => s.symbol === symbol)?.price ?? p.avg;
    const realized = (p.avg - price) * p.qty;
    player.cash -= p.qty * price;
    player.history.unshift({ id: id(), symbol, side: "Auto-cover", qty: p.qty, price, time: at, realized, note: "Short settled at the session close" });
  }
  player.shorts = {};
  player.ended = true;
}

export function executeTrade(world: World, player: Player, action: "Buy" | "Sell" | "Short", symbol: string, quantity: number, at = Date.now()) {
  if (world.mode === "live" && world.status !== "live") throw new Error("The host has not started the market yet.");
  if (world.mode === "live" && (player.ended || player.paused || !player.included || world.controls.paused)) throw new Error("Trading is paused for this participant.");
  if (world.status === "closed" || player.ended) throw new Error("This market session has ended.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) throw new Error("Enter a whole-share quantity between 1 and 100,000.");
  const stock = world.stocks.find(s => s.symbol === symbol);
  if (!stock) throw new Error("That company is no longer available.");
  const px = stock.price, notional = quantity * px;
  let realized = 0, note: string | undefined;
  if (action === "Buy") {
    const short = player.shorts[symbol];
    const covered = Math.min(quantity, short?.qty ?? 0);
    const newLong = quantity - covered;
    const available = player.cash;
    if (available + 1e-6 < notional) throw new Error("Not enough cash available for this buy.");
    if (covered && short) {
      realized += (short.avg - px) * covered;
      short.qty -= covered;
      if (!short.qty) delete player.shorts[symbol];
      note = newLong ? `Covered ${covered} short shares, then bought ${newLong} long shares.` : `Covered ${covered} short shares.`;
    }
    if (newLong) {
      const old = player.holdings[symbol] ?? { qty: 0, avg: 0 };
      player.holdings[symbol] = { qty: old.qty + newLong, avg: (old.qty * old.avg + newLong * px) / (old.qty + newLong) };
    }
    player.cash -= notional;
  } else if (action === "Sell") {
    const holding = player.holdings[symbol];
    if (!holding || holding.qty < quantity) throw new Error("You can only sell shares you currently hold.");
    realized = (px - holding.avg) * quantity;
    holding.qty -= quantity;
    if (!holding.qty) delete player.holdings[symbol];
    player.cash += notional;
  } else {
    if (player.holdings[symbol]?.qty) throw new Error("Close your long shares before opening a short.");
    const totalShort = shortValue(world, player.shorts);
    if (totalShort + notional > player.initialCash * .3 + 1e-6) throw new Error("Short exposure is limited to 30% of your starting cash.");
    const old = player.shorts[symbol] ?? { qty: 0, avg: 0 };
    player.shorts[symbol] = { qty: old.qty + quantity, avg: (old.qty * old.avg + quantity * px) / (old.qty + quantity) };
    player.cash += notional;
  }
  const trade: Trade = { id: id(), symbol, side: action, qty: quantity, price: px, time: at, realized, note };
  player.history.unshift(trade);
  const direction = action === "Buy" ? 1 : -1;
  const impact = clamp(quantity / Math.max(30_000, stock.base * 80) * .018, .000015, .0008) * direction;
  stock.flow += direction * Math.min(12, quantity / 20);
  applyMove(world, stock, impact, quantity, at);
  world.version++;
  return trade;
}

export function hostAction(world: World, action: string, payload: Record<string, unknown> = {}, at = Date.now()) {
  if (action === "start") {
    if (world.status === "live" || world.status === "countdown") throw new Error("The batch is already starting or running.");
    world.batch++;
    world.stocks = makeStocks(world.batch * (world.mode === "test" ? 13 : 1));
    world.news = makeNews(world.batch); world.headlines = []; world.latestNewsId = null;
    world.status = "countdown"; world.controls.paused = false; world.remaining = world.duration; world.latestNewsIds = [];
    world.startedAt = at + 3000; world.lastTickAt = at; world.newsNextAt = world.startedAt + world.controls.newsSpacing * 1000;
    world.scheduledNews = []; world.scheduledInterventions = [];
    for (const player of Object.values(world.sessions)) if (player.included) {
      const next = newPlayer(player.id, world.batch, at, true, player.terminalNumber); world.sessions[player.id] = next;
    }
  } else if (action === "pause") { world.controls.paused = true; world.lastTickAt = at; }
  else if (action === "resume") { world.controls.paused = false; world.lastTickAt = at; }
  else if (action === "end") endWorld(world, at);
  else if (action === "reset") { world.status = "ready"; world.controls.paused = true; world.remaining = world.duration; world.sessions = {}; world.stocks = makeStocks(world.batch + Date.now()); world.news = makeNews(world.batch); world.headlines = []; world.scheduledNews = []; world.scheduledInterventions = []; world.latestNewsId = null; world.latestNewsIds = []; world.lastTickAt = at; }
  else if (action === "scenario") world.controls.scenario = payload.value as World["controls"]["scenario"];
  else if (action === "controls") {
    const c = world.controls;
    if (typeof payload.volatility === "number") c.volatility = clamp(payload.volatility, 15, 100);
    if (typeof payload.bots === "number") c.bots = clamp(payload.bots, 0, 100);
    if (payload.tickRate === .5 || payload.tickRate === 1) c.tickRate = payload.tickRate;
    if (typeof payload.marketBias === "number") c.marketBias = clamp(payload.marketBias, 0, 100);
    if (typeof payload.newsEnabled === "boolean") c.newsEnabled = payload.newsEnabled;
    if (typeof payload.majorAuto === "number") c.majorAuto = clamp(payload.majorAuto, 0, 20);
    if (typeof payload.minorAuto === "number") c.minorAuto = clamp(payload.minorAuto, 0, 20);
    if (typeof payload.newsSpacing === "number") c.newsSpacing = clamp(payload.newsSpacing, 15, 300);
    if (typeof payload.duration === "number" && world.status !== "live") { world.duration = clamp(payload.duration, 60, 2700); world.remaining = world.duration; }
  } else if (action === "headlines") {
    const indices = Array.isArray(payload.indices) ? [...new Set(payload.indices.map(Number).filter(index => Number.isInteger(index) && index >= 0 && index < world.news.length))] : [];
    if (!indices.length) throw new Error("Choose at least one news preset.");
    const delay = clamp(Number(payload.delay) || 0, 0, 300);
    if (delay) for (const index of indices) world.scheduledNews.push({ at: at + delay * 1000, index });
    else { for (const index of indices) pushHeadline(world, index); world.latestNewsIds = world.headlines.slice(0, indices.length).map(item => item.id); world.latestNewsId = world.latestNewsIds[0] ?? null; }
  } else if (action === "headline") {
    const idx = Number(payload.index);
    const delay = clamp(Number(payload.delay) || 0, 0, 300);
    if (idx >= 0 && idx < world.news.length) {
      if (delay) world.scheduledNews.push({ at: at + delay * 1000, index: idx });
      else { pushHeadline(world, idx); world.latestNewsIds = [world.latestNewsId!]; }
    }
    else throw new Error("Choose a news preset first.");
  } else if (action === "intervene") {
    const sector = String(payload.sector ?? "ALL"), direction = payload.direction === "down" ? -1 : 1;
    const magnitude = clamp(Number(payload.magnitude) || 1, .1, 5) / 100;
    const targets = world.stocks.filter(s => sector === "ALL" || s.sector === sector || s.symbol === sector);
    if (!targets.length) throw new Error("Choose a valid stock or sector.");
    const delay = clamp(Number(payload.delay) || 0, 0, 300) * 1000;
    if (delay) world.scheduledInterventions.push({ at: at + delay, sector, direction, magnitude });
    else targets.forEach((s, i) => applyMove(world, s, direction * magnitude * (.8 + rand(world.tick + i) * .4), 25_000, at));
  } else if (action === "participant") {
    const p = world.sessions[String(payload.id)];
    if (!p) throw new Error("Participant session not found.");
    if (payload.command === "pause") p.paused = !p.paused;
    else if (payload.command === "include") p.included = Boolean(payload.value);
    else if (payload.command === "end") { settle(world, p, at); }
    else if (payload.command === "reset") { world.sessions[p.id] = newPlayer(p.id, world.batch, at, p.included, p.terminalNumber); }
  }
  world.version++;
  return world;
}

export function newPlayer(sessionId: string, batch: number, at = Date.now(), included = true, terminalNumber?: number): Player {
  return { id: sessionId, batch, terminalNumber, initialCash: START_CASH, cash: START_CASH, holdings: {}, shorts: {}, history: [], joinedAt: at, lastSeenAt: at, ended: false, paused: false, included };
}

export function toPublic(world: World, sessionId?: string | null, selectedStock = "RELIANCE"): PublicWorld {
  const { sessions, version: _version, ...rest } = world;
  const base = world.stocks.reduce((sum, s) => sum + s.weight * s.previousClose, 0);
  const value = indexValue(world);
  return { ...rest, revision: world.version, news: [], scheduledInterventions: [], scheduledNews: [], stocks: world.stocks.map(stock => ({ ...stock, trend: stock.candles.slice(-18).map(bar => bar.close), candles: stock.symbol === selectedStock ? stock.candles.slice(-36) : [] })), player: sessionId ? sessions[sessionId] ?? null : null, index: value, indexChange: base ? ((value - 10_000) / 10_000) * 100 : 0, participants: Object.values(sessions).filter(p => p.included && !p.ended).length };
}

export function performance(world: World, player: Player) {
  const value = equity(world, player), pnl = value - player.initialCash, trades = player.history.filter(t => t.side !== "Auto-cover");
  const winners = trades.filter(t => t.realized > 0).length, losers = trades.filter(t => t.realized < 0).length;
  const symbols = new Set([...Object.keys(player.holdings), ...Object.keys(player.shorts)]);
  const sectors = new Set([...Object.keys(player.holdings), ...Object.keys(player.shorts)].map(symbol => world.stocks.find(s => s.symbol === symbol)?.sector).filter(Boolean));
  const symbolsTraded = new Set(trades.map(trade => trade.symbol));
  const sectorsTraded = new Set(trades.map(trade => world.stocks.find(stock => stock.symbol === trade.symbol)?.sector).filter(Boolean));
  const profitableSales = trades.filter(trade => trade.side === "Sell" && trade.realized > 0);
  const manualShortCover = trades.some(trade => trade.side === "Buy" && trade.note?.includes("Covered"));
  const top = trades.filter(t => t.realized !== 0).sort((a, b) => b.realized - a.realized);
  const badgeChoices: [string, string, boolean][] = [
    ["First Move", "Placed a trade", trades.length >= 1], ["Portfolio Builder", "Held three companies", Object.keys(player.holdings).length >= 3],
    ["Diversifier", "Invested across three sectors", sectors.size >= 3], ["Active Trader", "Completed five trades", trades.length >= 5],
    ["Green Close", "Finished with a positive return", pnl > 0], ["Risk Manager", "Kept short exposure within limits", Object.keys(player.shorts).length === 0 && Object.keys(player.holdings).length > 0],
    ["Steady Hand", "Kept at least half your cash available", player.cash >= player.initialCash * .5], ["Quick Study", "Reviewed your results", player.ended],
    ["Conviction", "Built a position above ₹1 lakh", Object.entries(player.holdings).some(([symbol, p]) => p.qty * (world.stocks.find(s => s.symbol === symbol)?.price ?? 0) >= 100_000)],
    ["Early Bird", "Joined within the opening minute", player.joinedAt - world.startedAt <= 60_000], ["Careful Timing", "Closed more winning than losing trades", winners > losers && winners > 0],
    ["Market Explorer", "Traded five different companies", symbolsTraded.size >= 5],
    ["Sector Sampler", "Traded in four different sectors", sectorsTraded.size >= 4],
    ["Profit Taker", "Closed a long position at a profit", profitableSales.length > 0],
    ["Short Closer", "Bought back shares to close a short", manualShortCover],
  ];
  const badges = badgeChoices.filter(b => b[2]).map(b => ({ name: b[0], detail: b[1] }));
  return { value, cash: player.cash, pnl, returnPct: pnl / player.initialCash * 100, holdings: player.holdings, shorts: player.shorts, trades: player.history, tradeCount: trades.length, winners, losers, bestTrade: top[0] ?? null, worstTrade: top.at(-1) ?? null, badges, sectors: sectors.size, symbols: symbols.size, lessons: [sectors.size >= 3 ? "Your positions covered several sectors, reducing dependence on a single industry." : "Spreading positions across sectors can reduce the effect of one industry shock.", Object.keys(player.shorts).length ? "Short positions magnify risk; review the liability before opening another." : "You kept short-sale exposure clear through the close.", trades.length >= 5 ? "Frequent trading adds up quickly; compare each trade's expected benefit with its risk." : "A clear plan can help you decide when to enter and when to wait."] };
}
