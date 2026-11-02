# Graph Report - ds-pratibimb  (2026-11-02)

## Corpus Check
- 66 files · ~48,997 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: .css 15, (none) 2, .example 1)

## Summary
- 592 nodes · 1211 edges · 34 communities (29 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf2fd9df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- trader.tsx
- types.ts
- autonomous-news.ts
- news-behavior-check.cjs
- audience-stage.tsx
- Cloud setup
- Using the skills
- skills-bootstrap.sh
- engine-smoke.cjs
- engine.ts
- HostConsole
- Health check and recovery
- host-console.tsx
- catalog.ts
- Dalaal Street
- host-auth.ts
- brain-scenarios.cjs
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- brain-pacing-check.cjs
- chooseAutonomousNewsPlan
- host-sessions.ts
- ref_node_fs
- brain-settings-check.cjs
- game-logs-check.cjs
- trading-flow-check.cjs
- package.json
- news-live-check.cjs
- trader-parts.tsx
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `advance()` - 36 edges
2. `Trader()` - 35 edges
3. `hostAction()` - 30 edges
4. `HostConsole()` - 25 edges
5. `next` - 23 edges
6. `AudienceStage()` - 19 edges
7. `chooseAutonomousNewsPlan()` - 17 edges
8. `recordGameLog()` - 16 edges
9. `mutate()` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Examples` --references--> `Trader()`  [INFERRED]
  docs/skills/SKILLS_USAGE.md → app/components/trader.tsx
- `GET()` --indirect_call--> `advance()`  [INFERRED]
  app/api/auto/route.ts → src/game/engine.ts
- `GET()` --indirect_call--> `advance()`  [INFERRED]
  app/api/host/route.ts → src/game/engine.ts
- `VersionHome()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/page.tsx → src/ui-options.ts
- `POST()` --calls--> `advance()`  [EXTRACTED]
  app/api/auto/route.ts → src/game/engine.ts

## Import Cycles
- None detected.

## Communities (34 total, 5 thin omitted)

### Community 0 - "trader.tsx"
Cohesion: 0.09
Nodes (32): AudiencePage(), dynamic, initialSession(), mergeChartData(), Metric(), Props, sessionStorageKey(), Trader() (+24 more)

### Community 1 - "types.ts"
Cohesion: 0.07
Nodes (44): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, GET(), POST() (+36 more)

### Community 2 - "autonomous-news.ts"
Cohesion: 0.21
Nodes (12): INDEX_WEIGHTS, NEWS_AUTO_MAX_INTERVAL_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS, NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_EFFECT_MAX_SECONDS, NEWS_EFFECT_MIN_SECONDS, NEWS_IMPACT_DECAY, NEWS_IMPACT_DRIFT_NORMALIZER (+4 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.07
Nodes (26): a, assert, b, calm, closing, context, contextReading, effectWorld (+18 more)

### Community 4 - "audience-stage.tsx"
Cohesion: 0.11
Nodes (39): AudienceStage(), BellKind, CANDLE_LINE, CANDLES, CONFETTI, CountdownScene(), glyphPoints(), Icon() (+31 more)

### Community 5 - "Cloud setup"
Cohesion: 0.29
Nodes (6): Cloud setup, Environment (detected 2026-11-02), First-time setup (new clone or new environment), Limitations, Persistence, Updates

### Community 6 - "Using the skills"
Cohesion: 0.33
Nodes (5): Examples, Graphify — understand first, Ponytail — implement with discipline, Taste — design with intent (UI work only), Using the skills

### Community 7 - "skills-bootstrap.sh"
Cohesion: 0.53
Nodes (5): bad(), install_cli(), ok(), PATH, skills-bootstrap.sh script

### Community 8 - "engine-smoke.cjs"
Cohesion: 0.07
Nodes (26): activeBrainWorld, activePlan, assert, autonomousWorld, boundedSpacingWorld, compact, covered, deltaChart (+18 more)

### Community 9 - "engine.ts"
Cohesion: 0.10
Nodes (60): dynamic, errorResponse(), GET(), modeOf(), POST(), readTerminal(), runtime, touchSession() (+52 more)

### Community 10 - "HostConsole"
Cohesion: 0.15
Nodes (8): HostConsole(), HostMetric(), money(), NewsDirectionIcon(), signedMoney(), Slider(), dynamic, HostPage()

### Community 12 - "host-console.tsx"
Cohesion: 0.15
Nodes (12): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, act(), HostWorld (+4 more)

### Community 13 - "catalog.ts"
Cohesion: 0.15
Nodes (9): economyStories, NEWS_CATALOG_VERSION, NEWS_PRESETS, NewsPreset, rows, sectorStories, STOCK_SYMBOLS, stockStories (+1 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.09
Nodes (22): 25 companies, Audience bells, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+14 more)

### Community 15 - "host-auth.ts"
Cohesion: 0.27
Nodes (8): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), signature()

### Community 16 - "brain-scenarios.cjs"
Cohesion: 0.20
Nodes (7): assert, fs, modes, ts, newsContradicts(), Story, News

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 21 - "chooseAutonomousNewsPlan"
Cohesion: 0.43
Nodes (7): activeTerminalPlayers(), chooseAutonomousNewsPlan(), clamp(), latestSet(), readNewsResponse(), scopeOf(), storyKey()

### Community 22 - "host-sessions.ts"
Cohesion: 0.40
Nodes (5): groupTerminalSessions(), lastSeen(), ParticipantGroup, TERMINAL_COUNT, Player

### Community 24 - "ref_node_fs"
Cohesion: 0.16
Nodes (9): typescript@5.9.3, typescript, assert, cases, fs, ts, assert, fs (+1 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.15
Nodes (10): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+2 more)

### Community 33 - "trading-flow-check.cjs"
Cohesion: 0.17
Nodes (9): assert, fs, Module, {NextRequest}, now, path, storePath, ts (+1 more)

### Community 37 - "package.json"
Cohesion: 0.12
Nodes (20): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+12 more)

### Community 45 - "news-live-check.cjs"
Cohesion: 0.36
Nodes (8): affects(), assert, expectDirection(), fs, rank(), scope(), ts, winners()

### Community 50 - "trader-parts.tsx"
Cohesion: 0.12
Nodes (21): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), Header() (+13 more)

### Community 77 - "Skills architecture"
Cohesion: 0.22
Nodes (7): Dalaal Street — agent instructions, graphify, Skills: how they work together, Flow, Hooks in `.claude/settings.json`, Skills architecture, What runs where

## Knowledge Gaps
- **1 isolated node(s):** `PATH`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 291 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `trader.tsx` to `types.ts`, `trading-flow-check.cjs`, `package.json`, `engine.ts`, `host-auth.ts`, `layout.tsx`, `trader-parts.tsx`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `advance()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`advance()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `trader.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09435707678075855 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `ref_node_fs` to `trading-flow-check.cjs`, `news-behavior-check.cjs`, `package.json`, `engine-smoke.cjs`, `news-live-check.cjs`, `brain-scenarios.cjs`, `audience-leaderboard-check.cjs`, `brain-pacing-check.cjs`, `brain-settings-check.cjs`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07020408163265306 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `engine.ts`, `trader-parts.tsx`, `audience-stage.tsx`, `Using the skills`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._