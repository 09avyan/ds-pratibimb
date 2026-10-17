import { newsContradicts } from "./news-rules";
import { INDEX_WEIGHTS } from "./catalog";
import { TERMINAL_ACTIVE_WINDOW_MS } from "./terminals";
import type { AutonomousNews, AutonomousNewsLogEntry, AutonomousNewsReading, News, World } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const scopeOf = (news: Pick<News, "scope" | "symbols" | "sector">) => news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
const storyKey = (news: Pick<News, "headline" | "scope" | "symbols" | "sector">) => `${scopeOf(news)}|${news.sector}|${news.symbols?.join(",") ?? ""}|${news.headline}`;

export function newAutonomousNewsState(enabled = false): AutonomousNews {
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
  const recentIndexChange = Object.entries(INDEX_WEIGHTS).reduce((sum, [symbol, weight]) => {
    const stock = world.stocks.find(item => item.symbol === symbol);
    const prior = stock?.candles.at(-8)?.close;
    return sum + (stock && prior ? (stock.price / prior - 1) * 100 * weight : 0);
  }, 0);
  const activeMarket = reading.unresolvedNewsSeconds > 20 || reading.recentVolatility >= .28 || Math.abs(recentIndexChange) >= .5;
  const activeCrowd = reading.activeTerminals >= 4 && reading.recentTrades >= 6;
  const quiet = reading.recentTrades < 2 && reading.recentVolatility < .12 && Math.abs(recentIndexChange) < .15;
  const base = clamp(Math.round(baseIntervalSeconds), 50, 90);
  const intervalSeconds = opening ? base : activeMarket
    ? clamp(Math.max(base, 85 + (reading.unresolvedNewsSeconds > 35 ? 5 : 0)), 50, 90)
    : quiet ? clamp(Math.min(base, 50), 50, 90)
      : activeCrowd ? clamp(base - 10, 50, 90)
        : base;
  const setSize: 2 | 3 = activeMarket || activeCrowd || reading.activeTerminals >= 7 ? 2 : 3;

  const publishedKeys = new Set(world.headlines.map(storyKey));
  const reserved = world.scheduledNews.map(event => world.news[event.index]).filter(Boolean);
  const freshStories = world.news.map((news, index) => ({ news, index }))
    .filter(item => !publishedKeys.has(storyKey(item.news)) && !reserved.some(news => storyKey(news) === storyKey(item.news)) && ![...world.headlines, ...reserved].some(other => newsContradicts(item.news, other)));
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
    const affected = world.stocks.filter(stock => scope === "economy" || (scope === "sector" ? stock.sector === item.news.sector : item.news.symbols?.includes(stock.symbol)));
    const exposed = Object.values(world.sessions).filter(player => player.batch === world.batch && player.included && !player.ended && at - (player.lastSeenAt ?? player.joinedAt) < TERMINAL_ACTIVE_WINDOW_MS)
      .filter(player => affected.some(stock => (player.holdings[stock.symbol]?.qty ?? 0) + (player.shorts[stock.symbol]?.qty ?? 0) > 0)).length;
    score += Math.min(1.2, exposed * .18);
    if (affected.length) {
      score -= affected.filter(stock => item.news.direction > 0 ? stock.price / stock.previousClose > 1.24 : stock.price / stock.previousClose < .76).length / affected.length * 4;
    }
    // Deterministic rotation avoids always picking the first story on equal scores.
    score += Math.sin(item.index * 37 + world.batch * 11 + (world.autonomousNews?.decisions ?? 0) * 7) * .12;
    return score;
  };
  // Score complete sets rather than forcing one fixed category recipe.
  const ranked = freshStories.map(item => ({ ...item, score: scoreStory(item) })).sort((a, b) => b.score - a.score || a.index - b.index);
  const pool = [...new Map([
    ...ranked.slice(0, 14),
    ...(["economy", "sector", "stock"] as const).flatMap(scope => ranked.filter(item => scopeOf(item.news) === scope).slice(0, 6)),
  ].map(item => [item.index, item])).values()];
  let best: typeof ranked = [];
  let bestScore = -Infinity;
  const evaluate = (items: typeof ranked) => {
    if (items.some((item, i) => items.slice(0, i).some(other => newsContradicts(item.news, other.news)))) return;
    const scopes = new Set(items.map(item => scopeOf(item.news))).size;
    const sectors = new Set(items.filter(item => scopeOf(item.news) !== "economy").map(item => item.news.sector)).size;
    const balance = new Set(items.map(item => item.news.direction)).size > 1 ? .45 : -.15;
    const score = items.reduce((sum, item) => sum + item.score, 0) / items.length + scopes * .18 + sectors * .1 + balance + (items.length === setSize ? .5 : 0);
    if (score > bestScore) { bestScore = score; best = items; }
  };
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    evaluate([pool[i], pool[j]]);
    if (setSize === 3) for (let k = j + 1; k < pool.length; k++) evaluate([pool[i], pool[j], pool[k]]);
  }
  const indices = best.map(item => item.index);
  const finalSize: 2 | 3 = indices.length === 3 ? 3 : 2;
  const tempo = intervalSeconds === 50 ? "Prices and trading have been quiet, so I’m shortening the gap to keep the round moving."
    : intervalSeconds >= 85 ? "The market is active or earlier news is still moving prices, so I’m giving those reactions room to play out."
      : intervalSeconds < base ? "Several terminals are trading actively, so I’m keeping news lively without crowding the market."
        : "The market is balanced, so I’m keeping the news near its usual pace.";
  const coverage = [...new Set(indices.map(index => scopeOf(world.news[index])))].join(", ");
  const reason = indices.length < 2 ? "Fewer than two compatible unused stories remain in this batch." : `${tempo} I selected ${indices.length} compatible stories across ${coverage}, considering current holdings and recent trades.`;
  return { indices: indices.slice(0, finalSize), setSize: finalSize, intervalSeconds, reason, reading };
}
