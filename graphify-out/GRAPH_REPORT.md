# Graph Report - ds-pratibimb  (2026-11-03)

## Corpus Check
- 74 files · ~57,925 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: .css 16, (none) 2, .example 1)

## Summary
- 666 nodes · 1375 edges · 37 communities (32 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `adf5b33d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- types.ts
- host-auth.ts
- news-behavior-check.cjs
- trader.tsx
- Cloud setup
- Using the skills
- skills-bootstrap.sh
- engine-smoke.cjs
- market-sound.ts
- host-console.tsx
- Health check and recovery
- price-tick-check.cjs
- package.json
- Dalaal Street
- HostConsole
- animation-switches-check.cjs
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- types.ts
- trader-parts.tsx
- brain-pacing-check.cjs
- host-sessions.ts
- ref_node_fs
- brain-settings-check.cjs
- host-logs.tsx
- catalog.ts
- autonomous-news.ts
- game-logs-check.cjs
- brain-mix-check.cjs
- trading-flow-check.cjs
- news-live-check.cjs
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 42 edges
2. `advance()` - 36 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 27 edges
5. `next` - 23 edges
6. `AudienceStage()` - 21 edges
7. `mutate()` - 18 edges
8. `typescript` - 17 edges
9. `chooseAutonomousNewsPlan()` - 17 edges
10. `recordGameLog()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Examples` --references--> `Trader()`  [INFERRED]
  docs/skills/SKILLS_USAGE.md → app/components/trader.tsx
- `VersionHome()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/page.tsx → src/ui-options.ts
- `VersionedPlayPage()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/play/page.tsx → src/ui-options.ts
- `GET()` --indirect_call--> `advance()`  [INFERRED]
  app/api/auto/route.ts → src/game/engine.ts
- `GET()` --indirect_call--> `advance()`  [INFERRED]
  app/api/host/route.ts → src/game/engine.ts

## Import Cycles
- None detected.

## Communities (37 total, 5 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.09
Nodes (27): assert, before, fs, now, original, restored, stored, ts (+19 more)

### Community 1 - "types.ts"
Cohesion: 0.06
Nodes (84): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, errorResponse(), GET() (+76 more)

### Community 2 - "host-auth.ts"
Cohesion: 0.27
Nodes (8): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), signature()

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.07
Nodes (26): a, assert, b, calm, closing, context, contextReading, effectWorld (+18 more)

### Community 4 - "trader.tsx"
Cohesion: 0.05
Nodes (84): AudiencePage(), dynamic, AudienceStage(), CANDLE_LINE, CANDLES, CONFETTI, CountdownScene(), DIGITS (+76 more)

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

### Community 9 - "market-sound.ts"
Cohesion: 0.25
Nodes (14): BellKind, chime(), countdownTick(), electricBell(), GONG, gongStrike(), knock(), noise() (+6 more)

### Community 10 - "host-console.tsx"
Cohesion: 0.17
Nodes (12): describeHostAction(), editableControls(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, act(), HostMetric(), HostWorld (+4 more)

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (20): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+12 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.09
Nodes (22): 25 companies, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Bells and countdown sound, Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+14 more)

### Community 15 - "HostConsole"
Cohesion: 0.14
Nodes (9): fmtTime(), HostConsole(), money(), NewsDirectionIcon(), signedMoney(), Slider(), dynamic, HostPage() (+1 more)

### Community 16 - "animation-switches-check.cjs"
Cohesion: 0.25
Nodes (7): typescript@5.9.3, typescript, assert, fs, ts, w, ANIMATIONS

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (19): assert, finisher, fs, idle, join(), legacy, now, played() (+11 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "types.ts"
Cohesion: 0.09
Nodes (21): assert, fs, modes, ts, newsContradicts(), Story, validateNewsSelection(), AutonomousNewsIntensity (+13 more)

### Community 21 - "trader-parts.tsx"
Cohesion: 0.11
Nodes (21): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+13 more)

### Community 22 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 23 - "host-sessions.ts"
Cohesion: 0.40
Nodes (5): groupTerminalSessions(), lastSeen(), ParticipantGroup, TERMINAL_COUNT, Player

### Community 24 - "ref_node_fs"
Cohesion: 0.22
Nodes (6): assert, fs, ts, assert, fs, ts

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "host-logs.tsx"
Cohesion: 0.40
Nodes (3): HostLogs(), labels, GameLog

### Community 27 - "catalog.ts"
Cohesion: 0.14
Nodes (10): economyStories, INDEX_WEIGHTS, NEWS_CATALOG_VERSION, NEWS_PRESETS, NewsPreset, rows, sectorStories, STOCK_SYMBOLS (+2 more)

### Community 28 - "autonomous-news.ts"
Cohesion: 0.36
Nodes (11): activeTerminalPlayers(), chooseAutonomousNewsPlan(), clamp(), latestSet(), readAutonomousNewsSignals(), readNewsResponse(), scopeOf(), storyKey() (+3 more)

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.15
Nodes (11): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+3 more)

### Community 30 - "brain-mix-check.cjs"
Cohesion: 0.33
Nodes (4): assert, cases, fs, ts

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 331 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `trader.tsx` to `types.ts`, `host-auth.ts`, `trading-flow-check.cjs`, `package.json`, `layout.tsx`, `trader-parts.tsx`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `advance()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`advance()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08505747126436781 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `animation-switches-check.cjs` to `store.ts`, `trading-flow-check.cjs`, `news-behavior-check.cjs`, `engine-smoke.cjs`, `price-tick-check.cjs`, `package.json`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `types.ts`, `brain-pacing-check.cjs`, `ref_node_fs`, `brain-settings-check.cjs`, `game-logs-check.cjs`, `brain-mix-check.cjs`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06422466422466422 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `types.ts`, `Using the skills`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._