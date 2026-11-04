# Graph Report - ds-pratibimb  (2026-11-04)

## Corpus Check
- 84 files · ~71,531 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .css 17, (none) 2, .log 2)

## Summary
- 768 nodes · 1613 edges · 45 communities (38 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8834edee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- engine.ts
- host-console.tsx
- news-behavior-check.cjs
- audience-stage.tsx
- Cloud setup
- trader-parts.tsx
- skills-bootstrap.sh
- engine-smoke.cjs
- animation-switches-check.cjs
- catalog.ts
- Health check and recovery
- price-tick-check.cjs
- game-logs-check.cjs
- Dalaal Street
- market-sound.ts
- host-auth.ts
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- types.ts
- brain-mix-check.cjs
- [version]/play/[terminal]/page.tsx
- trading-flow-check.cjs
- typescript
- brain-settings-check.cjs
- Using the skills
- host-feedback.tsx
- endurance-check.cjs
- package.json
- brain-scenarios.cjs
- isValidTerminalPath
- brain-pacing-check.cjs
- ui-options.ts
- typescript
- host-logs.tsx
- hall-of-fame-check.cjs
- next
- host-sessions.ts
- host/page.tsx
- news-live-check.cjs
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 46 edges
2. `advance()` - 34 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 28 edges
5. `AudienceStage()` - 25 edges
6. `next` - 24 edges
7. `typescript` - 21 edges
8. `mutate()` - 19 edges
9. `money()` - 17 edges
10. `chooseAutonomousNewsPlan()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Examples` --references--> `Trader()`  [INFERRED]
  docs/skills/SKILLS_USAGE.md → app/components/trader.tsx
- `VersionHome()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/page.tsx → src/ui-options.ts
- `VersionedNumberedPlayPage()` --calls--> `isValidTerminalPath()`  [EXTRACTED]
  app/[version]/play/[terminal]/page.tsx → src/game/terminals.ts
- `VersionedPlayPage()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/play/page.tsx → src/ui-options.ts
- `POST()` --calls--> `advance()`  [EXTRACTED]
  app/api/auto/route.ts → src/game/engine.ts

## Import Cycles
- None detected.

## Communities (45 total, 7 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.07
Nodes (50): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, GET(), runtime (+42 more)

### Community 1 - "engine.ts"
Cohesion: 0.06
Nodes (86): dynamic, errorResponse(), GET(), modeOf(), POST(), readTerminal(), runtime, touchSession() (+78 more)

### Community 2 - "host-console.tsx"
Cohesion: 0.11
Nodes (21): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+13 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.07
Nodes (26): a, assert, b, calm, closing, context, contextReading, effectWorld (+18 more)

### Community 4 - "audience-stage.tsx"
Cohesion: 0.05
Nodes (94): AudiencePage(), dynamic, AudienceStage(), Award, BatchReport(), CANDLE_LINE, CandleChart(), CANDLES (+86 more)

### Community 5 - "Cloud setup"
Cohesion: 0.29
Nodes (6): Cloud setup, Environment (detected 2026-11-02), First-time setup (new clone or new environment), Limitations, Persistence, Updates

### Community 6 - "trader-parts.tsx"
Cohesion: 0.12
Nodes (20): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+12 more)

### Community 7 - "skills-bootstrap.sh"
Cohesion: 0.53
Nodes (5): bad(), install_cli(), ok(), PATH, skills-bootstrap.sh script

### Community 8 - "engine-smoke.cjs"
Cohesion: 0.07
Nodes (26): activeBrainWorld, activePlan, assert, autonomousWorld, boundedSpacingWorld, compact, covered, deltaChart (+18 more)

### Community 9 - "animation-switches-check.cjs"
Cohesion: 0.33
Nodes (5): assert, fs, ts, w, ANIMATIONS

### Community 10 - "catalog.ts"
Cohesion: 0.15
Nodes (9): economyStories, NEWS_CATALOG_VERSION, NEWS_PRESETS, NewsPreset, rows, sectorStories, STOCK_SYMBOLS, stockStories (+1 more)

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "game-logs-check.cjs"
Cohesion: 0.15
Nodes (11): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+3 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.07
Nodes (26): 25 companies, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Bells and countdown sound, Compact brain and situation-aware pacing, Dalaal Street, Endurance (20 batches), Favour a terminal (News brain), Host brain details (+18 more)

### Community 15 - "market-sound.ts"
Cohesion: 0.16
Nodes (25): applause(), bellBuffer(), bellCache, BellKind, chime(), chimes(), countdownTick(), fanfare() (+17 more)

