import { INDEX_WEIGHTS, makeNews, makeStocks, NEWS_CATALOG_VERSION } from "./catalog";
import { chooseAutonomousNewsPlan, newAutonomousNewsState, readAutonomousNewsSignals } from "./autonomous-news";
import { NEWS_REACTION_SECONDS, NEWS_EFFECT_MIN_SECONDS, NEWS_EFFECT_MAX_SECONDS, NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS, NEWS_AUTO_MAX_INTERVAL_SECONDS, NEWS_IMPACT_DECAY, NEWS_IMPACT_FADE_THRESHOLD, NEWS_IMPACT_DRIFT_NORMALIZER } from "./news-timing";
export { NEWS_REACTION_SECONDS, NEWS_EFFECT_MIN_SECONDS, NEWS_EFFECT_MAX_SECONDS } from "./news-timing";
import { recordGameLog, recentOrderDifficulty } from "./logs";
import { validateNewsSelection } from "./news-rules";
import type { Mode, News, Player, PublicWorld, Trade, World } from "./types";
import { TERMINAL_ACTIVE_WINDOW_MS, TERMINAL_COUNT } from "./terminals";
export { TERMINAL_ACTIVE_WINDOW_MS } from "./terminals";

export const START_CASH = 1_000_000;
export const VIRTUAL_BOT_COUNT = 128;
const MARKET_RULES_VERSION = 1;
const MIN_VOLATILITY = 12.8;
const MAX_VOLATILITY = 85;
const BOT_PERSONALITIES = [
  { name: "Trend Rider", momentum: 1.45, reversion: .32, news: .55, flow: .75, noise: .00013 },
  { name: "Value Hunter", momentum: .34, reversion: 1.55, news: .35, flow: .9, noise: .0001 },
  { name: "News Chaser", momentum: .72, reversion: .45, news: 1.45, flow: .55, noise: .0002 },
  { name: "Contrarian", momentum: .25, reversion: 1.22, news: -.48, flow: 1.4, noise: .00012 },
  { name: "Breakout Scout", momentum: 1.72, reversion: .18, news: .7, flow: .4, noise: .0002 },
  { name: "Steady Hand", momentum: .65, reversion: .72, news: .5, flow: .65, noise: .000035 },
  { name: "Quick Scalper", momentum: .7, reversion: .8, news: .3, flow: 1.1, noise: .00028 },
  { name: "Sector Surfer", momentum: 1.05, reversion: .45, news: .82, flow: .65, noise: .00011 },
  { name: "Dip Buyer", momentum: .2, reversion: 1.45, news: .4, flow: 1.22, noise: .0001 },
  { name: "Risk Taker", momentum: 1.22, reversion: .35, news: 1.08, flow: .8, noise: .0003 },
  { name: "Patient Planner", momentum: .72, reversion: .9, news: .72, flow: .5, noise: .000025 },
  { name: "Herd Follower", momentum: 1.3, reversion: .22, news: 1.05, flow: .45, noise: .00018 },
  { name: "Swing Trader", momentum: 1.05, reversion: .88, news: .52, flow: .55, noise: .0001 },
  { name: "Cautious Closer", momentum: .45, reversion: 1.05, news: .3, flow: 1.35, noise: .000045 },
  { name: "Opportunity Seeker", momentum: .92, reversion: .62, news: .88, flow: .95, noise: .00016 },
  { name: "Market Maker", momentum: .28, reversion: .92, news: .18, flow: 1.65, noise: .00008 },
] as const;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const textSeed = (text: string) => [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % 1_000_003;
const id = () => crypto.randomUUID();
const newsScope = (news: Pick<News, "scope" | "symbols" | "sector">): NonNullable<News["scope"]> => news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
const NEWS_IMPACT_SCALE: Record<News["type"], number> = { major: 3.8, minor: 3.5 };
const NEWS_IMPACT_VARIATION = .1;
const NEWS_SETTINGS_VERSION = 2;
export function newsImpactRange(news: Pick<News, "type" | "severity">) {
  const expected = news.severity * NEWS_IMPACT_SCALE[news.type];
  return { low: expected * (1 - NEWS_IMPACT_VARIATION), high: expected * (1 + NEWS_IMPACT_VARIATION) };
}

export function newsImpactRemainingSeconds(world: Pick<World, "stocks" | "controls" | "remaining" | "status">) {
  if (world.status !== "live") return 0;
  const reactionSeconds = Math.max(0, ...world.stocks.flatMap(stock => (stock.newsMoves ?? []).map(move => move.duration - move.elapsed)));
  const clockSeconds = Math.max(0, ...world.stocks.map(stock => stock.newsBiasClock ? stock.newsBiasClock.duration - stock.newsBiasClock.elapsed : 0));
  const unclocked = world.stocks.filter(stock => !stock.newsBiasClock);
  const unclockedSignal = Math.max(0, ...unclocked.map(stock => Math.abs(stock.newsBias ?? 0)));
  const unclockedSeconds = unclockedSignal <= NEWS_IMPACT_FADE_THRESHOLD ? 0 : Math.ceil(Math.log(NEWS_IMPACT_FADE_THRESHOLD / unclockedSignal) / Math.log(NEWS_IMPACT_DECAY));
  return Math.max(0, Math.min(Math.max(clockSeconds, unclockedSeconds, reactionSeconds), world.remaining));
}

// Smoothstep gives a small opening reaction, a stronger middle and a gentle finish.
const reactionProgress = (elapsed: number, duration: number, seed = 0) => {
  const t = clamp(elapsed / duration, 0, 1);
  // A small, smooth retracement sits inside the same endpoint. Telescoping
  // progress differences preserve the exact target at the end of the reaction.
  const waves = 6 + (seed % 5) * .2;
  return t ** 3 * (4 - 3 * t) + .11 * Math.sin(waves * Math.PI * t) * Math.sin(Math.PI * t) ** 2 * Math.min(1, t * 2);
};
export function advanceNewsReaction(stock: World["stocks"][number], seconds: number) {
  let logReturn = 0;
  stock.newsMoves = (stock.newsMoves ?? []).filter(move => {
    const next = Math.min(move.duration, move.elapsed + seconds);
    logReturn += move.logReturn * (reactionProgress(next, move.duration, textSeed(stock.symbol)) - reactionProgress(move.elapsed, move.duration, textSeed(stock.symbol)));
    move.elapsed = next;
    return next < move.duration;
  });
  return Math.expm1(logReturn);
}

export function advanceNewsDrift(stock: World["stocks"][number], seconds: number) {
  const bias = stock.newsBias ?? 0;
  if (!bias) { delete stock.newsBiasClock; return 0; }
  const clock = stock.newsBiasClock;
  // Ease the follow-through in after the opening reaction. Its virtual clock
  // catches up at exactly the original stretched endpoint, conserving drift.
  const next = clock ? Math.min(clock.duration, clock.elapsed + seconds) : 0;
  const virtualSeconds = clock ? clock.duration * ((next / clock.duration) ** 3 - (clock.elapsed / clock.duration) ** 3) : seconds;
  const decay = NEWS_IMPACT_DECAY ** virtualSeconds;
  const drift = bias * NEWS_IMPACT_DRIFT_NORMALIZER * (1 - decay) / (1 - NEWS_IMPACT_DECAY);
  stock.newsBias = bias * decay;
  if (clock) clock.elapsed = next;
  if (Math.abs(stock.newsBias) < NEWS_IMPACT_FADE_THRESHOLD || clock && next >= clock.duration) { stock.newsBias = 0; delete stock.newsBiasClock; }
  return drift;
}

function projectedNewsPrice(stock: World["stocks"][number], fromMove: number) {
  const logReturn = (stock.newsMoves ?? []).slice(fromMove).reduce((sum, move) => sum + move.logReturn, 0);
  return round2(clamp(stock.price * Math.exp(logReturn), stock.previousClose * .68, stock.previousClose * 1.32));
}

export function freshWorld(mode: Mode, now = Date.now(), batch = 1): World {
  const test = mode === "test";
  const stocks = makeStocks(batch);
  const startedAt = test ? now + 3000 : 0;
  return {
    mode, batch: test ? batch : 0, status: test ? "countdown" : "ready", duration: 6 * 60, remaining: 6 * 60,
    startedAt, lastTickAt: now, tick: 0, testRulesVersion: test ? 2 : undefined,
    controls: { scenario: "Sideways", volatility: 48 * .85, bots: 58, tickRate: 1, marketBias: 50, paused: false, majorAuto: 1, minorAuto: 2, newsSpacing: 75, newsEnabled: test, activeNews: 0 },
    stocks, news: makeNews(test ? batch : 1), newsCatalogVersion: NEWS_CATALOG_VERSION, marketRulesVersion: MARKET_RULES_VERSION, newsSettingsVersion: NEWS_SETTINGS_VERSION, autonomousNews: newAutonomousNewsState(), headlines: [], sessions: {}, hostNotes: [], latestNewsId: null, latestNewsIds: [], newsNextAt: test ? startedAt + 75_000 : now + 75_000, error: null, version: 1, scheduledInterventions: [], scheduledNews: [],
  };
}

function shiftAutonomousClock(world: World, milliseconds: number) {
  const auto = world.autonomousNews;
  if (!auto?.enabled || !auto.nextAt || milliseconds <= 0) return;
  auto.plannedAt = (auto.plannedAt ?? auto.nextAt - auto.nextIntervalSeconds * 1000) + milliseconds;
  auto.nextAt += milliseconds;
  if (auto.lastReviewedAt) auto.lastReviewedAt += milliseconds;
  if (auto.marketTuning) { auto.marketTuning.observingSince += milliseconds; auto.marketTuning.lastChangedAt += milliseconds; }
  world.newsNextAt = auto.nextAt;
}

function keepAutonomousHistory(world: World, entry: NonNullable<World["autonomousNews"]>["history"][number]) {
  const auto = world.autonomousNews ?? (world.autonomousNews = newAutonomousNewsState());
  auto.history = [entry, ...auto.history].slice(0, 200);
  recordGameLog(world, { at: entry.at, kind: entry.kind === "settings-adjusted" ? "settings" : "brain", message: `${entry.kind}: ${entry.reason}`, data: { indices: entry.indices.join(","), intervalSeconds: entry.intervalSeconds } });
}

function restoreBrainSettings(world: World, at: number) {
  const tuning = world.autonomousNews?.marketTuning;
  if (!tuning) return;
  const changed = world.controls.volatility !== tuning.volatility || world.controls.bots !== tuning.bots;
  world.controls.volatility = tuning.volatility; world.controls.bots = tuning.bots;
  delete world.autonomousNews!.marketTuning;
  if (changed) keepAutonomousHistory(world, { at, kind: "settings-adjusted", indices: [], intervalSeconds: world.autonomousNews!.nextIntervalSeconds, reason: `Restored host settings: volatility ${tuning.volatility}, bot activity ${tuning.bots}.` });
}

function adaptBrainSettings(world: World, at: number) {
  const auto = world.autonomousNews;
  if (!auto?.enabled || world.status !== "live" || world.controls.paused) return;
  const tuning = auto.marketTuning ?? (auto.marketTuning = { volatility: world.controls.volatility, bots: world.controls.bots, observingSince: at, lastChangedAt: at, reason: "Observing before adjusting market difficulty." });
  if (at - tuning.observingSince < 45_000 || at - tuning.lastChangedAt < 30_000 || world.remaining < 40) return;
  const reading = readAutonomousNewsSignals(world, at);
  // Inactivity is a clue, never proof of confusion. Require time and active
  // terminals, and change only global difficulty, never anyone's portfolio.
  const difficulty = recentOrderDifficulty(world, at);
  const orderDifficulties = difficulty.strugglingTerminals >= Math.min(2, Math.max(1, reading.activeTerminals)) && difficulty.rejectedOrders >= 3;
  const exploring = reading.activeTerminals > 0 && (reading.idleCashShare ?? 0) >= .6 && (reading.engagedTerminals ?? 0) / reading.activeTerminals < .35;
  const stressed = reading.activeTerminals >= 3 && (reading.stressedShare ?? 0) >= .5;
  const turbulent = reading.recentVolatility > Math.max(.5, Math.min(1.4, tuning.volatility * .02)) || Math.abs(reading.recentIndexChange ?? 0) >= .9;
  const quiet = reading.activeTerminals > 0 && !exploring && !stressed && reading.unresolvedNewsSeconds <= 10 && reading.recentVolatility < .2 && Math.abs(reading.recentIndexChange ?? 0) < .15;
  const multiplier = exploring || orderDifficulties || stressed || turbulent ? .75 : quiet ? 1.1 : 1;
  const approach = (current: number, base: number, min: number, max: number) => {
    const target = clamp(base * multiplier, min, max);
    const step = Math.max(.1, base * .05);
    return Math.round(clamp(current + clamp(target - current, -step, step), min, max) * 10) / 10;
  };
  const volatility = approach(world.controls.volatility, tuning.volatility, MIN_VOLATILITY, MAX_VOLATILITY);
  const bots = tuning.bots === 0 ? 0 : approach(world.controls.bots, tuning.bots, 0, 100);
  tuning.lastChangedAt = at;
  if (volatility === world.controls.volatility && bots === world.controls.bots) return;
  const cause = orderDifficulties ? "Repeated unsuccessful orders suggest players need more room" : exploring ? "Several active terminals are still exploring with most cash unused" : stressed ? "Many participants have sizeable portfolio losses" : turbulent ? "Recent market moves are unsettled" : quiet ? "Players are participating but the settled market is quiet" : "The market has settled, so difficulty is returning toward the host settings";
  const before = `volatility ${world.controls.volatility} → ${volatility}, bot activity ${world.controls.bots} → ${bots}`;
  world.controls.volatility = volatility; world.controls.bots = bots;
  tuning.reason = `${cause}: ${before}.`;
  keepAutonomousHistory(world, { at, kind: "settings-adjusted", indices: [], intervalSeconds: auto.nextIntervalSeconds, reason: tuning.reason });
}

function planAutonomousNews(world: World, at: number, opening = false) {
  const auto = world.autonomousNews ?? (world.autonomousNews = newAutonomousNewsState());
  auto.marketTuning ??= { volatility: world.controls.volatility, bots: world.controls.bots, observingSince: at, lastChangedAt: at, reason: "Observing before adjusting market difficulty." };
  const plan = chooseAutonomousNewsPlan(world, at, world.controls.newsSpacing, opening);
  auto.plannedAt = at;
  auto.lastReviewedAt = at;
  auto.hostOverride = false;
  auto.nextIndices = plan.indices;
  auto.nextSetSize = plan.setSize;
  auto.nextIntervalSeconds = plan.intervalSeconds;
  auto.nextReason = plan.reason;
  auto.strategy = plan.strategy;
  auto.introductoryStage = plan.introductoryStage;
  auto.reading = plan.reading;
  auto.nextAt = at + plan.intervalSeconds * 1000;
  auto.decisions++;
  world.newsNextAt = auto.nextAt;
  keepAutonomousHistory(world, { at, kind: "planned", indices: [...plan.indices], intervalSeconds: plan.intervalSeconds, reason: plan.reason });
  return auto;
}

function publishAutonomousNews(world: World, at: number, hostOverride = false) {
  const auto = world.autonomousNews;
  if (!auto || !auto.enabled || world.status !== "live") return [];
  if (!hostOverride && world.remaining < NEWS_REACTION_SECONDS + 5) {
    restoreBrainSettings(world, at);
    auto.enabled = false; auto.nextAt = 0; auto.nextIndices = [];
    auto.nextReason = "Leaving the closing seconds for final trades rather than starting an unfinished news reaction.";
    keepAutonomousHistory(world, { at, kind: "stopped", indices: [], intervalSeconds: auto.nextIntervalSeconds, reason: auto.nextReason });
    return [];
  }
  const indices = [...new Set(auto.nextIndices)].filter(index => Number.isInteger(index) && index >= 0 && index < world.news.length);
  if (indices.length < 2 || indices.length > 3) {
    restoreBrainSettings(world, at);
    auto.enabled = false; auto.nextAt = 0;
    auto.nextReason = "Fewer than two compatible, unused stories remain. Manual publishing is still available.";
    keepAutonomousHistory(world, { at, kind: "stopped", indices: [], intervalSeconds: auto.nextIntervalSeconds, reason: auto.nextReason });
    return [];
  }
  const reason = hostOverride ? "The host published the planned mix early." : auto.nextReason;
  const published = pushHeadlines(world, indices, at);
  keepAutonomousHistory(world, { at, kind: hostOverride ? "host-published" : "published", indices, intervalSeconds: auto.nextIntervalSeconds, reason });
  planAutonomousNews(world, at);
  return published;
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

function scopeRank(news: Pick<News, "scope" | "symbols" | "sector">) {
  const scope = newsScope(news);
  return scope === "stock" ? 3 : scope === "sector" ? 2 : 1;
}

function pushHeadlines(world: World, presetIndices: number[], at = Date.now()) {
  const presets = world.news;
  const indices = presetIndices.filter(index => Number.isInteger(index) && index >= 0 && index < presets.length);
  validateNewsSelection(indices.map(index => presets[index]), world.headlines);
  recordGameLog(world, { at, kind: "news", message: indices.map(index => presets[index].headline).join(" | "), data: { indices: indices.join(","), count: indices.length } });
  const published = indices.map(index => {
    const news = { ...presets[index], id: id(), createdAt: at };
    const range = newsImpactRange(news);
    world.headlines.unshift(news);
    return { index, news, range, rank: scopeRank(news) };
  });
  if (!published.length) return [];
  if (world.headlines.length > 80) world.headlines.splice(80);
  world.latestNewsId = published.at(-1)!.news.id;
  world.latestNewsIds = world.headlines.slice(0, published.length).map(news => news.id);

  for (const stock of world.stocks) {
    const applicable = published.flatMap(item => {
      const scope = newsScope(item.news);
      const applies = scope === "stock" ? Boolean(item.news.symbols?.includes(stock.symbol)) : scope === "economy" || item.news.sector === stock.sector;
      if (!applies) return [];
      const seed = world.tick + textSeed(stock.symbol) * 71 + item.index * 104729;
      const impact = ((item.range.low + rand(seed) * (item.range.high - item.range.low)) / 100) * item.news.direction;
      return [{ ...item, impact }];
    });
    if (!applicable.length) continue;

    const strongestRank = Math.max(...applicable.map(item => item.rank));
    // Use only the most directly targeted stories for this stock. Economy news
    // yields to its sector, and sector news yields to a stock-specific story.
    const impact = applicable.filter(item => item.rank === strongestRank).reduce((sum, item) => sum + item.impact, 0);
    const directionalDrift = Math.min(.0045, Math.max(.0011, Math.abs(impact) * .055)) * Math.sign(impact);
    const previousBias = stock.newsBias ?? 0;
    const biasDirection = Math.sign(directionalDrift || previousBias);
    stock.newsBias = biasDirection * Math.min(.0045, Math.max(Math.abs(previousBias) * .55, Math.abs(directionalDrift)));
    stock.newsBiasClock = stock.newsBias ? { elapsed: 0, duration: Math.max(1, Math.ceil(Math.log(NEWS_IMPACT_FADE_THRESHOLD / Math.abs(stock.newsBias)) / Math.log(NEWS_IMPACT_DECAY))) } : undefined;
    if (impact) {
      const target = clamp(stock.price * (1 + impact), stock.previousClose * .68, stock.previousClose * 1.32);
      stock.newsMoves = [...(stock.newsMoves ?? []), { logReturn: Math.log(target / stock.price), elapsed: 0, duration: NEWS_REACTION_SECONDS }];
    }
  }
  world.controls.activeNews = Math.max(world.controls.activeNews ?? 0, ...published.map(item => item.range.high));
  return published.map(item => item.news);
}

function pushHeadline(world: World, presetIndex?: number, at = Date.now()) {
  const index = presetIndex ?? Math.floor(rand(world.tick + world.batch * 991) * world.news.length);
  return pushHeadlines(world, [index], at)[0];
}

export type NewsImpactStock = { symbol: string; name: string; before: number; after: number; change: number; changePct: number };
export type NewsImpactPreview = { headlines: { news: World["news"][number]; stocks: NewsImpactStock[] }[]; combined: NewsImpactStock[] };

export function previewNewsImpact(world: World, presetIndices: number[]): NewsImpactPreview {
  // Publishing now queues reactions without editing candle history. Reuse the
  // history here so a large selection does not copy thousands of candles per story.
  const createPreviewWorld = (): World => ({ ...world, stocks: world.stocks.map(stock => ({ ...stock, newsMoves: stock.newsMoves?.map(move => ({ ...move })) })), controls: { ...world.controls }, headlines: [], sessions: {}, scheduledNews: [], scheduledInterventions: [] });
  const preview = createPreviewWorld();
  const headlines: NewsImpactPreview["headlines"] = [];
  const indices = [...new Set(presetIndices)].filter(index => Number.isInteger(index) && index >= 0 && index < world.news.length);
  const startingPrices = new Map(preview.stocks.map(stock => [stock.symbol, stock.price] as const));
  const existingMoveCounts = new Map(world.stocks.map(stock => [stock.symbol, stock.newsMoves?.length ?? 0]));
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= preview.news.length) continue;
    const individual = createPreviewWorld();
    pushHeadlines(individual, [index]);
    for (const stock of individual.stocks) stock.price = projectedNewsPrice(stock, existingMoveCounts.get(stock.symbol) ?? 0);
    const stocks = individual.stocks.flatMap(stock => {
      const oldPrice = startingPrices.get(stock.symbol) ?? stock.price;
      if (stock.price === oldPrice) return [];
      const change = stock.price - oldPrice;
      return [{ symbol: stock.symbol, name: stock.name, before: oldPrice, after: stock.price, change, changePct: change / oldPrice * 100 }];
    }).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    headlines.push({ news: world.news[index], stocks });
  }
  pushHeadlines(preview, indices);
  for (const stock of preview.stocks) stock.price = projectedNewsPrice(stock, existingMoveCounts.get(stock.symbol) ?? 0);
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
  if (!world.autonomousNews || !Array.isArray(world.autonomousNews.history) || !Array.isArray(world.autonomousNews.nextIndices)) {
    world.autonomousNews = newAutonomousNewsState();
    // Live mode used to publish random single headlines. Keep it quiet until
    // the host or the public /auto launcher starts the news brain.
    if (world.mode === "live") world.controls.newsEnabled = false;
    world.version++;
  }
  if (world.newsSettingsVersion !== NEWS_SETTINGS_VERSION) {
    if (world.controls.newsSpacing === 65 || !Number.isFinite(world.controls.newsSpacing)) {
      world.controls.newsSpacing = 75;
      world.newsNextAt = world.status === "countdown" ? world.startedAt + 75_000 : now + 75_000;
    }
    world.controls.newsSpacing = clamp(world.controls.newsSpacing, NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS);
    world.newsSettingsVersion = NEWS_SETTINGS_VERSION;
    world.version++;
  }
  if (world.marketRulesVersion !== MARKET_RULES_VERSION) {
    world.controls.volatility = clamp(Math.round(world.controls.volatility * .85 * 10) / 10, MIN_VOLATILITY, MAX_VOLATILITY);
    world.marketRulesVersion = MARKET_RULES_VERSION;
    world.version++;
  }
  if (world.newsCatalogVersion !== NEWS_CATALOG_VERSION) {
    const nextNews = makeNews(world.batch || 1);
    // Retain queued stories only when the exact headline still exists in the new catalog.
    world.scheduledNews = world.scheduledNews.flatMap(event => {
      const previous = world.news[event.index];
      const index = previous ? nextNews.findIndex(news => news.headline === previous.headline && newsScope(news) === newsScope(previous) && news.sector === previous.sector && news.direction === previous.direction && JSON.stringify(news.symbols ?? []) === JSON.stringify(previous.symbols ?? [])) : -1;
      return index < 0 ? [] : [{ ...event, index }];
    });
    world.news = nextNews;
    world.newsCatalogVersion = NEWS_CATALOG_VERSION;
    world.version++;
  }
  for (const player of Object.values(world.sessions)) {
    if (player.accountingVersion === 2) continue;
    player.cash -= Object.values(player.shorts).reduce((sum, position) => sum + position.qty * position.avg, 0);
    player.accountingVersion = 2;
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
    recordGameLog(world, { at: world.startedAt, kind: "batch", message: "Opening bell: trading started." });
  }
  if (world.status !== "live" || world.controls.paused) {
    if (world.status === "live" && world.controls.paused) shiftAutonomousClock(world, Math.max(0, now - world.lastTickAt));
    world.lastTickAt = now; return world;
  }
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
    for (const event of dueInterventions) recordGameLog(world, { at, kind: "market", message: `Scheduled intervention executed: ${event.sector}, ${(event.direction * event.magnitude * 100).toFixed(1)}%.` });
    for (const event of dueInterventions) for (const stock of world.stocks) {
      if (event.sector === "ALL" || stock.sector === event.sector || stock.symbol === event.sector)
        applyMove(world, stock, event.direction * event.magnitude * (.8 + rand(world.tick + stock.base) * .4), 20_000, at);
    }
    const dueNews = world.scheduledNews.filter(item => item.at <= at);
    world.scheduledNews = world.scheduledNews.filter(item => item.at > at);
    if (dueNews.length) {
      const eventsByPublishTime = new Map<number, number[]>();
      for (const event of dueNews) eventsByPublishTime.set(event.at, [...(eventsByPublishTime.get(event.at) ?? []), event.index]);
      for (const [publishTime, indices] of [...eventsByPublishTime].sort(([a], [b]) => a - b)) {
        pushHeadlines(world, indices, publishTime);
        if (world.autonomousNews?.enabled) keepAutonomousHistory(world, { at: publishTime, kind: "host-published", indices, intervalSeconds: world.autonomousNews.nextIntervalSeconds, reason: "The host’s scheduled news selection was published." });
      }
      if (world.autonomousNews?.enabled) planAutonomousNews(world, at);
    }
    const hadActiveNews = world.stocks.some(stock => stock.newsMoves?.length || stock.newsBiasClock || Math.abs(stock.newsBias ?? 0) > NEWS_IMPACT_FADE_THRESHOLD);
    const vol = world.controls.volatility / 25;
    const botParticipation = world.controls.bots === 0 ? 0 : Math.sqrt(VIRTUAL_BOT_COUNT / 128) * (world.controls.bots / 58);
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
      const tickSeconds = interval / 1000;
      const newsTrend = advanceNewsDrift(stock, tickSeconds);
      const sectorMove = (sectorPulse.get(stock.sector) ?? 0) * (rand(symbolSeed + 3) < .76 ? 1 : -.42);
      const flowSignal = -stock.flow / 10000 * .012;
      let botOrders = 0;
      let botNews = 0;
      for (let agent = 0; agent < VIRTUAL_BOT_COUNT; agent++) {
        const personality = BOT_PERSONALITIES[agent % BOT_PERSONALITIES.length];
        const agentSeed = symbolSeed + agent * 97 + 19;
        botNews += newsTrend * personality.news;
        botOrders += momentum * personality.momentum + meanRevert * personality.reversion + newsTrend * personality.news + flowSignal * personality.flow + (rand(agentSeed) - .5) * personality.noise;
      }
      botOrders = botOrders / VIRTUAL_BOT_COUNT * botParticipation;
      botNews = botNews / VIRTUAL_BOT_COUNT * botParticipation;
      const institutional = (rand(Math.floor(world.tick / 11) + textSeed(stock.symbol) * 3) - .5) * .00009 * (world.controls.bots / 50);
      // During the direct reaction, unrelated noise should not conceal a clear
      // company announcement. Keep wiggles and player flow, and leave the
      // news target and its integrated follow-through unchanged.
      const reacting = stock.newsMoves?.some(move => move.elapsed < move.duration) ?? false;
      const ambientWeight = reacting ? .15 : 1;
      const ambient = scenarioDrift + bias + sectorMove + momentum + meanRevert + noise + botOrders - botNews + institutional;
      const returnRate = clamp(ambient * ambientWeight + stock.flow / 10000 * .02 + newsTrend + botNews, -.009 * vol, .009 * vol);
      const botVolume = Math.round((300 + rand(world.tick + stock.base) * 5_800) * (VIRTUAL_BOT_COUNT / 100));
      const reactionMove = advanceNewsReaction(stock, tickSeconds);
      applyMove(world, stock, (1 + returnRate) * (1 + reactionMove) - 1, botVolume, at);
    }
    world.remaining = Math.max(0, world.remaining - interval / 1000);
    if (hadActiveNews && newsImpactRemainingSeconds(world) === 0) recordGameLog(world, { at, kind: "news", message: "Published news effects have settled; ordinary market trading continues." });
    if (Math.round((world.duration - world.remaining) * 1000) % 30_000 === 0) {
      const index = indexValue(world);
      const ordered = [...world.stocks].sort((a, b) => b.price / b.previousClose - a.price / a.previousClose);
      recordGameLog(world, { at, kind: "market", message: `Market checkpoint: Dalaal-10 ${index.toFixed(0)} (${((index / 10000 - 1) * 100).toFixed(2)}%); best ${ordered[0].symbol}, worst ${ordered.at(-1)!.symbol}.`, data: { index: round2(index), remaining: world.remaining, volatility: world.controls.volatility, bots: world.controls.bots } });
    }
    if (world.remaining <= 0) { endWorld(world, at); break; }
    if (world.controls.activeNews > 0) world.controls.activeNews = Math.max(0, world.controls.activeNews - .0025);
    adaptBrainSettings(world, at);
    if (world.autonomousNews?.enabled && !world.autonomousNews.hostOverride && at - (world.autonomousNews.lastReviewedAt ?? 0) >= 5_000) {
      const auto = world.autonomousNews;
      const plan = chooseAutonomousNewsPlan(world, at, world.controls.newsSpacing);
      const nextAt = (auto.plannedAt ?? (auto.nextAt - auto.nextIntervalSeconds * 1000)) + plan.intervalSeconds * 1000;
      const changed = auto.nextIndices.join(",") !== plan.indices.join(",") || auto.nextIntervalSeconds !== plan.intervalSeconds;
      const lastPlan = auto.history.find(entry => entry.kind === "planned");
      if (changed && at - (lastPlan?.at ?? 0) >= 10_000) keepAutonomousHistory(world, { at, kind: "planned", indices: [...plan.indices], intervalSeconds: plan.intervalSeconds, reason: `Live review: ${plan.reason}` });
      auto.lastReviewedAt = at;
      auto.reading = plan.reading;
      // Keep the original planning anchor: repeated reviews cannot postpone news forever.
      auto.nextAt = nextAt; auto.nextIndices = plan.indices; auto.nextSetSize = plan.setSize;
      auto.nextIntervalSeconds = plan.intervalSeconds; auto.nextReason = plan.reason; auto.strategy = plan.strategy; auto.introductoryStage = plan.introductoryStage;
      world.newsNextAt = nextAt;
    }
    if (world.autonomousNews?.enabled && world.autonomousNews.nextAt > 0 && at >= world.autonomousNews.nextAt) {
      publishAutonomousNews(world, at);
    } else if (world.mode === "test" && world.controls.newsEnabled && at >= world.newsNextAt) {
      const major = rand(world.tick * 2 + world.batch) < .42;
      const majorLeft = Math.max(0, world.controls.majorAuto);
      const minorLeft = Math.max(0, world.controls.minorAuto);
      if ((major && majorLeft) || (!minorLeft && majorLeft)) {
        const choice = world.news.filter(news => news.type === "major");
        if (choice.length) {
          pushHeadline(world, world.news.indexOf(choice[Math.floor(rand(world.tick) * choice.length)]), at);
          world.latestNewsIds = [world.latestNewsId!];
          world.controls.majorAuto--;
        }
      } else if (minorLeft) {
        const choice = world.news.filter(news => news.type === "minor");
        if (choice.length) {
          pushHeadline(world, world.news.indexOf(choice[Math.floor(rand(world.tick) * choice.length)]), at);
          world.latestNewsIds = [world.latestNewsId!];
          world.controls.minorAuto--;
        }
      }
      world.newsNextAt = at + world.controls.newsSpacing * 1000;
    }
  }
  world.lastTickAt = steps < due ? now : start + steps * interval;
  if (world.autonomousNews?.enabled && world.status === "live") world.autonomousNews.reading = readAutonomousNewsSignals(world, world.lastTickAt);
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
  restoreBrainSettings(world, at);
  recordGameLog(world, { at, kind: "batch", message: "Batch closed; all positions settled at final market prices." });
  world.status = "closed"; world.controls.paused = true;
  if (world.autonomousNews) {
    world.autonomousNews.enabled = false;
    world.autonomousNews.nextAt = 0;
    world.autonomousNews.nextIndices = [];
    world.autonomousNews.nextReason = "The batch ended. Start the brain again for another round.";
  }
  for (const player of Object.values(world.sessions)) settle(world, player, at);
}

