import { INDEX_WEIGHTS } from "./catalog";
import { TERMINAL_ACTIVE_WINDOW_MS } from "./terminals";
import type { AutonomousNewsLogEntry, AutonomousNewsReading, News, World } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const scopeOf = (news: Pick<News, "scope" | "symbols" | "sector">) => news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
const storyKey = (news: Pick<News, "headline" | "scope" | "symbols" | "sector">) => `${scopeOf(news)}|${news.sector}|${news.symbols?.join(",") ?? ""}|${news.headline}`;

export function newAutonomousNewsState(enabled = false) {
  return {
    enabled,
    nextAt: 0,
    nextIndices: [] as number[],
    nextSetSize: 3 as 2 | 3,
    nextIntervalSeconds: 75,
    nextReason: enabled ? "Waiting for the first live market reading." : "Stopped. The host can start autonomous news from the host console.",
    reading: { indexChange: 0, recentVolatility: 0, activeTerminals: 0, recentTrades: 0, unresolvedNewsSeconds: 0 },
    history: [] as AutonomousNewsLogEntry[],
    decisions: 0,
  };
}

export function readAutonomousNewsSignals(world: World, at: number): AutonomousNewsReading {
  const index = 10_000 * Object.entries(INDEX_WEIGHTS).reduce((sum, [symbol, weight]) => {
    const stock = world.stocks.find(item => item.symbol === symbol);
    return sum + weight * (stock ? stock.price / stock.previousClose : 1);
  }, 0);
  const indexChange = (index / 10_000 - 1) * 100;
  const activeByTerminal = new Map<number, number>();
  const recentTrades = Object.values(world.sessions).flatMap(player => {
    const live = player.batch === world.batch && player.included && !player.ended && at - (player.lastSeenAt ?? player.joinedAt) < TERMINAL_ACTIVE_WINDOW_MS;
    if (live && player.terminalNumber) activeByTerminal.set(player.terminalNumber, at);
    return live ? player.history.filter(trade => trade.time >= at - 45_000 && trade.time <= at && trade.side !== "Auto-cover" && trade.side !== "Auto-sell") : [];
  }).length;
  const moves = world.stocks.flatMap(stock => {
    const bars = stock.candles.slice(-7);
    return bars.slice(1).flatMap((bar, index) => {
      const prior = bars[index]?.close;
      return prior ? [Math.abs((bar.close / prior - 1) * 100)] : [];
    });
  }).sort((a, b) => a - b);
  const recentVolatility = moves.length ? moves[Math.floor(moves.length * .75)] : 0;
  const strongestBias = Math.max(0, ...world.stocks.map(stock => Math.abs(stock.newsBias ?? 0)));
  const decay = Math.pow(.94, 1 / 1.25);
  const driftSeconds = strongestBias <= .00008 ? 0 : Math.ceil(Math.log(.00008 / strongestBias) / Math.log(decay));
  const reactionSeconds = Math.max(0, ...world.stocks.flatMap(stock => (stock.newsMoves ?? []).map(move => move.duration - move.elapsed)));
  const unresolvedNewsSeconds = world.status === "live" ? Math.max(0, Math.min(Math.max(driftSeconds, reactionSeconds), world.remaining)) : 0;
  return { indexChange, recentVolatility, activeTerminals: activeByTerminal.size, recentTrades, unresolvedNewsSeconds };
}

