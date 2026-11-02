# Graph Report - ds-pratibimb  (2026-11-02)

## Corpus Check
- 70 files · ~53,212 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: .css 16, (none) 2, .example 1)

## Summary
- 638 nodes · 1304 edges · 28 communities (23 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d6c0f1b0`
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
- host-auth.ts
- autonomous-news.ts
- Health check and recovery
- price-tick-check.cjs
- package.json
- Dalaal Street
- host-console.tsx
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- ref_node_fs
- brain-settings-check.cjs
- game-logs-check.cjs
- trading-flow-check.cjs
- news-live-check.cjs
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 39 edges
2. `advance()` - 36 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 25 edges
5. `next` - 23 edges
6. `AudienceStage()` - 19 edges
7. `mutate()` - 18 edges
8. `chooseAutonomousNewsPlan()` - 17 edges
9. `typescript` - 16 edges
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

## Communities (28 total, 5 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.07
Nodes (39): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, GET(), runtime (+31 more)

### Community 1 - "types.ts"
Cohesion: 0.10
Nodes (61): dynamic, errorResponse(), GET(), modeOf(), POST(), readTerminal(), runtime, touchSession() (+53 more)

### Community 2 - "next"
Cohesion: 0.08
Nodes (27): TerminalEntry(), dynamic, PlayPage(), dynamic, NumberedPlayPage(), dynamic, TestPage(), dynamic (+19 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.05
Nodes (36): a, assert, b, calm, closing, context, contextReading, effectWorld (+28 more)

### Community 4 - "trader.tsx"
Cohesion: 0.06
Nodes (75): AudiencePage(), dynamic, AutoPage(), dynamic, AudienceStage(), BellKind, CANDLE_LINE, CANDLES (+67 more)

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

### Community 9 - "host-auth.ts"
Cohesion: 0.26
Nodes (9): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), isHost() (+1 more)

### Community 10 - "autonomous-news.ts"
Cohesion: 0.06
Nodes (47): labels, affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts (+39 more)

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
Nodes (29): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+21 more)

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (19): assert, finisher, fs, idle, join(), legacy, now, played() (+11 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

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

### Community 77 - "Skills architecture"
Cohesion: 0.22
Nodes (7): Dalaal Street — agent instructions, graphify, Skills: how they work together, Flow, Hooks in `.claude/settings.json`, Skills architecture, What runs where

## Knowledge Gaps
- **1 isolated node(s):** `PATH`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 319 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `store.ts`, `types.ts`, `trading-flow-check.cjs`, `trader.tsx`, `host-auth.ts`, `package.json`, `layout.tsx`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `advance()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`advance()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07188160676532769 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `ref_node_fs` to `store.ts`, `trading-flow-check.cjs`, `news-behavior-check.cjs`, `engine-smoke.cjs`, `autonomous-news.ts`, `price-tick-check.cjs`, `package.json`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `brain-settings-check.cjs`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09722222222222222 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `types.ts`, `next`, `Using the skills`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._