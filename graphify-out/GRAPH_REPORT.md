# Graph Report - ds-pratibimb  (2026-11-04)

## Corpus Check
- 81 files · ~67,742 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .css 17, (none) 2, .example 1)

## Summary
- 741 nodes · 1556 edges · 37 communities (32 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8036a5fa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- engine.ts
- host-console.tsx
- news-behavior-check.cjs
- audience-stage.tsx
- Cloud setup
- typescript
- skills-bootstrap.sh
- engine-smoke.cjs
- autonomous-news.ts
- typescript
- Health check and recovery
- price-tick-check.cjs
- trader-parts.tsx
- Dalaal Street
- market-sound.ts
- types.ts
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- catalog.ts
- brain-scenarios.cjs
- brain-pacing-check.cjs
- Trader
- ref_node_assert
- brain-settings-check.cjs
- host-auth.ts
- store-format-check.cjs
- endurance-check.cjs
- game-logs-check.cjs
- typescript
- hall-of-fame-check.cjs
- news-live-check.cjs
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 45 edges
2. `advance()` - 34 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 27 edges
5. `AudienceStage()` - 25 edges
6. `next` - 23 edges
7. `typescript` - 20 edges
8. `mutate()` - 19 edges
9. `money()` - 17 edges
10. `chooseAutonomousNewsPlan()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Examples` --references--> `Trader()`  [INFERRED]
  docs/skills/SKILLS_USAGE.md → app/components/trader.tsx
- `VersionHome()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/page.tsx → src/ui-options.ts
- `POST()` --calls--> `advance()`  [EXTRACTED]
  app/api/auto/route.ts → src/game/engine.ts
- `POST()` --calls--> `hostAction()`  [EXTRACTED]
  app/api/auto/route.ts → src/game/engine.ts
- `touchSession()` --calls--> `recordGameLog()`  [EXTRACTED]
  app/api/game/route.ts → src/game/logs.ts

## Import Cycles
- None detected.

## Communities (37 total, 5 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.09
Nodes (48): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, errorResponse(), GET() (+40 more)

### Community 1 - "engine.ts"
Cohesion: 0.08
Nodes (66): newAutonomousNewsState(), readAutonomousNewsSignals(), makeNews(), makeStocks(), adaptBrainSettings(), advance(), advanceNewsDrift(), advanceNewsReaction() (+58 more)

### Community 2 - "host-console.tsx"
Cohesion: 0.08
Nodes (30): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+22 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.07
Nodes (26): a, assert, b, calm, closing, context, contextReading, effectWorld (+18 more)

### Community 4 - "audience-stage.tsx"
Cohesion: 0.06
Nodes (79): AudienceStage(), Award, BatchReport(), CANDLE_LINE, CandleChart(), CANDLES, CONFETTI, CountdownScene() (+71 more)

### Community 5 - "Cloud setup"
Cohesion: 0.29
Nodes (6): Cloud setup, Environment (detected 2026-11-02), First-time setup (new clone or new environment), Limitations, Persistence, Updates

### Community 6 - "typescript"
Cohesion: 0.25
Nodes (7): typescript@5.9.3, typescript, assert, fs, ts, w, ANIMATIONS

### Community 7 - "skills-bootstrap.sh"
Cohesion: 0.53
Nodes (5): bad(), install_cli(), ok(), PATH, skills-bootstrap.sh script

### Community 8 - "engine-smoke.cjs"
Cohesion: 0.07
Nodes (26): activeBrainWorld, activePlan, assert, autonomousWorld, boundedSpacingWorld, compact, covered, deltaChart (+18 more)

### Community 9 - "autonomous-news.ts"
Cohesion: 0.24
Nodes (13): activeTerminalPlayers(), chooseAutonomousNewsPlan(), clamp(), latestSet(), readNewsResponse(), scopeOf(), storyKey(), INDEX_WEIGHTS (+5 more)

### Community 10 - "typescript"
Cohesion: 0.33
Nodes (5): assert, fs, full, summary, ts

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "trader-parts.tsx"
Cohesion: 0.07
Nodes (37): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+29 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.08
Nodes (24): 25 companies, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Bells and countdown sound, Compact brain and situation-aware pacing, Dalaal Street, Endurance (20 batches), Host brain details, How the game works (+16 more)

### Community 15 - "market-sound.ts"
Cohesion: 0.18
Nodes (23): applause(), bellBuffer(), bellCache, BellKind, chime(), chimes(), countdownTick(), fanfare() (+15 more)

### Community 16 - "types.ts"
Cohesion: 0.17
Nodes (11): AutonomousNewsIntensity, Candle, Controls, HallEntry, HostNote, NewsMove, Position, PublicLeaderboardEntry (+3 more)

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (19): assert, finisher, fs, idle, join(), legacy, now, played() (+11 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "catalog.ts"
Cohesion: 0.15
Nodes (9): economyStories, NEWS_CATALOG_VERSION, NEWS_PRESETS, NewsPreset, rows, sectorStories, STOCK_SYMBOLS, stockStories (+1 more)

### Community 21 - "brain-scenarios.cjs"
Cohesion: 0.20
Nodes (7): assert, fs, modes, ts, newsContradicts(), Story, News

### Community 22 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 23 - "Trader"
Cohesion: 0.07
Nodes (36): AudiencePage(), dynamic, initialSession(), mergeChartData(), sessionStorageKey(), Trader(), returnToReady(), send() (+28 more)

### Community 24 - "ref_node_assert"
Cohesion: 0.22
Nodes (6): assert, fs, ts, assert, fs, ts

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "host-auth.ts"
Cohesion: 0.27
Nodes (8): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), signature()

### Community 27 - "store-format-check.cjs"
Cohesion: 0.17
Nodes (10): assert, before, fs, now, original, restored, stored, ts (+2 more)

### Community 28 - "endurance-check.cjs"
Cohesion: 0.18
Nodes (10): assert, at, first5, fs, last5, LIMIT, peak, sizes (+2 more)

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.08
Nodes (20): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+12 more)

### Community 30 - "typescript"
Cohesion: 0.33
Nodes (4): assert, cases, fs, ts

### Community 36 - "hall-of-fame-check.cjs"
Cohesion: 0.20
Nodes (8): assert, at, fs, now, pub, t, ts, w

### Community 45 - "news-live-check.cjs"
Cohesion: 0.36
Nodes (8): affects(), assert, expectDirection(), fs, rank(), scope(), ts, winners()

### Community 77 - "Skills architecture"
Cohesion: 0.22
Nodes (7): Dalaal Street — agent instructions, graphify, Skills: how they work together, Flow, Hooks in `.claude/settings.json`, Skills architecture, What runs where

## Knowledge Gaps
- **1 isolated node(s):** `PATH`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 370 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Trader` to `store.ts`, `trader-parts.tsx`, `layout.tsx`, `host-auth.ts`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08597285067873303 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `news-behavior-check.cjs`, `hall-of-fame-check.cjs`, `engine-smoke.cjs`, `typescript`, `price-tick-check.cjs`, `trader-parts.tsx`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `brain-scenarios.cjs`, `brain-pacing-check.cjs`, `ref_node_assert`, `brain-settings-check.cjs`, `store-format-check.cjs`, `endurance-check.cjs`, `game-logs-check.cjs`, `typescript`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08056265984654731 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `Trader` to `engine.ts`, `host-console.tsx`, `audience-stage.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `host-console.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07560975609756097 - nodes in this community are weakly interconnected._