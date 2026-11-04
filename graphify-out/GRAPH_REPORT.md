# Graph Report - ds-pratibimb  (2026-11-04)

## Corpus Check
- 80 files · ~66,133 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: .css 17, (none) 2, .example 1)

## Summary
- 726 nodes · 1528 edges · 33 communities (28 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d25f7df1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- engine.ts
- host-console.tsx
- news-behavior-check.cjs
- audience-stage.tsx
- Cloud setup
- next
- skills-bootstrap.sh
- engine-smoke.cjs
- animation-switches-check.cjs
- typescript
- Health check and recovery
- price-tick-check.cjs
- package.json
- Dalaal Street
- market-sound.ts
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- brain-scenarios.cjs
- brain-pacing-check.cjs
- ref_node_assert
- brain-settings-check.cjs
- host-auth.ts
- game-logs-check.cjs
- typescript
- Using the skills
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
7. `typescript` - 19 edges
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

## Communities (33 total, 5 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.07
Nodes (49): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, GET(), POST() (+41 more)

### Community 1 - "engine.ts"
Cohesion: 0.07
Nodes (84): dynamic, errorResponse(), GET(), modeOf(), POST(), readTerminal(), runtime, touchSession() (+76 more)

### Community 2 - "host-console.tsx"
Cohesion: 0.05
Nodes (46): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+38 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.05
Nodes (35): a, assert, b, calm, closing, context, contextReading, effectWorld (+27 more)

### Community 4 - "audience-stage.tsx"
Cohesion: 0.06
Nodes (87): AudiencePage(), dynamic, AudienceStage(), Award, BatchReport(), CANDLE_LINE, CandleChart(), CANDLES (+79 more)

### Community 5 - "Cloud setup"
Cohesion: 0.29
Nodes (6): Cloud setup, Environment (detected 2026-11-02), First-time setup (new clone or new environment), Limitations, Persistence, Updates

### Community 6 - "next"
Cohesion: 0.06
Nodes (40): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+32 more)

### Community 7 - "skills-bootstrap.sh"
Cohesion: 0.53
Nodes (5): bad(), install_cli(), ok(), PATH, skills-bootstrap.sh script

### Community 8 - "engine-smoke.cjs"
Cohesion: 0.07
Nodes (26): activeBrainWorld, activePlan, assert, autonomousWorld, boundedSpacingWorld, compact, covered, deltaChart (+18 more)

### Community 9 - "animation-switches-check.cjs"
Cohesion: 0.22
Nodes (8): assert, fs, ts, w, ANIMATION_KEYS, AnimationInfo, ANIMATIONS, AnimationScreen

### Community 10 - "typescript"
Cohesion: 0.25
Nodes (7): typescript@5.9.3, typescript, assert, fs, full, summary, ts

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+11 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.08
Nodes (23): 25 companies, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Bells and countdown sound, Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+15 more)

### Community 15 - "market-sound.ts"
Cohesion: 0.18
Nodes (21): bellBuffer(), bellCache, BellKind, chime(), countdownTick(), fanfare(), GONG, gongStrike() (+13 more)

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 21 - "brain-scenarios.cjs"
Cohesion: 0.29
Nodes (4): assert, fs, modes, ts

### Community 22 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 24 - "ref_node_assert"
Cohesion: 0.22
Nodes (6): assert, fs, ts, assert, fs, ts

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "host-auth.ts"
Cohesion: 0.27
Nodes (8): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), signature()

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.08
Nodes (20): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+12 more)

### Community 30 - "typescript"
Cohesion: 0.33
Nodes (4): assert, cases, fs, ts

### Community 31 - "Using the skills"
Cohesion: 0.33
Nodes (5): Examples, Graphify — understand first, Ponytail — implement with discipline, Taste — design with intent (UI work only), Using the skills

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 359 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `store.ts`, `engine.ts`, `package.json`, `layout.tsx`, `host-auth.ts`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06848357791754019 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `store.ts`, `news-behavior-check.cjs`, `hall-of-fame-check.cjs`, `engine-smoke.cjs`, `animation-switches-check.cjs`, `price-tick-check.cjs`, `package.json`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `brain-scenarios.cjs`, `brain-pacing-check.cjs`, `ref_node_assert`, `brain-settings-check.cjs`, `game-logs-check.cjs`, `typescript`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06521739130434782 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `audience-stage.tsx` to `host-console.tsx`, `next`, `Using the skills`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `host-console.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050816696914700546 - nodes in this community are weakly interconnected._