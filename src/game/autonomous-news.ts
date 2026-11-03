import { recentOrderDifficulty } from "./logs";
import { newsContradicts } from "./news-rules";
import { NEWS_IMPACT_DECAY, NEWS_IMPACT_FADE_THRESHOLD, NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS, NEWS_AUTO_MAX_INTERVAL_SECONDS, NEWS_REACTION_SECONDS } from "./news-timing";
import { INDEX_WEIGHTS } from "./catalog";
import { TERMINAL_ACTIVE_WINDOW_MS, TERMINAL_COUNT } from "./terminals";
import type { AutonomousNews, AutonomousNewsLogEntry, AutonomousNewsReading, AutonomousNewsResponse, AutonomousPacingFactor, News, World } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const scopeOf = (news: Pick<News, "scope" | "symbols" | "sector">) => news.scope ?? (news.symbols?.length ? "stock" : news.sector === "ALL" ? "economy" : "sector");
const storyKey = (news: Pick<News, "headline" | "scope" | "symbols" | "sector">) => `${scopeOf(news)}|${news.sector}|${news.symbols?.join(",") ?? ""}|${news.headline}`;

export function newAutonomousNewsState(enabled = false): AutonomousNews {
  return {
    enabled,
    nextAt: 0,
    nextIndices: [] as number[],
    nextSetSize: 3 as 2 | 3,
    nextIntervalSeconds: 42,
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

/** The latest published set and the companies it affects. */
function latestSet(world: World) {
  if (!world.headlines.length) return null;
  const at = Math.max(...world.headlines.map(news => news.createdAt));
  const stories = world.headlines.filter(news => news.createdAt === at);
  const affected = new Set(world.stocks.filter(stock => stories.some(news => {
    const scope = scopeOf(news);
    return scope === "economy" || (scope === "sector" ? stock.sector === news.sector : news.symbols?.includes(stock.symbol));
  })).map(stock => stock.symbol));
  return { at, stories, affected };
}

/**
 * How the room answered the last set, read from each terminal's own trade record (the same events the
 * game log keeps). It measures who acted on the affected companies, how quickly, and whether the
 * trading has died down. Automatic close-outs are not player decisions and are ignored.
 */
export function readNewsResponse(world: World, at: number): AutonomousNewsResponse | null {
  const latest = latestSet(world);
  if (!latest) return null;
  // Only terminals that have placed an order count; a logged-in screen nobody uses is not "slow".
  const players = activeTerminalPlayers(world, at).filter(player => player.history.some(trade => trade.side !== "Auto-cover" && trade.side !== "Auto-sell"));
  const manual = (trade: World["sessions"][string]["history"][number]) => trade.side !== "Auto-cover" && trade.side !== "Auto-sell" && trade.time <= at;
  const firstReactions = players.flatMap(player => {
    const times = player.history.filter(trade => manual(trade) && trade.time >= latest.at && latest.affected.has(trade.symbol)).map(trade => trade.time);
    return times.length ? [(Math.min(...times) - latest.at) / 1000] : [];
  }).sort((a, b) => a - b);
  const trades = players.flatMap(player => player.history.filter(manual));
  const lastTradeAt = Math.max(latest.at, ...trades.map(trade => trade.time));
  return {
    sinceRelease: Math.max(0, (at - latest.at) / 1000),
    respondedTerminals: firstReactions.length,
    activeTerminals: players.length,
    responseShare: players.length ? firstReactions.length / players.length : 0,
    medianFirstReaction: firstReactions.length ? firstReactions[Math.floor((firstReactions.length - 1) / 2)] : null,
    tradesLast20s: trades.filter(trade => trade.time >= at - 20_000).length,
    quietSeconds: Math.max(0, (at - lastTradeAt) / 1000),
  };
}

/**
 * keep: stories already shown as the next set. They stay unless they have become invalid
 * (published, excluded, contradicted or blocked by a price limit), so the host's preview is stable.
 */
export function chooseAutonomousNewsPlan(world: World, at: number, baseIntervalSeconds = 42, opening = false, keep: number[] = []) {
  const reading = readAutonomousNewsSignals(world, at);
  const recentIndexChange = reading.recentIndexChange ?? 0;
  const latestAt = Math.max(0, ...world.headlines.map(news => news.createdAt));
  const elapsedSinceRelease = latestAt ? Math.max(0, (at - latestAt) / 1000) : 0;
  const reacting = Math.max(0, ...world.stocks.flatMap(stock => (stock.newsMoves ?? []).map(move => move.duration - move.elapsed)));
  const publishedSetCount = new Set(world.headlines.map(news => news.createdAt)).size;
  const introductoryStage: 0 | 1 | 2 = publishedSetCount === 0 ? 1 : publishedSetCount === 1 ? 2 : 0;
  const roundProgress = world.duration > 0 ? 1 - world.remaining / world.duration : 0;
  const closingPhase = world.remaining <= Math.max(45, world.duration * .15);
  const parentsStillExploring = reading.activeTerminals > 0 && (reading.idleCashShare ?? 0) >= .6 && roundProgress < .55;
  const broadPortfolioStress = reading.activeTerminals >= 3 && (reading.stressedShare ?? 0) >= .5;
  const participation = reading.activeTerminals ? (reading.engagedTerminals ?? 0) / reading.activeTerminals : 0;
  const turbulenceThreshold = Math.max(.5, Math.min(1.4, world.controls.volatility * .02));
  const turbulent = reading.recentVolatility >= turbulenceThreshold || Math.abs(recentIndexChange) >= .9;
  const readersNeedRoom = reading.activeTerminals > 0 && (participation < .35 && reacting > 12 || (reading.rejectedOrders ?? 0) >= 3 && (reading.strugglingTerminals ?? 0) >= Math.min(2, reading.activeTerminals));
  const quiet = reading.recentVolatility < Math.max(.12, Math.min(.7, world.controls.volatility * .018)) && Math.abs(recentIndexChange) < .2 && reading.recentTrades < Math.max(2, reading.activeTerminals * .5);
  const computedStrategy: "calm" | "balanced" | "lively" = turbulent || readersNeedRoom || broadPortfolioStress || closingPhase ? "calm" : quiet && reacting <= 10 && reading.unresolvedNewsSeconds <= 20 ? "lively" : "balanced";
  // The host can fix the intensity; the brain still chooses the stories and timing within it.
  const hostIntensity = world.autonomousNews?.hostIntensity ?? null;
  const strategy = hostIntensity ?? computedStrategy;
  const response = opening ? null : readNewsResponse(world, at);
  const absorbed = Boolean(response && response.activeTerminals > 0 && response.responseShare >= .6 && response.quietSeconds >= 12 && response.sinceRelease >= 30);
  const stillTrading = Boolean(response && response.activeTerminals > 0 && response.tradesLast20s >= Math.max(3, Math.ceil(response.activeTerminals * .6)));
  const ignored = Boolean(response && response.activeTerminals > 0 && response.sinceRelease >= 40 && response.respondedTerminals === 0 && response.tradesLast20s === 0);
  const activeCrowd = reading.activeTerminals >= 4 && participation >= .5;
  const base = clamp(Math.round(baseIntervalSeconds), NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS);
  // Measure from the latest release when it is newer than the stored plan, so the plan made at
  // publication does not count the previous gap as already elapsed.
  const planningAnchor = opening ? at : Math.max(world.autonomousNews?.plannedAt ?? at, latestAt || 0);
  const elapsedSincePlan = Math.max(0, (at - planningAnchor) / 1000);
  const limitedOverlap = strategy === "lively" && reading.activeTerminals > 0 && reacting <= 8 && reading.unresolvedNewsSeconds <= 18;
  const startGap = opening && !world.headlines.length ? base
    : strategy === "calm" || reading.unresolvedNewsSeconds > 30 ? Math.max(base, 47)
      : strategy === "lively" ? Math.min(base, 37)
        : activeCrowd ? Math.max(39, base - 3) : base;
  let intervalSeconds = startGap;
  const pacing: AutonomousPacingFactor[] = [{ kind: "base", label: opening && !world.headlines.length ? `Host baseline for the opening set` : `Starting gap for a ${strategy} set${hostIntensity ? " (host intensity)" : ""}`, seconds: startGap }];
  const adjust = (label: string, seconds: number, kind: AutonomousPacingFactor["kind"] = "adjust") => {
    const rounded = Math.round(seconds);
    if (!rounded) return;
    pacing.push({ kind, label, seconds: rounded });
    intervalSeconds += rounded;
  };
  // How the room answered the last set moves the next release earlier or later.
  if (response && response.activeTerminals > 0 && world.headlines.length) {
    const median = response.medianFirstReaction;
    if (absorbed) adjust(`${response.respondedTerminals}/${response.activeTerminals} terminals acted on the last set and trading has gone quiet for ${Math.round(response.quietSeconds)}s`, -15);
    else if (stillTrading) adjust(`Terminals are still trading the last set (${response.tradesLast20s} orders in 20s)`, 10);
    if (median !== null && median <= 15 && response.responseShare >= .5 && !stillTrading) adjust(`Quick reactions: half the terminals traded within ${Math.round(median)}s`, -5);
    if (median !== null && median >= 35) adjust(`Slow reactions: the median first trade came ${Math.round(median)}s after release`, 8);
    if (ignored) adjust("Nobody traded the last set yet; a clearer set comes a little sooner", -6);
  }
  if ((reading.rejectedOrders ?? 0) >= 3) adjust(`${reading.rejectedOrders} rejected orders in the last minute`, 12);
  // With a set every 35–50 seconds, earlier follow-through always overlaps a little. The brain only
  // waits for the previous set's direct reaction (about 35s) to finish, so players see each story's
  // move before the next set; the slower tail continues underneath.
  if (world.headlines.length && reacting > 0) {
    const reactionDone = elapsedSincePlan + reacting;
    if (reactionDone > intervalSeconds) adjust(`Letting the last set's direct reaction finish (${Math.round(reacting)}s left)`, reactionDone - intervalSeconds, "limit");
  }
  const bounded = clamp(Math.round(intervalSeconds), NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_AUTO_MAX_INTERVAL_SECONDS);
  if (bounded !== Math.round(intervalSeconds)) adjust(`Kept within the brain's ${NEWS_BASE_INTERVAL_MIN_SECONDS}–${NEWS_AUTO_MAX_INTERVAL_SECONDS}s range`, bounded - intervalSeconds, "limit");
  // Near the end, pull the release in so the last set can play out before the bell.
  const finalTail = NEWS_REACTION_SECONDS + 20;
  if (world.status === "live" && world.headlines.length) {
    const leftAtRelease = world.remaining - Math.max(0, intervalSeconds - elapsedSincePlan);
    // Never overlap more than a short tail of the previous effect, even to fit the last set in.
    const earliest = Math.max(elapsedSincePlan + 5, elapsedSincePlan + reacting, NEWS_BASE_INTERVAL_MIN_SECONDS);
    if (leftAtRelease < finalTail && world.remaining > finalTail + 5) adjust("Brought forward so the final set has time to play out before the close", Math.max(earliest, intervalSeconds - (finalTail - leftAtRelease)) - intervalSeconds, "limit");
  }
  const nudge = world.autonomousNews?.nudgeSeconds ?? 0;
  if (nudge) adjust(nudge > 0 ? `Host asked for ${nudge}s more time` : `Host asked for the set ${-nudge}s sooner`, Math.max(elapsedSincePlan + 5, Math.min(150, intervalSeconds + nudge)) - intervalSeconds, "host");
  intervalSeconds = Math.round(intervalSeconds);
  // No time for another set after this one: make it a deliberate closing set.
  const finalSet = world.status === "live" && world.remaining - Math.max(0, intervalSeconds - elapsedSincePlan) < NEWS_REACTION_SECONDS + 5 + NEWS_BASE_INTERVAL_MIN_SECONDS;
  const setSize: 2 | 3 = introductoryStage > 0 || closingPhase || parentsStillExploring || strategy === "calm" || activeCrowd ? 2 : strategy === "lively" ? 3 : reading.activeTerminals >= 6 ? 2 : 3;

  const excluded = new Set(world.autonomousNews?.excludedIndices ?? []);
  const publishedKeys = new Set(world.headlines.map(storyKey));
  const reserved = world.scheduledNews.map(event => world.news[event.index]).filter(Boolean);
  const requestedPins = world.autonomousNews?.pinnedIndices ?? [];
  // The host's pins replace the gentle introductory recipe for that set.
  const introRules = requestedPins.length ? 0 : introductoryStage;
  const freshStories = world.news.map((news, index) => ({ news, index }))
    .filter(item => !excluded.has(item.index))
    .filter(item => (!introRules || scopeOf(item.news) === "stock" || introRules === 2 && scopeOf(item.news) === "sector") && !publishedKeys.has(storyKey(item.news)) && !reserved.some(news => storyKey(news) === storyKey(item.news)) && ![...world.headlines, ...reserved].some(other => newsContradicts(item.news, other)))
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
  // Round-wide memory: which sectors have had news, how often the whole economy moved, and the
  // overall tilt of good versus bad news so far.
  const sectorCounts = new Map<string, number>();
  for (const story of world.headlines) if (scopeOf(story) !== "economy") sectorCounts.set(story.sector, (sectorCounts.get(story.sector) ?? 0) + 1);
  const economySets = new Set(world.headlines.filter(story => scopeOf(story) === "economy").map(story => story.createdAt)).size;
  const roundDirection = world.headlines.reduce((sum, story) => sum + Math.sign(story.direction), 0);
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
    if (publishedSetCount >= 1 && scope !== "economy") {
      const covered = sectorCounts.get(item.news.sector) ?? 0;
      score += covered === 0 ? .35 : -.22 * (covered - 1);
    }
    if (scope === "economy" && economySets >= Math.max(1, Math.ceil(publishedSetCount / 2))) score -= .15;
    if (roundDirection >= 3 && item.news.direction < 0 || roundDirection <= -3 && item.news.direction > 0) score += .3;
    if (finalSet) score += scope === "stock" ? .4 : scope === "economy" ? -.5 : 0;
    if (ignored) score += scope === "stock" ? .35 + (item.news.type === "major" ? .15 : 0) : scope === "economy" ? -.3 : 0;
    // Deterministic rotation avoids always picking the first story on equal scores.
    score += Math.sin(item.index * 37 + world.batch * 11 + (world.autonomousNews?.decisions ?? 0) * 7) * .12;
    return score;
  };
  // Score complete sets rather than forcing one fixed category recipe.
  const ranked = freshStories.map(item => ({ ...item, score: scoreStory(item) })).sort((a, b) => b.score - a.score || a.index - b.index);
  const pinned = [...new Set([...requestedPins, ...keep])].filter(index => ranked.some(item => item.index === index)).slice(0, 3);
  const hostPins = requestedPins.filter(index => pinned.includes(index));
  // A kept set keeps its size, so the preview does not quietly grow a third story.
  const keptSize = keep.length && keep.every(index => pinned.includes(index)) ? keep.length : 0;
  const pool = [...new Map([
    ...ranked.filter(item => pinned.includes(item.index)),
    ...ranked.slice(0, 14),
    ...(["economy", "sector", "stock"] as const).flatMap(scope => ranked.filter(item => scopeOf(item.news) === scope).slice(0, 6)),
    ...(["minor", "major"] as const).flatMap(type => ranked.filter(item => item.news.type === type).slice(0, 4)),
  ].map(item => [item.index, item])).values()];
  let best: typeof ranked = [];
  let bestScore = -Infinity;
  const evaluate = (items: typeof ranked) => {
    if (items.some((item, i) => items.slice(0, i).some(other => newsContradicts(item.news, other.news)))) return;
    if (pinned.some(index => !items.some(item => item.index === index))) return;
    if (introRules > 0 && items.length !== 2) return;
    if (introRules > 0 && items.filter(item => item.news.type === "major").length > 1) return;
    if (introRules === 1 && items[0].news.sector === items[1].news.sector) return;
    if (introRules === 2 && (!items.some(item => scopeOf(item.news) === "sector") || !items.some(item => scopeOf(item.news) === "stock"))) return;
    // Avoid teaching scope overrides before parents have had two straightforward sets.
    if (introRules === 2 && items[0].news.sector === items[1].news.sector) return;
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
    // Choose intensity independently of set size: every 2- and 3-story
    // minor/major mix remains available, with suitability scored from play.
    const preferredMajorCount = introductoryStage === 1 ? 0 : introductoryStage === 2 ? 1
      : parentsStillExploring || strategy === "calm" ? 0
        : strategy === "lively" ? Math.max(1, items.length - 1)
          : participation >= .6 && reading.recentVolatility < .35 && reading.unresolvedNewsSeconds <= 6 && world.remaining > 100 ? items.length
            : participation >= .6 ? Math.min(items.length, 2)
              : reading.activeTerminals > 0 && participation < .35 ? 0 : 1;
    const intensity = -Math.abs(majorCount - preferredMajorCount) * .9;
    const directions = new Set(items.map(item => item.news.direction));
    const continuationPenalty = elapsedSinceRelease < 45 && reading.unresolvedNewsSeconds > 20 && directions.size === 1 ? -.3 : 0;
    // Most sets should move a large part of the market, so every trader has something to act on.
    const touched = new Set(items.flatMap(item => { const scope = scopeOf(item.news); return world.stocks.filter(stock => scope === "economy" || (scope === "sector" ? stock.sector === item.news.sector : item.news.symbols?.includes(stock.symbol))).map(stock => stock.symbol); }));
    const breadth = introRules ? 0 : touched.size / Math.max(1, world.stocks.length) * 1.6;
    const score = breadth + intensity + continuationPenalty + items.reduce((sum, item) => sum + item.score, 0) / items.length + scopes * .18 + sectors * .1 + balance + (items.length === setSize ? .5 : 0);
    if (score > bestScore) { bestScore = score; best = items; }
  };
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    evaluate([pool[i], pool[j]]);
    if ((setSize === 3 || pinned.length === 3) && keptSize !== 2) for (let k = j + 1; k < pool.length; k++) evaluate([pool[i], pool[j], pool[k]]);
  }
  let indices = best.map(item => item.index);
  // Same stories as the kept set: keep their shown order too.
  if (keep.length && indices.length === keep.length && keep.every(index => indices.includes(index))) indices = [...keep];
  const finalSize: 2 | 3 = indices.length === 3 ? 3 : 2;
  const tempo = hostPins.length ? `Building around ${hostPins.length === 1 ? "the story" : "the stories"} the host kept, with the best compatible ${hostPins.length === 1 ? "partners" : "partner"}.`
    : finalSet ? "Closing set: no time for another release after this, so clear company stories that can play out before the bell."
    : ignored ? "Nobody traded the last set, so this one uses clearer company stories."
    : introductoryStage === 1 ? "Opening set: two clear company stories in different sectors, so parents can follow one company at a time."
    : introductoryStage === 2 ? "Second set: one sector story and one company story, introducing broader effects without conflicting targets."
      : closingPhase ? "The round is nearing its end, so I’m keeping the remaining decisions manageable."
        : parentsStillExploring ? "Several parents are still exploring with most cash unused, so I’m keeping this set focused."
          : strategy === "calm" ? "Giving players room to read: a smaller, gentler set while the market is unsettled."
    : strategy === "lively" ? "The market is quiet, so I’m choosing fresh opportunities to bring the round back to life."
      : "Keeping a balance between interesting moves and time to react.";
  const overlapReason = reacting > 0 ? " The last set's direct reaction finishes before this release." : "";
  const coverage = [...new Set(indices.map(index => scopeOf(world.news[index])))].join(", ");
  const majorCount = indices.filter(index => world.news[index].type === "major").length;
  const mix = `${indices.length - majorCount} minor + ${majorCount} major`;
  const reason = indices.length < 2 ? "Fewer than two compatible unused stories remain in this batch." : `${tempo} I selected ${indices.length} compatible stories (${mix}) across ${coverage}, matching intensity to participation, reading time and current market movement.${overlapReason}`;
  return { indices: indices.slice(0, finalSize), setSize: finalSize, intervalSeconds, reason, reading, strategy, introductoryStage, pacing, response, finalSet };
}