### Community 16 - "host-auth.ts"
Cohesion: 0.27
Nodes (8): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), signature()

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "types.ts"
Cohesion: 0.12
Nodes (16): AutonomousNews, AutonomousNewsIntensity, AutonomousNewsLogEntry, AutonomousNewsReading, AutonomousNewsResponse, AutonomousPacingFactor, Candle, Controls (+8 more)

### Community 21 - "brain-mix-check.cjs"
Cohesion: 0.33
Nodes (4): assert, cases, fs, ts

### Community 22 - "[version]/play/[terminal]/page.tsx"
Cohesion: 0.31
Nodes (6): dynamic, VersionedAudiencePage(), VersionHome(), dynamic, VersionedNumberedPlayPage(), uiVariantForVersion()

### Community 23 - "trading-flow-check.cjs"
Cohesion: 0.15
Nodes (9): assert, fs, Module, {NextRequest}, now, path, storePath, ts (+1 more)

### Community 24 - "typescript"
Cohesion: 0.14
Nodes (11): assert, fs, ts, assert, fs, ts, assert, fs (+3 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "Using the skills"
Cohesion: 0.33
Nodes (5): Examples, Graphify — understand first, Ponytail — implement with discipline, Taste — design with intent (UI work only), Using the skills

### Community 27 - "host-feedback.tsx"
Cohesion: 0.39
Nodes (7): avg(), fmt(), HostFeedback(), matches(), pad2(), RATING_FILTERS, FeedbackRow

### Community 28 - "endurance-check.cjs"
Cohesion: 0.18
Nodes (10): assert, at, first5, fs, last5, LIMIT, peak, sizes (+2 more)

### Community 29 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, next@16.4.5, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+11 more)

### Community 30 - "brain-scenarios.cjs"
Cohesion: 0.22
Nodes (7): assert, fs, modes, ts, newsContradicts(), Story, validateNewsSelection()

### Community 31 - "isValidTerminalPath"
Cohesion: 0.32
Nodes (6): dynamic, NumberedPlayPage(), dynamic, NumberedTestPage(), UiPreviewOptionPage(), isValidTerminalPath()

### Community 32 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 33 - "ui-options.ts"
Cohesion: 0.39
Nodes (5): dynamic, UiPreviewAudiencePage(), dynamic, UI_OPTIONS, UiVariant

### Community 34 - "typescript"
Cohesion: 0.29
Nodes (5): typescript@5.9.3, typescript, assert, fs, ts

### Community 35 - "host-logs.tsx"
Cohesion: 0.40
Nodes (3): HostLogs(), labels, GameLog

### Community 36 - "hall-of-fame-check.cjs"
Cohesion: 0.20
Nodes (8): assert, at, fs, now, pub, t, ts, w

### Community 38 - "host-sessions.ts"
Cohesion: 0.50
Nodes (4): groupTerminalSessions(), lastSeen(), ParticipantGroup, Player

### Community 45 - "news-live-check.cjs"
Cohesion: 0.36
Nodes (8): affects(), assert, expectDirection(), fs, rank(), scope(), ts, winners()

### Community 77 - "Skills architecture"
Cohesion: 0.22
Nodes (7): Dalaal Street — agent instructions, graphify, Skills: how they work together, Flow, Hooks in `.claude/settings.json`, Skills architecture, What runs where

## Knowledge Gaps
- **1 isolated node(s):** `PATH`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 381 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `store.ts`, `engine.ts`, `ui-options.ts`, `trader-parts.tsx`, `game-logs-check.cjs`, `host-auth.ts`, `layout.tsx`, `[version]/play/[terminal]/page.tsx`, `trading-flow-check.cjs`, `package.json`, `isValidTerminalPath`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06558441558441558 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `brain-pacing-check.cjs`, `store.ts`, `news-behavior-check.cjs`, `hall-of-fame-check.cjs`, `engine-smoke.cjs`, `animation-switches-check.cjs`, `price-tick-check.cjs`, `game-logs-check.cjs`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `brain-mix-check.cjs`, `trading-flow-check.cjs`, `typescript`, `brain-settings-check.cjs`, `endurance-check.cjs`, `package.json`, `brain-scenarios.cjs`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06404862085086489 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `audience-stage.tsx` to `ui-options.ts`, `host-console.tsx`, `[version]/play/[terminal]/page.tsx`, `Using the skills`, `isValidTerminalPath`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `host-console.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10846560846560846 - nodes in this community are weakly interconnected._