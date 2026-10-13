import { INDEX_WEIGHTS, LEGACY_NEWS_PRESETS, makeNews, makeStocks, NEWS_PRESETS } from "./catalog";
import type { Mode, News, Player, PublicWorld, Trade, World } from "./types";

export const START_CASH = 1_000_000;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const textSeed = (text: string) => [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % 1_000_003;
const id = () => crypto.randomUUID();
const NEWS_IMPACT_SCALE: Record<News["type"], number> = { major: 3.8, minor: 3.5 };
const NEWS_IMPACT_VARIATION = .1;
export function newsImpactRange(news: Pick<News, "type" | "severity">) {
  const expected = news.severity * NEWS_IMPACT_SCALE[news.type];
  return { low: expected * (1 - NEWS_IMPACT_VARIATION), high: expected * (1 + NEWS_IMPACT_VARIATION) };
}

export function freshWorld(mode: Mode, now = Date.now(), batch = 1): World {
  const test = mode === "test";
  const stocks = makeStocks(batch);
  const startedAt = test ? now + 3000 : 0;
  return {
    mode, batch: test ? batch : 0, status: test ? "countdown" : "ready", duration: 6 * 60, remaining: 6 * 60,
    startedAt, lastTickAt: now, tick: 0, testRulesVersion: test ? 2 : undefined,
    controls: { scenario: "Sideways", volatility: 48, bots: 58, tickRate: 1, marketBias: 50, paused: false, majorAuto: 1, minorAuto: 2, newsSpacing: 65, newsEnabled: true, activeNews: 0 },
    stocks, news: makeNews(test ? batch : 1), headlines: [], sessions: {}, hostNotes: [], latestNewsId: null, latestNewsIds: [], newsNextAt: test ? startedAt + 65_000 : now + 75_000, error: null, version: 1, scheduledInterventions: [], scheduledNews: [],
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
    if (stock.candles.length > 600) stock.candles.splice(0, stock.candles.length - 600);
  }
  stock.price = close;
  stock.flow = stock.flow * .74 + move * 10000;
}

function pushHeadline(world: World, presetIndex?: number, at = Date.now()) {
  const presets = world.news;
  const idx = presetIndex ?? Math.floor(rand(world.tick + world.batch * 991) * presets.length);
  const source = presets[idx % presets.length];
  const news = { ...source, id: id(), createdAt: at };
  const range = newsImpactRange(news);
  world.latestNewsId = news.id;
  world.latestNewsIds = [news.id];
  world.headlines.unshift(news);
  if (world.headlines.length > 80) world.headlines.pop();
  for (const stock of world.stocks) {
    const scope = news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
    const applies = scope === "stock" ? Boolean(news.symbols?.includes(stock.symbol)) : scope === "economy" || news.sector === stock.sector;
    if (!applies) continue;
    const impact = ((range.low + rand(world.tick + textSeed(stock.symbol) * 71) * (range.high - range.low)) / 100) * news.direction;
    const intensity = impact;
    const directionalDrift = Math.min(.0045, Math.max(.0011, Math.abs(impact) * .055)) * news.direction;
    stock.newsBias = news.direction * Math.min(.0045, Math.max(Math.abs(stock.newsBias ?? 0) * .55, Math.abs(directionalDrift)));
    applyMove(world, stock, intensity, 2500 + Math.floor(rand(world.tick + stock.base) * 18000), at);
  }
  world.controls.activeNews = Math.max(world.controls.activeNews ?? 0, range.high);
}

export type NewsImpactStock = { symbol: string; name: string; before: number; after: number; change: number; changePct: number };
export type NewsImpactPreview = { headlines: { news: World["news"][number]; stocks: NewsImpactStock[] }[]; combined: NewsImpactStock[] };

export function previewNewsImpact(world: World, presetIndices: number[]): NewsImpactPreview {
  const preview: World = { ...world, stocks: structuredClone(world.stocks), controls: { ...world.controls }, headlines: [], sessions: {}, scheduledNews: [], scheduledInterventions: [] };
  const headlines: NewsImpactPreview["headlines"] = [];
  const startingPrices = new Map(preview.stocks.map(stock => [stock.symbol, stock.price] as const));
  for (const index of [...new Set(presetIndices)]) {
    if (!Number.isInteger(index) || index < 0 || index >= preview.news.length) continue;
    const before = new Map(preview.stocks.map(stock => [stock.symbol, stock.price] as const));
    pushHeadline(preview, index);
    const stocks = preview.stocks.flatMap(stock => {
      const oldPrice = before.get(stock.symbol) ?? stock.price;
      if (stock.price === oldPrice) return [];
      const change = stock.price - oldPrice;
      return [{ symbol: stock.symbol, name: stock.name, before: oldPrice, after: stock.price, change, changePct: change / oldPrice * 100 }];
    }).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    headlines.push({ news: preview.news[index], stocks });
  }
  const combined = preview.stocks.flatMap(stock => {
    const before = startingPrices.get(stock.symbol) ?? stock.price;
    if (stock.price === before) return [];
    const change = stock.price - before;
    return [{ symbol: stock.symbol, name: stock.name, before, after: stock.price, change, changePct: change / before * 100 }];
  }).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  return { headlines, combined };
}

export function advance(world: World, now = Date.now()): World {
  if (!Array.isArray(world.hostNotes)) { world.hostNotes = []; world.version++; }
  if (typeof world.controls.activeNews !== "number") { world.controls.activeNews = 0; world.version++; }
  if (!Array.isArray(world.latestNewsIds)) { world.latestNewsIds = world.latestNewsId ? [world.latestNewsId] : []; world.version++; }
  for (const player of Object.values(world.sessions)) {
    if (player.accountingVersion === 2) continue;
    player.cash -= Object.values(player.shorts).reduce((sum, position) => sum + position.qty * position.avg, 0);
    player.accountingVersion = 2;
    world.version++;
  }
  for (const item of world.news) {
    const presetIndex = Number(item.id.slice(item.id.lastIndexOf("-") + 1));
    const preset = Number.isInteger(presetIndex) ? NEWS_PRESETS[presetIndex] : undefined;
    if (!preset) continue;
    if (item.headline !== preset.headline || item.direction !== preset.direction || item.sector !== preset.sector || item.scope !== preset.scope || item.severity !== preset.severity || JSON.stringify(item.symbols) !== JSON.stringify(preset.symbols)) {
      Object.assign(item, preset);
      world.version++;
    }
  }
  for (const item of world.headlines) {
    const preset = NEWS_PRESETS.find(candidate => candidate.headline === item.headline) ?? LEGACY_NEWS_PRESETS.get(item.headline);
    if (!preset) continue;
    if (item.type !== preset.type || item.headline !== preset.headline || item.direction !== preset.direction || item.sector !== preset.sector || item.scope !== preset.scope || item.severity !== preset.severity || JSON.stringify(item.symbols) !== JSON.stringify(preset.symbols)) {
      Object.assign(item, preset);
      world.version++;
    }
  }
  const existingHeadlines = new Set(world.news.map(item => item.headline));
  const missingPresets = NEWS_PRESETS.filter(item => !existingHeadlines.has(item.headline));
  if (missingPresets.length) {
    world.news.push(...missingPresets.map(item => ({ ...item, id: `catalog-${NEWS_PRESETS.indexOf(item)}`, createdAt: 0 })));
    world.version++;
  }
  if (world.mode === "test" && !world.testRulesVersion) {
    world.testRulesVersion = 2;
    if (world.status === "live" || world.status === "ready") {
      world.status = "closed";
      world.remaining = 0;
      world.controls.paused = true;
      for (const player of Object.values(world.sessions)) settle(world, player, now);
    }
    world.version++;
  }
  if (world.status === "countdown") {
    if (now < world.startedAt) return world;
    world.status = "live"; world.lastTickAt = world.startedAt; world.version++;
  }
  if (world.status !== "live" || world.controls.paused) { world.lastTickAt = now; return world; }
  const interval = world.controls.tickRate * 1000;
  const due = Math.floor(Math.max(0, now - world.lastTickAt) / interval);
  // Catch up the full round after a temporary connection gap. The 2,700-second
  // duration ceiling bounds this work to 5,400 ticks at the fastest cadence.
  const remainingSteps = Math.ceil(Math.max(0, Math.min(world.remaining, 2700)) * 1000 / interval);
  const steps = Math.min(due, remainingSteps, 5400);
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
      for (const event of dueNews) pushHeadline(world, event.index, at);
      world.latestNewsIds = world.headlines.slice(0, dueNews.length).map(news => news.id);
    }
    const vol = world.controls.volatility / 25;
    const botFleet = 80 + world.controls.bots * 2.8;
    const botParticipation = world.controls.bots === 0 ? 0 : Math.sqrt(botFleet / 240) * (world.controls.bots / 58);
    const scenarioDrift = world.controls.scenario === "Bullish" ? .000035 : world.controls.scenario === "Bearish" ? -.000035 : 0;
    const bias = (world.controls.marketBias - 50) * .0000018;
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
      const newsTrend = stock.newsBias ?? 0;
      const sectorMove = (sectorPulse.get(stock.sector) ?? 0) * (rand(symbolSeed + 3) < .76 ? 1 : -.42);
      // Hundreds of virtual books are represented as six independent strategy flows per name.
      const botOrders = (
        momentum * (.35 + rand(symbolSeed + 5) * .45) +
        meanRevert * (.45 + rand(symbolSeed + 7) * .65) +
        (rand(symbolSeed + 13) - .5) * .00018 +
        (rand(symbolSeed + 17) - .5) * .00012 -
        stock.flow / 10000 * .012
      ) * botParticipation;
      const institutional = (rand(Math.floor(world.tick / 11) + textSeed(stock.symbol) * 3) - .5) * .00009 * (world.controls.bots / 50);
      const returnRate = clamp(scenarioDrift + bias + sectorMove + momentum + meanRevert + noise + botOrders + institutional + stock.flow / 10000 * .02 + newsTrend, -.009 * vol, .009 * vol);
      const botVolume = Math.round((300 + rand(world.tick + stock.base) * 5_800) * (botFleet / 100));
      applyMove(world, stock, returnRate, botVolume, at);
      if (stock.newsBias) {
        stock.newsBias *= .94;
        if (Math.abs(stock.newsBias) < .00008) stock.newsBias = 0;
      }
    }
    world.remaining = Math.max(0, world.remaining - interval / 1000);
    if (world.remaining <= 0) { endWorld(world, at); break; }
    if (world.controls.activeNews > 0) world.controls.activeNews = Math.max(0, world.controls.activeNews - .0025);
    if (world.controls.newsEnabled && at >= world.newsNextAt) {
      const major = rand(world.tick * 2 + world.batch) < .42;
      const majorLeft = Math.max(0, world.controls.majorAuto);
      const minorLeft = Math.max(0, world.controls.minorAuto);
      if ((major && majorLeft) || (!minorLeft && majorLeft)) {
        const choice = world.news.filter(n => n.type === "major");
        pushHeadline(world, world.news.indexOf(choice[Math.floor(rand(world.tick) * choice.length)]), at);
        world.latestNewsIds = [world.latestNewsId!];
        world.controls.majorAuto--;
      } else if (minorLeft) {
        const choice = world.news.filter(n => n.type === "minor");
        pushHeadline(world, world.news.indexOf(choice[Math.floor(rand(world.tick) * choice.length)]), at);
        world.latestNewsIds = [world.latestNewsId!];
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
function shortBasis(player: Player) { return Object.values(player.shorts).reduce((sum, position) => sum + position.qty * position.avg, 0); }
function freeCash(player: Player) { return player.accountingVersion === 2 ? player.cash : player.cash - shortBasis(player); }
function shortUnrealizedPnl(world: World, shorts: Player["shorts"]) {
  return Object.entries(shorts).reduce((sum, [symbol, position]) => sum + (position.avg - (world.stocks.find(stock => stock.symbol === symbol)?.price ?? position.avg)) * position.qty, 0);
}
export function equity(world: World, player: Player) { return freeCash(player) + positionValue(world, player.holdings) + shortUnrealizedPnl(world, player.shorts); }
export function indexValue(world: World) { return 10_000 * Object.entries(INDEX_WEIGHTS).reduce((sum, [symbol, weight]) => { const s = world.stocks.find(x => x.symbol === symbol); return sum + weight * (s ? s.price / s.previousClose : 1); }, 0); }

function endWorld(world: World, at: number) {
  world.status = "closed"; world.controls.paused = true;
  for (const player of Object.values(world.sessions)) settle(world, player, at);
}

function settle(world: World, player: Player, at: number) {
  if (player.accountingVersion !== 2) {
    player.cash -= shortBasis(player);
    player.accountingVersion = 2;
  }
  for (const [symbol, p] of Object.entries(player.shorts)) {
    const price = world.stocks.find(s => s.symbol === symbol)?.price ?? p.avg;
    const realized = (p.avg - price) * p.qty;
    player.cash += realized;
    player.history.unshift({ id: id(), symbol, side: "Auto-cover", qty: p.qty, price, time: at, realized, note: "Short settled at the session close" });
  }
  player.shorts = {};
  player.ended = true;
}

export function executeTrade(world: World, player: Player, action: "Buy" | "Sell" | "Short", symbol: string, quantity: number, at = Date.now()) {
  if (world.status === "closed" || player.ended) throw new Error("This market session has ended.");
  if (world.status !== "live") throw new Error("The market is not open yet.");
  if (player.paused || !player.included || world.controls.paused) throw new Error("Trading is paused for this participant.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) throw new Error("Enter a whole-share quantity between 1 and 100,000.");
  const stock = world.stocks.find(s => s.symbol === symbol);
  if (!stock) throw new Error("That company is no longer available.");
  const px = stock.price, notional = quantity * px;
  let realized = 0, note: string | undefined;
  if (action === "Buy") {
    const short = player.shorts[symbol];
    const covered = Math.min(quantity, short?.qty ?? 0);
    const newLong = quantity - covered;
    const coverRealized = covered && short ? (short.avg - px) * covered : 0;
    const requiredCash = newLong * px - coverRealized;
    const available = freeCash(player);
    if (newLong && available + 1e-6 < requiredCash) throw new Error("Not enough cash available for this buy and short cover.");
    if (covered && short) {
      realized += coverRealized;
      short.qty -= covered;
      if (!short.qty) delete player.shorts[symbol];
      note = newLong ? `Covered ${covered} short shares, then bought ${newLong} long shares.` : `Covered ${covered} short shares.`;
    }
    if (newLong) {
      const old = player.holdings[symbol] ?? { qty: 0, avg: 0 };
      player.holdings[symbol] = { qty: old.qty + newLong, avg: (old.qty * old.avg + newLong * px) / (old.qty + newLong) };
    }
    player.cash = available - newLong * px + coverRealized;
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
    world.stocks = makeStocks(world.batch);
    world.news = makeNews(world.batch); world.headlines = []; world.latestNewsId = null; world.latestNewsIds = []; world.controls.activeNews = 0;
    world.status = "countdown"; world.controls.paused = false; world.remaining = world.duration; world.tick = 0;
    if (world.mode === "test") { world.testRulesVersion = 2; world.controls.majorAuto = 1; world.controls.minorAuto = 2; world.controls.newsEnabled = true; }
    world.startedAt = at + 3000; world.lastTickAt = at; world.newsNextAt = world.startedAt + world.controls.newsSpacing * 1000;
    world.scheduledNews = []; world.scheduledInterventions = [];
    for (const player of Object.values(world.sessions)) if (player.included) {
      const next = newPlayer(player.id, world.batch, at, true, player.terminalNumber); world.sessions[player.id] = next;
    }
  } else if (action === "pause") { world.controls.paused = true; world.lastTickAt = at; }
  else if (action === "resume") { world.controls.paused = false; world.lastTickAt = at; }
  else if (action === "end") endWorld(world, at);
  else if (action === "reset") { world.status = "ready"; world.controls.paused = true; world.remaining = world.duration; world.sessions = {}; world.stocks = makeStocks(world.batch + Date.now()); world.news = makeNews(world.batch); world.headlines = []; world.scheduledNews = []; world.scheduledInterventions = []; world.latestNewsId = null; world.latestNewsIds = []; world.controls.activeNews = 0; world.lastTickAt = at; }
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
  } else if (action === "headline") {
    const indices = Array.isArray(payload.indices) ? [...new Set(payload.indices.map(Number))] : [Number(payload.index)];
    const delay = clamp(Number(payload.delay) || 0, 0, 300);
    if (!indices.length || indices.some(idx => !Number.isInteger(idx) || idx < 0 || idx >= world.news.length)) throw new Error("Choose one or more valid news presets first.");
    if (delay) world.scheduledNews.push(...indices.map(index => ({ at: at + delay * 1000, index })));
    else {
      indices.forEach(index => pushHeadline(world, index, at));
      world.latestNewsIds = world.headlines.slice(0, indices.length).map(news => news.id);
    }
  } else if (action === "intervene") {
    const sector = String(payload.sector ?? "ALL"), direction = payload.direction === "down" ? -1 : 1;
    const magnitude = clamp(Number(payload.magnitude) || 1, .1, 5) / 100;
    const targets = world.stocks.filter(s => sector === "ALL" || s.sector === sector || s.symbol === sector);
    if (!targets.length) throw new Error("Choose a valid stock or sector.");
    const delay = clamp(Number(payload.delay) || 0, 0, 300) * 1000;
    if (delay) world.scheduledInterventions.push({ at: at + delay, sector, direction, magnitude });
    else targets.forEach((s, i) => applyMove(world, s, direction * magnitude * (.8 + rand(world.tick + i) * .4), 25_000, at));
  } else if (action === "participant") {
    const ids = Array.isArray(payload.ids) ? payload.ids.map(String) : [String(payload.id ?? "")];
    const participants = ids.map(id => world.sessions[id]).filter((p): p is Player => Boolean(p));
    if (!participants.length) throw new Error("Participant session not found.");
    if (payload.command === "pause") participants.forEach(p => { p.paused = typeof payload.value === "boolean" ? payload.value : !p.paused; });
    else if (payload.command === "include") participants.forEach(p => { p.included = Boolean(payload.value); });
    else if (payload.command === "end") participants.forEach(p => settle(world, p, at));
    else if (payload.command === "reset") participants.forEach(p => { world.sessions[p.id] = newPlayer(p.id, world.batch, at, p.included, p.terminalNumber); });
  }
  world.version++;
  return world;
}

export function newPlayer(sessionId: string, batch: number, at = Date.now(), included = true, terminalNumber?: number): Player {
  return { id: sessionId, batch, terminalNumber, initialCash: START_CASH, cash: START_CASH, accountingVersion: 2, holdings: {}, shorts: {}, history: [], joinedAt: at, lastSeenAt: at, ended: false, paused: false, included };
}

export function toPublic(world: World, sessionId?: string | null, selectedStock = "RELIANCE", options: { includeCandles?: boolean; candlesSince?: number } = {}): PublicWorld {
  const { sessions, hostNotes: _hostNotes, version: _version, testRulesVersion: _testRulesVersion, ...rest } = world;
  const { activeNews: _activeNews, ...publicControls } = world.controls;
  const base = world.stocks.reduce((sum, s) => sum + s.weight * s.previousClose, 0);
  const value = indexValue(world);
  return { ...rest, controls: publicControls, headlines: world.headlines.map(({ direction: _direction, severity: _severity, ...news }) => news), revision: world.version, news: [], scheduledInterventions: [], scheduledNews: [], stocks: world.stocks.map(stock => {
    const { newsBias: _newsBias, ...publicStock } = stock;
    const fullCandles = stock.candles.slice(-600);
    const since = options.candlesSince;
    const canSendDelta = typeof since === "number" && Number.isFinite(since) && fullCandles.length > 0 && since >= fullCandles[0].time && since <= fullCandles.at(-1)!.time;
    const candles = options.includeCandles === false ? [] : canSendDelta ? fullCandles.filter(bar => bar.time >= since) : fullCandles;
    return { ...publicStock, trend: stock.candles.slice(-18).map(bar => bar.close), candles: stock.symbol === selectedStock ? candles : [] };
  }), player: sessionId ? sessions[sessionId] ?? null : null, index: value, indexChange: base ? ((value - 10_000) / 10_000) * 100 : 0, participants: Object.values(sessions).filter(p => p.included && !p.ended).length };
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