export function settle(world: World, player: Player, at: number) {
  if (player.ended && !Object.keys(player.holdings).length && !Object.keys(player.shorts).length) return;
  if (player.accountingVersion !== 2) {
    player.cash -= shortBasis(player);
    player.accountingVersion = 2;
  }
  for (const [symbol, p] of Object.entries(player.shorts)) {
    const price = world.stocks.find(s => s.symbol === symbol)?.price ?? p.avg;
    const realized = (p.avg - price) * p.qty;
    player.cash += realized;
    recordGameLog(world, { at, kind: "trade", terminalNumber: player.terminalNumber, message: `Auto-covered ${p.qty} ${symbol} at ${price.toFixed(2)}.`, data: { symbol, side: "Auto-cover", quantity: p.qty, price, realized } });
    player.history.unshift({ id: id(), symbol, side: "Auto-cover", qty: p.qty, price, time: at, realized, note: "Short settled at the session close" });
  }
  for (const [symbol, p] of Object.entries(player.holdings)) {
    const price = world.stocks.find(s => s.symbol === symbol)?.price ?? p.avg;
    const realized = (price - p.avg) * p.qty;
    player.cash += price * p.qty;
    recordGameLog(world, { at, kind: "trade", terminalNumber: player.terminalNumber, message: `Auto-sold ${p.qty} ${symbol} at ${price.toFixed(2)}.`, data: { symbol, side: "Auto-sell", quantity: p.qty, price, realized } });
    player.history.unshift({ id: id(), symbol, side: "Auto-sell", qty: p.qty, price, time: at, realized, note: "Long settled at the session close" });
  }
  player.holdings = {};
  player.shorts = {};
  recordGameLog(world, { at, kind: "terminal", terminalNumber: player.terminalNumber, message: "Terminal finished; positions settled.", data: { finalPortfolio: round2(player.cash), realizedPnl: round2(player.history.reduce((sum, trade) => sum + trade.realized, 0)) } });
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
  let realized = 0, note: string | undefined, coveredQty = 0;
  if (action === "Buy") {
    const short = player.shorts[symbol];
    const covered = Math.min(quantity, short?.qty ?? 0);
    coveredQty = covered;
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
  const trade: Trade = { id: id(), symbol, side: action, qty: quantity, coveredQty, price: px, time: at, realized, note };
  player.history.unshift(trade);
  recordGameLog(world, { at, kind: "trade", terminalNumber: player.terminalNumber, message: `${action} ${quantity} ${symbol} at ${px.toFixed(2)}${coveredQty ? `; covered ${coveredQty} short shares` : ""}.`, data: { side: action, symbol, quantity, price: px, realized, cashAfter: round2(player.cash) } });
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
    if (payload.autonomous === true && world.autonomousNews) world.autonomousNews.enabled = true;
    world.batch++;
    world.stocks = makeStocks(world.batch);
    world.news = makeNews(world.batch); world.newsCatalogVersion = NEWS_CATALOG_VERSION; world.headlines = []; world.latestNewsId = null; world.latestNewsIds = []; world.controls.activeNews = 0;
    world.status = "countdown"; world.controls.paused = false; world.remaining = world.duration; world.tick = 0;
    if (world.mode === "test") { world.testRulesVersion = 2; world.controls.majorAuto = 1; world.controls.minorAuto = 2; world.controls.newsEnabled = true; }
    world.startedAt = at + 3000; world.lastTickAt = at; world.newsNextAt = world.startedAt + world.controls.newsSpacing * 1000;
    world.scheduledNews = []; world.scheduledInterventions = [];
    for (const player of Object.values(world.sessions)) {
      if (!player.included) continue;
      const lastSeenAt = player.lastSeenAt ?? player.joinedAt;
      if (at - lastSeenAt < TERMINAL_ACTIVE_WINDOW_MS) {
        const next = newPlayer(player.id, world.batch, at, true, player.terminalNumber);
        // A connected device joins the new batch with a fresh portfolio.
        // Offline records stay closed until that device checks in again.
        next.lastSeenAt = player.lastSeenAt;
        world.sessions[player.id] = next;
      } else if (!player.ended) {
        player.ended = true;
      }
    }
    if (world.autonomousNews?.enabled) {
      world.controls.newsEnabled = false;
      world.autonomousNews.history = [];
      world.autonomousNews.decisions = 0;
      world.autonomousNews.nextIndices = [];
      planAutonomousNews(world, world.startedAt, true);
    }
  } else if (action === "autonomous-start") {
    const auto = world.autonomousNews ?? (world.autonomousNews = newAutonomousNewsState());
    auto.enabled = true;
    world.controls.newsEnabled = false;
    if (world.status === "live" || world.status === "countdown") planAutonomousNews(world, world.status === "countdown" ? world.startedAt : at, true);
    else auto.nextReason = "Autonomous news is ready. Start the next batch to let the brain begin.";
    keepAutonomousHistory(world, { at, kind: "started", indices: [...auto.nextIndices], intervalSeconds: auto.nextIntervalSeconds, reason: world.status === "live" || world.status === "countdown" ? "The host started the autonomous news brain." : "The host armed the brain for the next batch." });
  } else if (action === "autonomous-stop") {
    const auto = world.autonomousNews ?? (world.autonomousNews = newAutonomousNewsState());
    restoreBrainSettings(world, at);
    auto.enabled = false; auto.nextAt = 0; auto.nextIndices = [];
    auto.nextReason = "Stopped by the host. Manual news publishing remains available.";
    keepAutonomousHistory(world, { at, kind: "stopped", indices: [], intervalSeconds: auto.nextIntervalSeconds, reason: auto.nextReason });
  } else if (action === "autonomous-plan") {
    const auto = world.autonomousNews;
    if (!auto?.enabled) throw new Error("Start autonomous news before changing its next set.");
    const indices = Array.isArray(payload.indices) ? [...new Set(payload.indices.map(Number))] : [];
    if (indices.length < 2 || indices.length > 3 || indices.some(index => !Number.isInteger(index) || index < 0 || index >= world.news.length)) throw new Error("Choose exactly two or three headlines for the next autonomous set.");
    if (indices.some(index => world.headlines.some(headline => headline.headline === world.news[index].headline))) throw new Error("That headline has already been published in this batch.");
    if (indices.some(index => world.scheduledNews.some(event => event.index === index))) throw new Error("That story is already scheduled by the host. Choose a different story.");
    validateNewsSelection(indices.map(index => world.news[index]), [...world.headlines, ...world.scheduledNews.map(event => world.news[event.index]).filter(Boolean)]);
    auto.hostOverride = true;
    auto.nextIndices = indices; auto.nextSetSize = indices.length as 2 | 3;
    auto.nextReason = "The host replaced the brain’s proposed mix with selected stories.";
    if (!auto.nextAt) { auto.nextIntervalSeconds = clamp(world.controls.newsSpacing, 50, 90); auto.nextAt = at + auto.nextIntervalSeconds * 1000; }
    auto.reading = readAutonomousNewsSignals(world, at);
    keepAutonomousHistory(world, { at, kind: "host-edited", indices, intervalSeconds: auto.nextIntervalSeconds, reason: auto.nextReason });
    world.newsNextAt = auto.nextAt;
  } else if (action === "autonomous-publish-now") {
    if (world.status !== "live") throw new Error("Start the batch before publishing an autonomous set.");
    if (!world.autonomousNews?.enabled) throw new Error("Start autonomous news before publishing its set.");
    publishAutonomousNews(world, at, true);
  } else if (action === "autonomous-skip") {
    const auto = world.autonomousNews;
    if (!auto?.enabled || auto.nextIndices.length < 2) throw new Error("There is no autonomous set to skip.");
    keepAutonomousHistory(world, { at, kind: "skipped", indices: [...auto.nextIndices], intervalSeconds: auto.nextIntervalSeconds, reason: "The host skipped the proposed set and asked the brain to choose again." });
    planAutonomousNews(world, at);
  } else if (action === "pause") { world.controls.paused = true; world.lastTickAt = at; }
  else if (action === "resume") { shiftAutonomousClock(world, Math.max(0, at - world.lastTickAt)); world.controls.paused = false; world.lastTickAt = at; }
  else if (action === "end") endWorld(world, at);
  else if (action === "reset") { restoreBrainSettings(world, at); world.status = "ready"; world.controls.paused = true; world.remaining = world.duration; world.sessions = {}; world.stocks = makeStocks(world.batch); world.news = makeNews(world.batch); world.newsCatalogVersion = NEWS_CATALOG_VERSION; world.headlines = []; world.scheduledNews = []; world.scheduledInterventions = []; world.latestNewsId = null; world.latestNewsIds = []; world.controls.activeNews = 0; world.lastTickAt = at; if (world.autonomousNews) { world.autonomousNews.enabled = false; world.autonomousNews.nextAt = 0; world.autonomousNews.nextIndices = []; world.autonomousNews.history = []; world.autonomousNews.nextReason = "Stopped after the market reset."; } }
  else if (action === "scenario") world.controls.scenario = payload.value as World["controls"]["scenario"];
  else if (action === "controls") {
    const c = world.controls;
    if (typeof payload.volatility === "number") c.volatility = clamp(payload.volatility, MIN_VOLATILITY, MAX_VOLATILITY);
    if (typeof payload.bots === "number") c.bots = clamp(payload.bots, 0, 100);
    if (payload.tickRate === .5 || payload.tickRate === 1) c.tickRate = payload.tickRate;
    if (typeof payload.marketBias === "number") c.marketBias = clamp(payload.marketBias, 0, 100);
    if (typeof payload.newsEnabled === "boolean") c.newsEnabled = payload.newsEnabled;
    if (typeof payload.majorAuto === "number") c.majorAuto = clamp(payload.majorAuto, 0, 20);
    if (typeof payload.minorAuto === "number") c.minorAuto = clamp(payload.minorAuto, 0, 20);
    if (typeof payload.newsSpacing === "number") c.newsSpacing = clamp(payload.newsSpacing, NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS);
    if (typeof payload.duration === "number" && world.status !== "live") { world.duration = clamp(payload.duration, 60, 2700); world.remaining = world.duration; }
    if (world.autonomousNews?.marketTuning && (typeof payload.volatility === "number" || typeof payload.bots === "number")) {
      const tuning = world.autonomousNews.marketTuning;
      if (typeof payload.volatility === "number") tuning.volatility = c.volatility;
      if (typeof payload.bots === "number") tuning.bots = c.bots;
      tuning.observingSince = at; tuning.lastChangedAt = at;
      tuning.reason = "The host changed market difficulty. Observing before further adjustments.";
    }
    if (typeof payload.newsSpacing === "number" && world.autonomousNews?.enabled && world.status === "live") planAutonomousNews(world, at, true);
  } else if (action === "headline") {
    const indices = Array.isArray(payload.indices) ? [...new Set(payload.indices.map(Number))] : [Number(payload.index)];
    const delay = clamp(Number(payload.delay) || 0, 0, 300);
    if (!indices.length || indices.some(idx => !Number.isInteger(idx) || idx < 0 || idx >= world.news.length)) throw new Error("Choose one or more valid news presets first.");
    validateNewsSelection(indices.map(index => world.news[index]), [...world.headlines, ...world.scheduledNews.map(event => world.news[event.index]).filter(Boolean)]);
    if (delay) world.scheduledNews.push(...indices.map(index => ({ at: at + delay * 1000, index })));
    else {
      pushHeadlines(world, indices, at);
      if (world.autonomousNews?.enabled && world.status === "live") {
        keepAutonomousHistory(world, { at, kind: "host-published", indices, intervalSeconds: world.autonomousNews.nextIntervalSeconds, reason: "The host published a manual news selection." });
        planAutonomousNews(world, at);
      }
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
  const safePayload = Object.fromEntries(Object.entries(payload).filter(([key, value]) => ["volatility", "bots", "tickRate", "marketBias", "duration", "newsSpacing", "value", "command", "sector", "magnitude", "direction", "delay"].includes(key) && ["string", "number", "boolean"].includes(typeof value))) as Record<string, string | number | boolean>;
  recordGameLog(world, { at, kind: ["start", "pause", "resume", "reset", "end"].includes(action) ? "batch" : action === "controls" ? "settings" : "host", message: `Host action: ${action}${Object.keys(safePayload).length ? ` · ${JSON.stringify(safePayload)}` : ""}`, data: { action, ...safePayload,
    ...(action === "start" ? { duration: world.duration, volatility: world.controls.volatility, bots: world.controls.bots } : {}),
    ...(Array.isArray(payload.indices) ? { newsIndices: payload.indices.map(Number).filter(Number.isInteger).join(",") } : {}),
    ...(action === "participant" ? { terminals: (Array.isArray(payload.ids) ? payload.ids : [payload.id]).map(value => world.sessions[String(value)]?.terminalNumber ?? "unknown").join(",") } : {}),
  } });
  world.version++;
  return world;
}

export function newPlayer(sessionId: string, batch: number, at = Date.now(), included = true, terminalNumber?: number): Player {
  return { id: sessionId, batch, terminalNumber, initialCash: START_CASH, cash: START_CASH, accountingVersion: 2, holdings: {}, shorts: {}, history: [], joinedAt: at, lastSeenAt: at, ended: false, paused: false, included };
}

export function toPublic(world: World, sessionId?: string | null, selectedStock = "RELIANCE", options: { includeCandles?: boolean; candlesSince?: number } = {}): PublicWorld {
  const { logs: _logs, sessions, hostNotes: _hostNotes, version: _version, testRulesVersion: _testRulesVersion, autonomousNews: _autonomousNews, ...rest } = world;
  const { activeNews: _activeNews, ...publicControls } = world.controls;
  const base = world.stocks.reduce((sum, s) => sum + s.weight * s.previousClose, 0);
  const value = indexValue(world);
  const now = Date.now();
  const terminalSummaries = world.status === "closed" ? [] : Array.from({ length: TERMINAL_COUNT }, (_, index) => {
    const terminalNumber = index + 1;
    const current = Object.values(sessions).filter(player => player.batch === world.batch && player.terminalNumber === terminalNumber && player.included && !player.ended && now - (player.lastSeenAt ?? player.joinedAt) < TERMINAL_ACTIVE_WINDOW_MS)
      .sort((a, b) => (b.lastSeenAt ?? b.joinedAt) - (a.lastSeenAt ?? a.joinedAt))[0];
    if (!current) return null;
    const totalValue = equity(world, current);
    return { terminalNumber, status: world.status !== "live" ? "ready" as const : world.controls.paused || current.paused ? "paused" as const : "live" as const, cash: current.cash, totalValue, pnl: totalValue - current.initialCash };
  }).filter((summary): summary is NonNullable<typeof summary> => summary !== null);
  const entrants = Array.from({ length: TERMINAL_COUNT }, (_, i) => Object.values(sessions)
    .filter(player => player.terminalNumber === i + 1 && player.batch === world.batch && player.included)
    .sort((a, b) => (b.lastSeenAt ?? b.joinedAt) - (a.lastSeenAt ?? a.joinedAt) || b.joinedAt - a.joinedAt)[0])
    .filter((player): player is Player => Boolean(player));
  const entrant = sessionId ? sessions[sessionId] : null;
  const eligible = entrant && entrant.included && entrant.batch === world.batch && entrants.some(player => player.id === entrant.id);
  const standing = eligible ? { rank: 1 + entrants.filter(other => equity(world, other) > equity(world, entrant) + .005).length, total: entrants.length } : null;
  return { ...rest, standing, controls: publicControls, headlines: world.headlines.map(({ direction: _direction, severity: _severity, ...news }) => news), revision: world.version, terminalSummaries, participants: terminalSummaries.length, news: [], scheduledInterventions: [], scheduledNews: [], stocks: world.stocks.map(stock => {
    const { newsBias: _newsBias, newsBiasClock: _newsBiasClock, newsMoves: _newsMoves, ...publicStock } = stock;
    const fullCandles = stock.candles.slice(-600);
    const since = options.candlesSince;
    const canSendDelta = typeof since === "number" && Number.isFinite(since) && fullCandles.length > 0 && since >= fullCandles[0].time && since <= fullCandles.at(-1)!.time;
    const candles = options.includeCandles === false ? [] : canSendDelta ? fullCandles.filter(bar => bar.time >= since) : fullCandles;
    return { ...publicStock, trend: stock.candles.slice(-18).map(bar => bar.close), candles: stock.symbol === selectedStock ? candles : [] };
  }), player: sessionId ? sessions[sessionId] ?? null : null, index: value, indexChange: base ? ((value - 10_000) / 10_000) * 100 : 0 };
}

export function performance(world: World, player: Player) {
  const value = equity(world, player), pnl = value - player.initialCash;
  const trades = player.history.filter(t => t.side !== "Auto-cover" && t.side !== "Auto-sell");
  const closedTrades = player.history.filter(t => t.side === "Sell" || t.side === "Auto-sell" || t.side === "Auto-cover" || (t.side === "Buy" && (t.coveredQty ?? (t.note?.startsWith("Covered") ? 1 : 0)) > 0));
  const manualClosedTrades = closedTrades.filter(t => t.side !== "Auto-cover" && t.side !== "Auto-sell");
  const winners = closedTrades.filter(t => t.realized > 0).length, losers = closedTrades.filter(t => t.realized < 0).length;
  const symbolsTraded = new Set(trades.map(trade => trade.symbol));
  const sectorsTraded = new Set(trades.map(trade => world.stocks.find(stock => stock.symbol === trade.symbol)?.sector).filter(Boolean));
  const manualShortCover = trades.some(trade => trade.side === "Buy" && trade.note?.includes("Covered"));
  const openedShort = trades.some(trade => trade.side === "Short");
  const earlyTrade = trades.some(trade => trade.time >= world.startedAt && trade.time - world.startedAt <= 60_000);
  const largestOrder = trades.reduce((largest, trade) => Math.max(largest, trade.qty * trade.price), 0);
  const sortedClosedTrades = [...closedTrades].sort((a, b) => b.realized - a.realized || b.time - a.time);
  const badgeChoices: [string, string, boolean][] = [
    ["First Trade", "You placed an order in this round", trades.length >= 1],
    ["Stock Explorer", "You traded at least four different companies", symbolsTraded.size >= 4],
    ["Sector Hopper", "You traded across at least three sectors", sectorsTraded.size >= 3],
    ["Green Exit", "At least one trade you closed finished in profit", manualClosedTrades.some(trade => trade.realized > 0)],
    ["Two Winners", "You closed at least two trades in profit", manualClosedTrades.filter(trade => trade.realized > 0).length >= 2],
    ["Short Seller", "You opened a short position", openedShort],
    ["Short Cover", "You chose to buy back a short position", manualShortCover],
    ["Opening Bell", "You placed an order within the first minute", earlyTrade],
    ["Big Ticket", "You placed an order worth at least ₹1,00,000", largestOrder >= 100_000],
  ];
  const badges = badgeChoices.filter(b => b[2]).map(b => ({ name: b[0], detail: b[1] }));
  const lessons = [
    trades.length === 0
      ? "No orders this round. Next time, pick a company and decide how much of your cash you want to use."
      : sectorsTraded.size >= 3
        ? `You explored ${sectorsTraded.size} sectors. A move in one industry did not define every company you traded.`
        : "You focused on a small part of the market. Comparing another sector can show how news affects different companies.",
    closedTrades.length
      ? `${winners} position close${winners === 1 ? "" : "s"} finished in profit and ${losers} at a loss, including any automatic batch settlement. Compare the size and timing of those exits.`
      : "No trade was closed for a realised result. An open position can still change in value as prices move.",
    openedShort
      ? "You tried short selling. A short can gain when its price falls, and its loss can grow when the price rises."
      : "A short position works in the opposite direction from a buy: it gains when price falls and loses when price rises.",
    trades.length >= 8
      ? `You placed ${trades.length} orders. A quick pause between moves can help you check the latest price and your available cash.`
      : "News can affect the whole market, one sector, or a single company. Check a story’s target before reacting.",
  ];
  return { value, cash: player.cash, pnl, returnPct: pnl / player.initialCash * 100, holdings: player.holdings, shorts: player.shorts, trades: player.history, tradeCount: trades.length, winners, losers, bestTrade: sortedClosedTrades[0] ?? null, worstTrade: sortedClosedTrades.at(-1) ?? null, badges, sectors: sectorsTraded.size, symbols: symbolsTraded.size, lessons };
}
