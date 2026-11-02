# Graph Report - ds-pratibimb  (2026-11-02)

## Corpus Check
- 69 files · ~52,726 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: .css 16, (none) 2, .example 1)

## Summary
- 626 nodes · 1290 edges · 34 communities (29 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c870aaf4`
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
- autonomous-news.ts
- types.ts
- Health check and recovery
- engine.ts
- package.json
- Dalaal Street
- HostConsole
- brain-scenarios.cjs
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- brain-pacing-check.cjs
- catalog.ts
- host-console.tsx
- terminals.ts
- ref_node_fs
- brain-settings-check.cjs
- game-logs-check.cjs
- trading-flow-check.cjs
- news-live-check.cjs
- trader-parts.tsx
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 39 edges
2. `advance()` - 36 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 25 edges
5. `next` - 23 edges
6. `AudienceStage()` - 20 edges
7. `mutate()` - 18 edges
8. `chooseAutonomousNewsPlan()` - 17 edges
9. `recordGameLog()` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Examples` --references--> `Trader()`  [INFERRED]
  docs/skills/SKILLS_USAGE.md → app/components/trader.tsx
- `VersionHome()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/page.tsx → src/ui-options.ts
- `GET()` --indirect_call--> `advance()`  [INFERRED]
  app/api/auto/route.ts → src/game/engine.ts
- `GET()` --indirect_call--> `advance()`  [INFERRED]
  app/api/host/route.ts → src/game/engine.ts
- `StockTile()` --calls--> `Logo()`  [EXTRACTED]
  app/components/audience-stage.tsx → src/components/trader-parts.tsx

## Import Cycles
- None detected.

## Communities (34 total, 5 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.09
Nodes (27): assert, before, fs, now, restored, stored, ts, w (+19 more)

### Community 1 - "types.ts"
Cohesion: 0.11
Nodes (48): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, errorResponse(), GET() (+40 more)

### Community 2 - "next"
Cohesion: 0.08
Nodes (29): POST(), runtime, POST(), runtime, dynamic, NumberedPlayPage(), dynamic, NumberedTestPage() (+21 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.07
Nodes (26): a, assert, b, calm, closing, context, contextReading, effectWorld (+18 more)

### Community 4 - "trader.tsx"
Cohesion: 0.08
Nodes (63): AudiencePage(), dynamic, AudienceStage(), BellKind, CANDLE_LINE, CANDLES, CONFETTI, CountdownScene() (+55 more)

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

### Community 9 - "autonomous-news.ts"
Cohesion: 0.20
Nodes (18): activeTerminalPlayers(), chooseAutonomousNewsPlan(), clamp(), latestSet(), readAutonomousNewsSignals(), readNewsResponse(), scopeOf(), storyKey() (+10 more)

### Community 10 - "types.ts"
Cohesion: 0.10
Nodes (19): labels, AutonomousNews, AutonomousNewsIntensity, AutonomousNewsLogEntry, AutonomousNewsReading, AutonomousNewsResponse, AutonomousPacingFactor, Candle (+11 more)

### Community 12 - "engine.ts"
Cohesion: 0.14
Nodes (20): advanceNewsReaction(), BOT_PERSONALITIES, NEWS_IMPACT_SCALE, NewsImpactPreview, newsImpactRange(), NewsImpactStock, newsScope(), positionValue() (+12 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+11 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.09
Nodes (22): 25 companies, Audience bells, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+14 more)

### Community 15 - "HostConsole"
Cohesion: 0.13
Nodes (8): fmtTime(), HostConsole(), NewsDirectionIcon(), Slider(), HostLogs(), dynamic, HostPage(), newsImpactRemainingSeconds()

### Community 16 - "brain-scenarios.cjs"
Cohesion: 0.20
Nodes (8): assert, fs, modes, ts, newsContradicts(), Story, validateNewsSelection(), News

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 21 - "catalog.ts"
Cohesion: 0.12
Nodes (12): economyStories, INDEX_WEIGHTS, makeNews(), makeStocks(), NEWS_CATALOG_VERSION, NEWS_PRESETS, NewsPreset, rows (+4 more)

### Community 22 - "host-console.tsx"
Cohesion: 0.16
Nodes (13): describeHostAction(), editableControls(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, act(), HostMetric(), HostWorld (+5 more)

### Community 23 - "terminals.ts"
Cohesion: 0.38
Nodes (5): groupTerminalSessions(), lastSeen(), ParticipantGroup, TERMINAL_ACTIVE_WINDOW_MS, TERMINAL_COUNT

### Community 24 - "ref_node_fs"
Cohesion: 0.14
Nodes (12): typescript@5.9.3, typescript, assert, cases, fs, ts, assert, fs (+4 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.15
Nodes (11): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+3 more)

### Community 33 - "trading-flow-check.cjs"
Cohesion: 0.15
Nodes (9): assert, fs, Module, {NextRequest}, now, path, storePath, ts (+1 more)

### Community 45 - "news-live-check.cjs"
Cohesion: 0.36
Nodes (8): affects(), assert, expectDirection(), fs, rank(), scope(), ts, winners()

### Community 50 - "trader-parts.tsx"
Cohesion: 0.13
Nodes (20): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+12 more)

### Community 77 - "Skills architecture"
Cohesion: 0.22
Nodes (7): Dalaal Street — agent instructions, graphify, Skills: how they work together, Flow, Hooks in `.claude/settings.json`, Skills architecture, What runs where

## Knowledge Gaps
- **1 isolated node(s):** `PATH`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 309 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `types.ts`, `trading-flow-check.cjs`, `package.json`, `layout.tsx`, `trader-parts.tsx`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `advance()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`advance()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08505747126436781 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `ref_node_fs` to `store.ts`, `trading-flow-check.cjs`, `news-behavior-check.cjs`, `engine-smoke.cjs`, `package.json`, `news-live-check.cjs`, `brain-scenarios.cjs`, `audience-leaderboard-check.cjs`, `brain-pacing-check.cjs`, `brain-settings-check.cjs`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10980392156862745 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `trader-parts.tsx`, `next`, `Using the skills`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._