export function chooseAutonomousNewsPlan(world: World, at: number, baseIntervalSeconds = 75, opening = false) {
  const reading = readAutonomousNewsSignals(world, at);
  const activeMarket = reading.unresolvedNewsSeconds > 20 || reading.recentVolatility >= .28 || Math.abs(reading.indexChange) >= .85;
  const activeCrowd = reading.activeTerminals >= 4 && reading.recentTrades >= 6;
  const quiet = reading.recentTrades < 2 && reading.recentVolatility < .12 && Math.abs(reading.indexChange) < .18;
  const base = clamp(Math.round(baseIntervalSeconds), 50, 90);
  const intervalSeconds = opening ? base : activeMarket
    ? clamp(Math.max(base, 85 + (reading.unresolvedNewsSeconds > 35 ? 5 : 0)), 50, 90)
    : quiet ? clamp(Math.min(base, 50), 50, 90)
      : activeCrowd ? clamp(base - 10, 50, 90)
        : base;
  const setSize: 2 | 3 = activeMarket || activeCrowd || reading.activeTerminals >= 7 ? 2 : 3;

  const publishedKeys = new Set(world.headlines.map(storyKey));
  const recentlyPublishedKeys = new Set(world.headlines.slice(0, 12).map(storyKey));
  const freshStories = world.news.map((news, index) => ({ news, index })).filter(item => !publishedKeys.has(storyKey(item.news)));
  const tradeSymbolScores = new Map<string, number>();
  const tradeSectorScores = new Map<string, number>();
  for (const player of Object.values(world.sessions)) {
    if (player.batch !== world.batch || !player.included || player.ended || at - (player.lastSeenAt ?? player.joinedAt) >= TERMINAL_ACTIVE_WINDOW_MS) continue;
    for (const trade of player.history) {
      if (trade.time < at - 120_000 || trade.time > at || trade.side === "Auto-cover" || trade.side === "Auto-sell") continue;
      const weight = trade.time >= at - 45_000 ? 1.4 : .65;
      tradeSymbolScores.set(trade.symbol, (tradeSymbolScores.get(trade.symbol) ?? 0) + weight);
      const sector = world.stocks.find(stock => stock.symbol === trade.symbol)?.sector;
      if (sector) tradeSectorScores.set(sector, (tradeSectorScores.get(sector) ?? 0) + weight);
    }
  }
  const marketDirection = Math.sign(reading.indexChange);
  const recentDirectionCount = world.headlines.slice(0, 5).reduce((sum, news) => sum + Math.sign(news.direction), 0);
  const scoreStory = (item: { news: News; index: number }) => {
    const scope = scopeOf(item.news);
    let score = 0;
    if (marketDirection && item.news.direction !== marketDirection) score += .65;
    if (recentDirectionCount >= 2 && item.news.direction < 0) score += .25;
    if (recentDirectionCount <= -2 && item.news.direction > 0) score += .25;
    if (scope === "stock") score += Math.min(2.1, (tradeSymbolScores.get(item.news.symbols?.[0] ?? "") ?? 0) * .8);
    if (scope === "sector") score += Math.min(1.5, (tradeSectorScores.get(item.news.sector) ?? 0) * .55);
    if (item.news.type === "minor" && world.headlines.slice(0, 3).every(headline => headline.type === "major")) score += .18;
    if (item.news.type === "major" && world.headlines.slice(0, 3).every(headline => headline.type === "minor")) score += .18;
    return score;
  };
  const byScope = (scope: "economy" | "sector" | "stock", pool = freshStories) => pool
    .filter(item => scopeOf(item.news) === scope)
    .map(item => ({ ...item, score: scoreStory(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const desiredScopes: ("economy" | "sector" | "stock")[] = setSize === 3
    ? ["economy", "sector", "stock"]
    : reading.recentTrades > 0 ? ["sector", "stock"] : ["economy", "sector"];
  const scopeOrder = ["economy", "sector", "stock"] as const;
  let scopes = desiredScopes.filter(scope => byScope(scope).length > 0);
  for (const scope of scopeOrder) if (scopes.length < setSize && !scopes.includes(scope) && byScope(scope).length) scopes.push(scope);
  // If a category runs out during a long round, use the fullest remaining
  // category for the remaining slot instead of failing to make a 2/3-story set.
  const reusableStories = world.news.map((news, index) => ({ news, index }))
    .filter(item => !recentlyPublishedKeys.has(storyKey(item.news)));
  while (scopes.length < setSize) {
    const pool = freshStories.length >= 2 ? freshStories : reusableStories;
    const next = scopeOrder.map(scope => ({ scope, available: byScope(scope, pool).length }))
      .sort((a, b) => b.available - a.available || scopeOrder.indexOf(a.scope) - scopeOrder.indexOf(b.scope))[0];
    if (!next?.available) break;
    scopes.push(next.scope);
  }
  if (scopes.length < 2) {
    const fallback = world.news.map((news, index) => ({ news, index, score: scoreStory({ news, index }) }))
      .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 2);
    scopes = fallback.map(item => scopeOf(item.news));
  }
  const pool = freshStories.length >= setSize ? freshStories : reusableStories;
  const options = scopes.map(scope => byScope(scope, pool));
  const picks: { index: number; score: number; direction: number; type: News["type"] }[][] = [];
  const build = (depth: number, selected: { index: number; score: number; direction: number; type: News["type"] }[]) => {
    if (depth === options.length) { picks.push(selected); return; }
    for (const item of options[depth].slice(0, 14)) {
      if (selected.some(existing => existing.index === item.index)) continue;
      build(depth + 1, [...selected, { index: item.index, score: item.score, direction: item.news.direction, type: item.news.type }]);
    }
  };
  build(0, []);
  const best = picks.map(items => {
    const directions = new Set(items.map(item => item.direction));
    const majors = new Set(items.map(item => item.type)).size;
    const balance = directions.size > 1 ? .55 : -.35;
    const typeVariety = majors > 1 ? .15 : 0;
    return { items, score: items.reduce((sum, item) => sum + item.score, 0) + balance + typeVariety };
  }).sort((a, b) => b.score - a.score || a.items[0].index - b.items[0].index)[0]?.items ?? [];
  const indices = best.map(item => item.index);
  if (indices.length < 2) {
    const fallback = [...freshStories, ...reusableStories].filter(item => !indices.includes(item.index)).slice(0, 2 - indices.length).map(item => item.index);
    indices.push(...fallback);
  }
  const finalSize: 2 | 3 = indices.length >= 3 && setSize === 3 ? 3 : 2;
  const tempo = intervalSeconds === 50 ? "Prices and trading have been quiet, so I’m shortening the gap to keep the round moving."
    : intervalSeconds >= 85 ? "The market is active or earlier news is still moving prices, so I’m giving those reactions room to play out."
      : intervalSeconds < base ? "Several terminals are trading actively, so I’m keeping news lively without crowding the market."
        : "The market is balanced, so I’m keeping the news near its usual pace.";
  const coverage = [...new Set(indices.map(index => scopeOf(world.news[index])))].join(", ");
  const reason = `${tempo} I selected ${finalSize} stories across ${coverage}.`;
  return { indices: indices.slice(0, finalSize), setSize: finalSize, intervalSeconds, reason, reading };
}
