# Graph Report - ds-pratibimb  (2026-11-03)

## Corpus Check
- 72 files · ~54,606 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: .css 16, (none) 2, .example 1)

## Summary
- 650 nodes · 1338 edges · 33 communities (28 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f5da7a0f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- types.ts
- next
- news-behavior-check.cjs
- trader.tsx
- Cloud setup
- Using the skills
- skills-bootstrap.sh
- engine-smoke.cjs
- catalog.ts
- types.ts
- Health check and recovery
- price-tick-check.cjs
- package.json
- Dalaal Street
- host-console.tsx
- autonomous-news.ts
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- brain-scenarios.cjs
- TerminalEntry
- typescript
- brain-mix-check.cjs
- ref_node_fs
- brain-settings-check.cjs
- game-logs-check.cjs
- trading-flow-check.cjs
- news-live-check.cjs
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 41 edges
2. `advance()` - 36 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 25 edges
5. `next` - 23 edges
6. `AudienceStage()` - 21 edges
7. `mutate()` - 18 edges
8. `typescript` - 17 edges
9. `chooseAutonomousNewsPlan()` - 17 edges
10. `recordGameLog()` - 16 edges

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

## Communities (33 total, 5 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.07
Nodes (41): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, GET(), POST() (+33 more)

### Community 1 - "types.ts"
Cohesion: 0.10
Nodes (61): dynamic, errorResponse(), GET(), modeOf(), POST(), readTerminal(), runtime, touchSession() (+53 more)

### Community 2 - "next"
Cohesion: 0.08
Nodes (30): POST(), runtime, POST(), runtime, dynamic, NumberedPlayPage(), dynamic, NumberedTestPage() (+22 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.07
Nodes (26): a, assert, b, calm, closing, context, contextReading, effectWorld (+18 more)

### Community 4 - "trader.tsx"
Cohesion: 0.06
Nodes (80): AudiencePage(), dynamic, AutoPage(), dynamic, AudienceStage(), BellKind, CANDLE_LINE, CANDLES (+72 more)

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
Cohesion: 0.05
Nodes (40): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts, activeBrainWorld (+32 more)

### Community 9 - "catalog.ts"
Cohesion: 0.14
Nodes (10): economyStories, INDEX_WEIGHTS, NEWS_CATALOG_VERSION, NEWS_PRESETS, NewsPreset, rows, sectorStories, STOCK_SYMBOLS (+2 more)

### Community 10 - "types.ts"
Cohesion: 0.11
Nodes (18): labels, MAX_GAME_LOGS, AutonomousNews, AutonomousNewsIntensity, AutonomousNewsLogEntry, AutonomousNewsReading, AutonomousNewsResponse, AutonomousPacingFactor (+10 more)

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+11 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.09
Nodes (22): 25 companies, Audience bells, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+14 more)

### Community 15 - "host-console.tsx"
Cohesion: 0.08
Nodes (27): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+19 more)

### Community 16 - "autonomous-news.ts"
Cohesion: 0.23
Nodes (11): NEWS_AUTO_MAX_INTERVAL_SECONDS, NEWS_BASE_INTERVAL_MAX_SECONDS, NEWS_BASE_INTERVAL_MIN_SECONDS, NEWS_EFFECT_MAX_SECONDS, NEWS_EFFECT_MIN_SECONDS, NEWS_IMPACT_DECAY, NEWS_IMPACT_DRIFT_NORMALIZER, NEWS_IMPACT_DURATION_MULTIPLIER (+3 more)

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "brain-scenarios.cjs"
Cohesion: 0.20
Nodes (7): assert, fs, modes, ts, newsContradicts(), Story, News

### Community 21 - "TerminalEntry"
Cohesion: 0.32
Nodes (5): TerminalEntry(), dynamic, PlayPage(), dynamic, TestPage()

### Community 22 - "typescript"
Cohesion: 0.25
Nodes (7): typescript@5.9.3, typescript, assert, fs, ts, w, ANIMATIONS

### Community 23 - "brain-mix-check.cjs"
Cohesion: 0.33
Nodes (4): assert, cases, fs, ts

### Community 24 - "ref_node_fs"
Cohesion: 0.22
Nodes (6): assert, fs, ts, assert, fs, ts

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.17
Nodes (10): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+2 more)

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 325 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `store.ts`, `types.ts`, `trading-flow-check.cjs`, `trader.tsx`, `package.json`, `layout.tsx`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `advance()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`advance()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07246376811594203 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `store.ts`, `trading-flow-check.cjs`, `news-behavior-check.cjs`, `engine-smoke.cjs`, `price-tick-check.cjs`, `package.json`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `brain-scenarios.cjs`, `brain-mix-check.cjs`, `ref_node_fs`, `brain-settings-check.cjs`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09672619047619048 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `types.ts`, `next`, `Using the skills`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._