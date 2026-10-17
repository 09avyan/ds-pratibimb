import { INDEX_WEIGHTS, makeNews, makeStocks, NEWS_CATALOG_VERSION } from "./catalog";
import { chooseAutonomousNewsPlan, newAutonomousNewsState, readAutonomousNewsSignals } from "./autonomous-news";
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
const PREVIOUS_NEWS_IMPACT_DECAY = .94;
const NEWS_IMPACT_DURATION_MULTIPLIER = 1.25;
export const NEWS_REACTION_SECONDS = 24;
export const NEWS_EFFECT_MIN_SECONDS = 50;
export const NEWS_EFFECT_MAX_SECONDS = 90;
const NEWS_IMPACT_FADE_THRESHOLD = .00008;
const NEWS_IMPACT_DECAY = Math.pow(PREVIOUS_NEWS_IMPACT_DECAY, 1 / NEWS_IMPACT_DURATION_MULTIPLIER);
// The lower decay multiplier keeps the same total drift inside a 50–90 second window.
const NEWS_IMPACT_DRIFT_NORMALIZER = (1 - NEWS_IMPACT_DECAY) / (1 - PREVIOUS_NEWS_IMPACT_DECAY);
const NEWS_SETTINGS_VERSION = 2;
export function newsImpactRange(news: Pick<News, "type" | "severity">) {
  const expected = news.severity * NEWS_IMPACT_SCALE[news.type];
  return { low: expected * (1 - NEWS_IMPACT_VARIATION), high: expected * (1 + NEWS_IMPACT_VARIATION) };
}

export function newsImpactRemainingSeconds(world: Pick<World, "stocks" | "controls" | "remaining" | "status">) {
  if (world.status !== "live") return 0;
  const strongestSignal = Math.max(0, ...world.stocks.map(stock => Math.abs(stock.newsBias ?? 0)));
  const driftSeconds = strongestSignal <= NEWS_IMPACT_FADE_THRESHOLD ? 0 : Math.ceil(Math.log(NEWS_IMPACT_FADE_THRESHOLD / strongestSignal) / Math.log(NEWS_IMPACT_DECAY));
  const reactionSeconds = Math.max(0, ...world.stocks.flatMap(stock => (stock.newsMoves ?? []).map(move => move.duration - move.elapsed)));
  return Math.max(0, Math.min(Math.max(driftSeconds, reactionSeconds), world.remaining));
}

// Smoothstep gives a small opening reaction, a stronger middle and a gentle finish.
const reactionProgress = (elapsed: number, duration: number) => { const t = clamp(elapsed / duration, 0, 1); return t * t * (3 - 2 * t); };
export function advanceNewsReaction(stock: World["stocks"][number], seconds: number) {
  let logReturn = 0;
  stock.newsMoves = (stock.newsMoves ?? []).filter(move => {
    const next = Math.min(move.duration, move.elapsed + seconds);
    logReturn += move.logReturn * (reactionProgress(next, move.duration) - reactionProgress(move.elapsed, move.duration));
    move.elapsed = next;
    return next < move.duration;
  });
  return Math.expm1(logReturn);
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

function keepAutonomousHistory(world: World, entry: NonNullable<World["autonomousNews"]>["history"][number]) {
  const auto = world.autonomousNews ?? (world.autonomousNews = newAutonomousNewsState());
  auto.history = [entry, ...auto.history].slice(0, 200);
}

function planAutonomousNews(world: World, at: number, opening = false) {
  const auto = world.autonomousNews ?? (world.autonomousNews = newAutonomousNewsState());
  const plan = chooseAutonomousNewsPlan(world, at, world.controls.newsSpacing, opening);
  auto.nextIndices = plan.indices;
  auto.nextSetSize = plan.setSize;
  auto.nextIntervalSeconds = plan.intervalSeconds;
  auto.nextReason = plan.reason;
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
  const indices = [...new Set(auto.nextIndices)].filter(index => Number.isInteger(index) && index >= 0 && index < world.news.length);
  if (indices.length < 2 || indices.length > 3) {
    planAutonomousNews(world, at, true);
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
    world.controls.newsSpacing = clamp(world.controls.newsSpacing, NEWS_EFFECT_MIN_SECONDS, NEWS_EFFECT_MAX_SECONDS);
    world.newsSettingsVersion = NEWS_SETTINGS_VERSION;
    world.version++;
  }
  if (world.marketRulesVersion !== MARKET_RULES_VERSION) {
    world.controls.volatility = clamp(Math.round(world.controls.volatility * .85 * 10) / 10, MIN_VOLATILITY, MAX_VOLATILITY);
    world.marketRulesVersion = MARKET_RULES_VERSION;
    world.version++;
  }
  if (world.newsCatalogVersion !== NEWS_CATALOG_VERSION) {
    const ne