# Graph Report - ds-pratibimb  (2026-11-03)

## Corpus Check
- 79 files · ~64,849 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: .css 17, (none) 2, .example 1)

## Summary
- 712 nodes · 1504 edges · 37 communities (32 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ef8fb749`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- engine.ts
- host-console.tsx
- news-behavior-check.cjs
- trader.tsx
- Cloud setup
- DalaalMark
- skills-bootstrap.sh
- engine-smoke.cjs
- types.ts
- catalog.ts
- Health check and recovery
- price-tick-check.cjs
- package.json
- Dalaal Street
- market-sound.ts
- next
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- chooseAutonomousNewsPlan
- brain-scenarios.cjs
- brain-pacing-check.cjs
- next
- typescript
- brain-settings-check.cjs
- host-auth.ts
- short-batch-check.cjs
- autonomous-news.ts
- game-logs-check.cjs
- scripts
- trading-flow-check.cjs
- news-live-check.cjs
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 45 edges
2. `advance()` - 34 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 27 edges
5. `AudienceStage()` - 24 edges
6. `next` - 23 edges
7. `mutate()` - 19 edges
8. `typescript` - 18 edges
9. `money()` - 17 edges
10. `chooseAutonomousNewsPlan()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Examples` --references--> `Trader()`  [INFERRED]
  docs/skills/SKILLS_USAGE.md → app/components/trader.tsx
- `VersionHome()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/page.tsx → src/ui-options.ts
- `VersionedPlayPage()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/play/page.tsx → src/ui-options.ts
- `AudienceStage()` --calls--> `DalaalMark()`  [EXTRACTED]
  app/components/audience-stage.tsx → src/components/trader-parts.tsx
- `AudienceStage()` --calls--> `DalaalWordmark()`  [EXTRACTED]
  app/components/audience-stage.tsx → src/components/trader-parts.tsx

## Import Cycles
- None detected.

## Communities (37 total, 5 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.06
Nodes (83): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, errorResponse(), GET() (+75 more)

### Community 1 - "engine.ts"
Cohesion: 0.14
Nodes (22): advanceNewsReaction(), BOT_PERSONALITIES, brainReleaseAt(), keepReleaseWindow(), NEWS_IMPACT_SCALE, NewsImpactPreview, newsImpactRange(), NewsImpactStock (+14 more)

### Community 2 - "host-console.tsx"
Cohesion: 0.08
Nodes (29): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+21 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.07
Nodes (26): a, assert, b, calm, closing, context, contextReading, effectWorld (+18 more)

### Community 4 - "trader.tsx"
Cohesion: 0.05
Nodes (89): AudienceStage(), BatchReport(), CANDLE_LINE, CandleChart(), CANDLES, CANNON, COINS, CONFETTI (+81 more)

### Community 5 - "Cloud setup"
Cohesion: 0.29
Nodes (6): Cloud setup, Environment (detected 2026-11-02), First-time setup (new clone or new environment), Limitations, Persistence, Updates

### Community 6 - "DalaalMark"
Cohesion: 0.13
Nodes (17): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+9 more)

### Community 7 - "skills-bootstrap.sh"
Cohesion: 0.53
Nodes (5): bad(), install_cli(), ok(), PATH, skills-bootstrap.sh script

### Community 8 - "engine-smoke.cjs"
Cohesion: 0.07
Nodes (26): activeBrainWorld, activePlan, assert, autonomousWorld, boundedSpacingWorld, compact, covered, deltaChart (+18 more)

### Community 9 - "types.ts"
Cohesion: 0.13
Nodes (14): AutonomousNews, AutonomousNewsIntensity, AutonomousNewsLogEntry, AutonomousNewsReading, AutonomousNewsResponse, AutonomousPacingFactor, Candle, Controls (+6 more)

### Community 10 - "catalog.ts"
Cohesion: 0.14
Nodes (10): economyStories, INDEX_WEIGHTS, NEWS_CATALOG_VERSION, NEWS_PRESETS, NewsPreset, rows, sectorStories, STOCK_SYMBOLS (+2 more)

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "package.json"
Cohesion: 0.15
Nodes (16): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+8 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.08
Nodes (23): 25 companies, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Bells and countdown sound, Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+15 more)

### Community 15 - "market-sound.ts"
Cohesion: 0.18
Nodes (21): bellBuffer(), bellCache, BellKind, chime(), countdownTick(), fanfare(), GONG, gongStrike() (+13 more)

### Community 16 - "next"
Cohesion: 0.08
Nodes (33): AudiencePage(), dynamic, initialSession(), mergeChartData(), Metric(), sessionStorageKey(), Trader(), returnToReady() (+25 more)

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "chooseAutonomousNewsPlan"
Cohesion: 0.31
Nodes (10): activeTerminalPlayers(), chooseAutonomousNewsPlan(), clamp(), latestSet(), readAutonomousNewsSignals(), readNewsResponse(), scopeOf(), storyKey() (+2 more)

### Community 21 - "brain-scenarios.cjs"
Cohesion: 0.20
Nodes (8): assert, fs, modes, ts, newsContradicts(), Story, validateNewsSelection(), News

### Community 22 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 23 - "next"
Cohesion: 0.25
Nodes (5): POST(), runtime, config, next, clearHostSession()

### Community 24 - "typescript"
Cohesion: 0.14
Nodes (12): typescript@5.9.3, typescript, assert, cases, fs, ts, assert, fs (+4 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "host-auth.ts"
Cohesion: 0.43
Nodes (5): POST(), runtime, checkPassword(), createHostSession(), signature()

### Community 27 - "short-batch-check.cjs"
Cohesion: 0.33
Nodes (5): assert, fs, full, summary, ts

### Community 28 - "autonomous-news.ts"
Cohesion: 0.26
Nodes (10): NEWS_AUTO_MAX_INTERVAL_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS, NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_IMPACT_DECAY, NEWS_IMPACT_DURATION_MULTIPLIER, NEWS_IMPACT_FADE_THRESHOLD, NEWS_REACTION_SECONDS, PREVIOUS_NEWS_IMPACT_DECAY (+2 more)

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.15
Nodes (11): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+3 more)

### Community 30 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, start

### Community 33 - "trading-flow-check.cjs"
Cohesion: 0.15
Nodes (9): assert, fs, Module, {NextRequest}, now, path, storePath, ts (+1 more)

### Community 45 - "news-live-check.cjs"
Cohesion: 0.36
Nodes (8): affects(), assert, expectDirection(), fs, rank(), scope(), ts, winners()

### Community 77 - "Skills architecture"
Cohesion: 0.22
Nodes (7): Dalaal Street — agent instructions, graphify, Skills: how they work together, Flow, Hooks in `.claude/settings.json`, Skills architecture, What runs where

## Knowledge Gaps
- **1 isolated node(s):** `PATH`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 349 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `store.ts`, `trading-flow-check.cjs`, `DalaalMark`, `package.json`, `next`, `layout.tsx`, `host-auth.ts`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05515832482124617 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `store.ts`, `trading-flow-check.cjs`, `news-behavior-check.cjs`, `trader.tsx`, `engine-smoke.cjs`, `price-tick-check.cjs`, `package.json`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `brain-scenarios.cjs`, `brain-pacing-check.cjs`, `brain-settings-check.cjs`, `short-batch-check.cjs`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13768115942028986 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `next` to `host-console.tsx`, `trader.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `host-console.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07564102564102564 - nodes in this community are weakly interconnected._