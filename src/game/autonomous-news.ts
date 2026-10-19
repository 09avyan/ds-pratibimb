import { recentOrderDifficulty } from "./logs";
import { newsContradicts } from "./news-rules";
import { NEWS_IMPACT_DECAY, NEWS_IMPACT_FADE_THRESHOLD, NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS, NEWS_AUTO_MAX_INTERVAL_SECONDS } from "./news-timing";
import { INDEX_WEIGHTS } from "./catalog";
import { TERMINAL_ACTIVE_WINDOW_MS, TERMINAL_COUNT } from "./terminals";
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

function activeTerminalPlayers(world: World, at: number) {
  const terminals = new Map<number, World["sessions"][string]>();
  for (const player of Object.values(world.sessions).sort((a, b) => (b.lastSeenAt ?? b.joinedAt) - (a.lastSeenAt ?? a.joinedAt))) {
    if (!player.terminalNumber || player.terminalNumber < 1 || player.terminalNumber > TERMINAL_COUNT || terminals.has(player.terminalNumber)) continue;
    if (player.batch !== world.batch || !player.included || player.ended || at - (player.lastSeenAt ?? player.joinedAt) >= TERMINAL_ACTIVE_WINDOW_MS) continue;
    terminals.set(player.terminalNumber, player);
  }
  return [...terminals.values()];
}

export function readAutonomousNewsSignals(world: World, at: number): AutonomousNewsReading {
  const index = 10_000 * Object.entries(INDEX_WEIGHTS).reduce((sum, [symbol, weight]) => {
    const stock = world.stocks.find(item => item.symbol === symbol);
    return sum + weight * (stock ? stock.price / stock.previousClose : 1);
  }, 0);
  const indexChange = (index / 10_000 - 1) * 100;
  const players = activeTerminalPlayers(world, at);
  const recent = (player: typeof players[number]) => player.history.filter(trade => trade.time >= at - 45_000 && trade.time <= at && trade.side !== "Auto-cover" && trade.side !== "Auto-sell");
  const trades = players.flatMap(recent);
  const recentTrades = trades.length;
  const engaged = players.filter(player => recent(player).length > 0).length;
  const openPositions = players.reduce((sum, player) => sum + [...Object.values(player.holdings), ...Object.values(player.shorts)].filter(position => position.qty > 0).length, 0);
  const idleCashShare = players.length ? players.filter(player => player.cash >= player.initialCash * .8 && player.history.length < 2).length / players.length : 0;
  const stressedShare = players.length ? players.filter(player => {
    const longValue = Object.entries(player.holdings).reduce((sum, [symbol, position]) => sum + position.qty * (world.stocks.find(stock => stock.symbol === symbol)?.price ?? position.avg), 0);
    const shortPnl = Object.entries(player.shorts).reduce((sum, [symbol, position]) => sum + position.qty * (position.avg - (world.stocks.find(stock => stock.symbol === symbol)?.price ?? position.avg)), 0);
    return player.cash + longValue + shortPnl < player.initialCash * .92;
  }).length / players.length : 0;
  const moves = world.stocks.flatMap(stock => {
    const bars = stock.candles.slice(-7);
    return bars.slice(1).flatMap((bar, index) => {
      const prior = bars[index]?.close;
      return prior ? [Math.abs((bar.close / prior - 1) * 100)] : [];
    });
  }).sort((a, b) => a - b);
  const recentVolatility = moves.length ? moves[Math.floor(moves.length * .75)] : 0;
  const strongestBias = Math.max(0, ...world.stocks.filter(stock => !stock.newsBiasClock).map(stock => Math.abs(stock.newsBias ?? 0)));
  const decay = NEWS_IMPACT_DECAY;
  const driftSeconds = strongestBias <= NEWS_IMPACT_FADE_THRESHOLD ? 0 : Math.ceil(Math.log(NEWS_IMPACT_FADE_THRESHOLD / strongestBias) / Math.log(decay));
  const reactionSeconds = Math.max(0, ...world.stocks.flatMap(stock => (stock.newsMoves ?? []).map(move => move.duration - move.elapsed)));
  const clockSeconds = Math.max(0, ...world.stocks.map(stock => stock.newsBiasClock ? stock.newsBiasClock.duration - stock.newsBiasClock.elapsed : 0));
  const unresolvedNewsSeconds = world.status === "live" ? Math.max(0, Math.min(Math.max(clockSeconds, driftSeconds, reactionSeconds), world.remaining)) : 0;
  const recentIndexChange = Object.entries(INDEX_WEIGHTS).reduce((sum, [symbol, weight]) => {
    const stock = world.stocks.find(item => item.symbol === symbol);
    const prior = stock?.candles.at(-8)?.close;
    return sum + (stock && prior ? (stock.price / prior - 1) * 100 * weight : 0);
  }, 0);
  return { ...recentOrderDifficulty(world, at), indexChange, recentVolatility, engagedTerminals: engaged, recentIndexChange, activeTerminals: players.length, sessionDuration: world.duration, elapsedSeconds: Math.max(0, world.duration - world.remaining), secondsRemaining: world.remaining, recentBuys: trades.filter(trade => trade.side === "Buy").length, recentSells: trades.filter(trade => trade.side === "Sell").length, recentShorts: trades.filter(trade => trade.side === "Short").length, openPositions, idleCashShare, stressedShare, recentTrades, unresolvedNewsSeconds };
}

