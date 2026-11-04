# Graph Report - ds-pratibimb  (2026-11-04)

## Corpus Check
- 82 files · ~68,983 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 22 file(s) not represented in the graph (top: .css 17, (none) 2, .example 1)

## Summary
- 749 nodes · 1568 edges · 37 communities (32 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `89432ae5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- engine.ts
- HostConsole
- news-behavior-check.cjs
- audience-stage.tsx
- Cloud setup
- host-console.tsx
- skills-bootstrap.sh
- engine-smoke.cjs
- host-auth.ts
- typescript
- Health check and recovery
- price-tick-check.cjs
- trading-flow-check.cjs
- Dalaal Street
- market-sound.ts
- types.ts
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- game-logs-check.cjs
- brain-pacing-check.cjs
- host-logs.tsx
- Trader
- typescript
- brain-settings-check.cjs
- Using the skills
- host-sessions.ts
- endurance-check.cjs
- package.json
- equity
- hall-of-fame-check.cjs
- news-live-check.cjs
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 46 edges
2. `advance()` - 34 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 27 edges
5. `AudienceStage()` - 25 edges
6. `next` - 23 edges
7. `typescript` - 21 edges
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
- `GET()` --calls--> `advanceForPoll()`  [EXTRACTED]
  app/api/game/route.ts → src/game/engine.ts

## Import Cycles
- None detected.

## Communities (37 total, 5 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.05
Nodes (58): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, GET(), POST() (+50 more)

### Community 1 - "engine.ts"
Cohesion: 0.07
Nodes (79): dynamic, errorResponse(), GET(), modeOf(), POST(), readTerminal(), runtime, touchSession() (+71 more)

### Community 2 - "HostConsole"
Cohesion: 0.13
Nodes (10): HostConsole(), HostMetric(), money(), NewsDirectionIcon(), signedMoney(), Slider(), dynamic, HostPage() (+2 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.06
Nodes (33): assert, fs, modes, ts, a, assert, b, calm (+25 more)

### Community 4 - "audience-stage.tsx"
Cohesion: 0.05
Nodes (97): AudiencePage(), dynamic, AudienceStage(), Award, BatchReport(), CANDLE_LINE, CandleChart(), CANDLES (+89 more)

### Community 5 - "Cloud setup"
Cohesion: 0.29
Nodes (6): Cloud setup, Environment (detected 2026-11-02), First-time setup (new clone or new environment), Limitations, Persistence, Updates

### Community 6 - "host-console.tsx"
Cohesion: 0.15
Nodes (13): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, act(), HostWorld (+5 more)

### Community 7 - "skills-bootstrap.sh"
Cohesion: 0.53
Nodes (5): bad(), install_cli(), ok(), PATH, skills-bootstrap.sh script

### Community 8 - "engine-smoke.cjs"
Cohesion: 0.07
Nodes (26): activeBrainWorld, activePlan, assert, autonomousWorld, boundedSpacingWorld, compact, covered, deltaChart (+18 more)

### Community 9 - "host-auth.ts"
Cohesion: 0.26
Nodes (9): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), isHost() (+1 more)

### Community 10 - "typescript"
Cohesion: 0.33
Nodes (5): assert, fs, full, summary, ts

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "trading-flow-check.cjs"
Cohesion: 0.15
Nodes (9): assert, fs, Module, {NextRequest}, now, path, storePath, ts (+1 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.07
Nodes (26): 25 companies, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Bells and countdown sound, Compact brain and situation-aware pacing, Dalaal Street, Endurance (20 batches), Favour a terminal (News brain), Host brain details (+18 more)

### Community 15 - "market-sound.ts"
Cohesion: 0.18
Nodes (23): applause(), bellBuffer(), bellCache, BellKind, chime(), chimes(), countdownTick(), fanfare() (+15 more)

### Community 16 - "types.ts"
Cohesion: 0.12
Nodes (15): AutonomousNews, AutonomousNewsIntensity, AutonomousNewsLogEntry, AutonomousNewsReading, AutonomousNewsResponse, AutonomousPacingFactor, Candle, Controls (+7 more)

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "game-logs-check.cjs"
Cohesion: 0.15
Nodes (11): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+3 more)

### Community 21 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 22 - "host-logs.tsx"
Cohesion: 0.40
Nodes (3): HostLogs(), labels, GameLog

### Community 23 - "Trader"
Cohesion: 0.06
Nodes (39): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+31 more)

### Community 24 - "typescript"
Cohesion: 0.11
Nodes (15): typescript@5.9.3, typescript, assert, cases, fs, ts, assert, fs (+7 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "Using the skills"
Cohesion: 0.33
Nodes (5): Examples, Graphify — understand first, Ponytail — implement with discipline, Taste — design with intent (UI work only), Using the skills

### Community 27 - "host-sessions.ts"
Cohesion: 0.50
Nodes (4): groupTerminalSessions(), lastSeen(), ParticipantGroup, Player

### Community 28 - "endurance-check.cjs"
Cohesion: 0.18
Nodes (10): assert, at, first5, fs, last5, LIMIT, peak, sizes (+2 more)

### Community 29 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+11 more)

### Community 30 - "equity"
Cohesion: 0.67
Nodes (3): equity(), positionValue(), shortUnrealizedPnl()

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 376 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Trader` to `store.ts`, `engine.ts`, `host-auth.ts`, `trading-flow-check.cjs`, `layout.tsx`, `game-logs-check.cjs`, `package.json`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050203527815468114 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `store.ts`, `news-behavior-check.cjs`, `audience-stage.tsx`, `hall-of-fame-check.cjs`, `engine-smoke.cjs`, `typescript`, `price-tick-check.cjs`, `news-live-check.cjs`, `trading-flow-check.cjs`, `audience-leaderboard-check.cjs`, `game-logs-check.cjs`, `brain-pacing-check.cjs`, `brain-settings-check.cjs`, `endurance-check.cjs`, `package.json`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0711484593837535 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `audience-stage.tsx` to `Using the skills`, `Trader`, `host-console.tsx`, `equity`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `HostConsole` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._