export function chooseAutonomousNewsPlan(world: World, at: number, baseIntervalSeconds = 75, opening = false) {
  const reading = readAutonomousNewsSignals(world, at);
  const recentIndexChange = reading.recentIndexChange ?? 0;
  const latestAt = Math.max(0, ...world.headlines.map(news => news.createdAt));
  const elapsedSinceRelease = latestAt ? Math.max(0, (at - latestAt) / 1000) : 0;
  const reacting = Math.max(0, ...world.stocks.flatMap(stock => (stock.newsMoves ?? []).map(move => move.duration - move.elapsed)));
  const publishedSetCount = new Set(world.headlines.map(news => news.createdAt)).size;
  const introductoryStage: 0 | 1 | 2 = publishedSetCount === 0 ? 1 : publishedSetCount === 1 ? 2 : 0;
  const roundProgress = world.duration > 0 ? 1 - world.remaining / world.duration : 0;
  const closingPhase = world.remaining <= Math.max(55, world.duration * .18);
  const parentsStillExploring = reading.activeTerminals > 0 && (reading.idleCashShare ?? 0) >= .6 && roundProgress < .55;
  const broadPortfolioStress = reading.activeTerminals >= 3 && (reading.stressedShare ?? 0) >= .5;
  const participation = reading.activeTerminals ? (reading.engagedTerminals ?? 0) / reading.activeTerminals : 0;
  const turbulenceThreshold = Math.max(.5, Math.min(1.4, world.controls.volatility * .02));
  const turbulent = reading.recentVolatility >= turbulenceThreshold || Math.abs(recentIndexChange) >= .9;
  const readersNeedRoom = reading.activeTerminals > 0 && (participation < .35 && reacting > 12 || (reading.rejectedOrders ?? 0) >= 3 && (reading.strugglingTerminals ?? 0) >= Math.min(2, reading.activeTerminals));
  const quiet = reading.recentVolatility < Math.max(.12, Math.min(.7, world.controls.volatility * .018)) && Math.abs(recentIndexChange) < .2 && reading.recentTrades < Math.max(2, reading.activeTerminals * .5);
  const strategy: "calm" | "balanced" | "lively" = turbulent || readersNeedRoom || broadPortfolioStress || closingPhase ? "calm" : quiet && reacting <= 10 && reading.unresolvedNewsSeconds <= 20 ? "lively" : "balanced";
  const activeCrowd = reading.activeTerminals >= 4 && participation >= .5;
  const base = clamp(Math.round(baseIntervalSeconds), NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS);
  const planningAnchor = opening ? at : world.autonomousNews?.plannedAt ?? at;
  const elapsedSincePlan = Math.max(0, (at - planningAnchor) / 1000);
  const limitedOverlap = strategy === "lively" && reading.activeTerminals > 0 && reacting <= 8 && reading.unresolvedNewsSeconds <= 18;
  let intervalSeconds = opening && !world.headlines.length ? base
    : strategy === "calm" || reading.unresolvedNewsSeconds > 20 ? Math.max(base, 85)
      : strategy === "lively" ? Math.min(base, 55)
        : activeCrowd ? Math.max(60, base - 5) : base;
  // Reviews use remaining effect time plus elapsed time from the original plan.
  // This waits for settling without moving the due time further away on every tick.
  if (world.headlines.length && reading.unresolvedNewsSeconds > (limitedOverlap ? 18 : 6)) {
    intervalSeconds = Math.max(intervalSeconds, elapsedSincePlan + reading.unresolvedNewsSeconds - (limitedOverlap ? 12 : 3));
  }
  intervalSeconds = clamp(Math.round(intervalSeconds), NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_AUTO_MAX_INTERVAL_SECONDS);
  const setSize: 2 | 3 = introductoryStage > 0 || closingPhase || parentsStillExploring || strategy === "calm" || activeCrowd || reading.unresolvedNewsSeconds > 20 ? 2 : strategy === "lively" ? 3 : reading.activeTerminals >= 6 ? 2 : 3;

  const publishedKeys = new Set(world.headlines.map(storyKey));
  const reserved = world.scheduledNews.map(event => world.news[event.index]).filter(Boolean);
  const freshStories = world.news.map((news, index) => ({ news, index }))
    .filter(item => (!introductoryStage || scopeOf(item.news) === "stock" || introductoryStage === 2 && scopeOf(item.news) === "sector") && !publishedKeys.has(storyKey(item.news)) && !reserved.some(news => storyKey(news) === storyKey(item.news)) && ![...world.headlines, ...reserved].some(other => newsContradicts(item.news, other)))
    .filter(({ news }) => {
      const scope = scopeOf(news);
      const affected = world.stocks.filter(stock => scope === "economy" || (scope === "sector" ? stock.sector === news.sector : news.symbols?.includes(stock.symbol)));
      // Do not propose a direction that a circuit limit already prevents.
      return affected.length > 0 && affected.every(stock => news.direction > 0
        ? stock.previousClose * 1.32 / stock.price - 1 > .005
        : 1 - stock.previousClose * .68 / stock.price > .005);
    });
  const tradeSymbolScores = new Map<string, number>();
  const tradeSectorScores = new Map<string, number>();
  for (const player of activeTerminalPlayers(world, at)) {
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
    const recentStories = world.headlines.filter(story => at - story.createdAt < 100_000);
    const sameCompany = scope === "stock" && recentStories.some(story => story.symbols?.some(symbol => item.news.symbols?.includes(symbol)));
    const sameSector = scope === "sector" && recentStories.some(story => story.sector === item.news.sector && scopeOf(story) !== "economy");
    if (introductoryStage === 1) {
      const familiar = item.news.symbols?.some(symbol => ["MARUTI", "ITC", "HDFCBANK", "AXISBANK", "TATAMOTORS", "BHARTIARTL", "RELIANCE"].includes(symbol));
      if (familiar) score += .55;
      if (item.news.headline.length <= 125) score += .2;
    }
    if (introductoryStage === 2 && scope === "sector") score += .35;
    if (parentsStillExploring && scope === "stock") score += .25;
    if (closingPhase && item.news.type === "major") score -= .4;
    if (world.controls.scenario === "Bullish" && item.news.direction > 0 || world.controls.scenario === "Bearish" && item.news.direction < 0) score += .1;
    if (sameCompany) score -= .8;
    if (sameSector) score -= .5;
    if (strategy === "calm") score += item.news.type === "minor" ? .8 : -.45;
    if (strategy === "lively") score += item.news.type === "major" ? .55 : -.1;
    if (strategy === "calm" && scope === "economy") score -= .45;
    if (marketDirection && item.news.direction !== marketDirection) score += .65;
    if (recentDirectionCount >= 2 && item.news.direction < 0) score += .25;
    if (recentDirectionCount <= -2 && item.news.direction > 0) score += .25;
    if (scope === "stock") score += Math.min(2.1, (tradeSymbolScores.get(item.news.symbols?.[0] ?? "") ?? 0) * .8);
    if (scope === "sector") score += Math.min(1.5, (tradeSectorScores.get(item.news.sector) ?? 0) * .55);
    if (item.news.type === "minor" && world.headlines.slice(0, 3).every(headline => headline.type === "major")) score += .18;
    if (item.news.type === "major" && world.headlines.slice(0, 3).every(headline => headline.type === "minor")) score += .18;
    const affected = world.stocks.filter(stock => scope === "economy" || (scope === "sector" ? stock.sector === item.news.sector : item.news.symbols?.includes(stock.symbol)));
    const exposed = activeTerminalPlayers(world, at)
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
    if (introductoryStage > 0 && items.length !== 2) return;
    if (introductoryStage > 0 && items.filter(item => item.news.type === "major").length > 1) return;
    if (introductoryStage === 1 && items[0].news.sector === items[1].news.sector) return;
    if (introductoryStage === 2 && (!items.some(item => scopeOf(item.news) === "sector") || !items.some(item => scopeOf(item.news) === "stock"))) return;
    // Avoid teaching scope overrides before parents have had two straightforward sets.
    if (introductoryStage === 2 && items[0].news.sector === items[1].news.sector) return;
    // Opposite stories at the same scope would cancel on the same companies.
    // Scope overrides remain valid (company > sector > economy), but the brain
    // should not publish an ambiguous pair of opposing economy/sector stories.
    if (items.some((item, i) => items.slice(0, i).some(other => {
      const scope = scopeOf(item.news);
      return scope === scopeOf(other.news) && item.news.direction !== other.news.direction &&
        (scope === "economy" || scope === "sector" && item.news.sector === other.news.sector || scope === "stock" && item.news.symbols?.some(symbol => other.news.symbols?.includes(symbol)));
    }))) return;
    const scopes = new Set(items.map(item => scopeOf(item.news))).size;
    const sectors = new Set(items.filter(item => scopeOf(item.news) !== "economy").map(item => item.news.sector)).size;
    const balance = new Set(items.map(item => item.news.direction)).size > 1 ? .45 : -.15;
    const majorCount = items.filter(item => item.news.type === "major").length;
    const intensity = strategy === "calm" ? -majorCount * .3 : strategy === "lively" && majorCount > 0 ? .2 : 0;
    const directions = new Set(items.map(item => item.news.direction));
    const continuationPenalty = elapsedSinceRelease < 45 && reading.unresolvedNewsSeconds > 20 && directions.size === 1 ? -.3 : 0;
    const score = intensity + continuationPenalty + items.reduce((sum, item) => sum + item.score, 0) / items.length + scopes * .18 + sectors * .1 + balance + (items.length === setSize ? .5 : 0);
    if (score > bestScore) { bestScore = score; best = items; }
  };
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    evaluate([pool[i], pool[j]]);
    if (setSize === 3) for (let k = j + 1; k < pool.length; k++) evaluate([pool[i], pool[j], pool[k]]);
  }
  const indices = best.map(item => item.index);
  const finalSize: 2 | 3 = indices.length === 3 ? 3 : 2;
  const tempo = introductoryStage === 1 ? "Opening set: two clear company stories in different sectors, so parents can follow one company at a time."
    : introductoryStage === 2 ? "Second set: one sector story and one company story, introducing broader effects without conflicting targets."
      : closingPhase ? "The round is nearing its end, so I’m keeping the remaining decisions manageable."
        : parentsStillExploring ? "Several parents are still exploring with most cash unused, so I’m keeping this set focused."
          : strategy === "calm" ? "Giving players room to read: a smaller, gentler set while the market is unsettled."
    : strategy === "lively" ? "The market is quiet, so I’m choosing fresh opportunities to bring the round back to life."
      : "Keeping a balance between interesting moves and time to react.";
  const overlapReason = reading.unresolvedNewsSeconds > 6 ? limitedOverlap ? " Only a light tail of earlier news may overlap." : " Earlier news gets time to settle before this release." : "";
  const coverage = [...new Set(indices.map(index => scopeOf(world.news[index])))].join(", ");
  const reason = indices.length < 2 ? "Fewer than two compatible unused stories remain in this batch." : `${tempo} I selected ${indices.length} compatible stories across ${coverage}, considering current holdings and recent trades.${overlapReason}`;
  return { indices: indices.slice(0, finalSize), setSize: finalSize, intervalSeconds, reason, reading, strategy, introductoryStage };
}
