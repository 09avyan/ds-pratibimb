# Graph Report - ds-pratibimb  (2026-11-02)

## Corpus Check
- 66 files · ~47,129 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: .css 15, (none) 2, .example 1)

## Summary
- 588 nodes · 1202 edges · 26 communities (21 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed832789`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- trader.tsx
- types.ts
- engine.ts
- news-behavior-check.cjs
- Cloud setup
- Using the skills
- skills-bootstrap.sh
- engine-smoke.cjs
- engine.ts
- host-console.tsx
- Health check and recovery
- Dalaal Street
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
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
6. `AudienceStage()` - 17 edges
7. `chooseAutonomousNewsPlan()` - 17 edges
8. `recordGameLog()` - 16 edges
9. `mutate()` - 16 edges
10. `compilerOptions` - 16 edges

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

## Communities (26 total, 5 thin omitted)

### Community 0 - "trader.tsx"
Cohesion: 0.06
Nodes (66): AudiencePage(), dynamic, AudienceStage(), BellKind, CANDLE_LINE, CANDLES, CONFETTI, CountdownScene() (+58 more)

### Community 1 - "types.ts"
Cohesion: 0.08
Nodes (31): dynamic, runtime, updateHostNotes(), labels, key(), load(), localQueues, LocalScope (+23 more)

### Community 2 - "engine.ts"
Cohesion: 0.06
Nodes (49): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts, activeTerminalPlayers() (+41 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.06
Nodes (33): assert, fs, modes, ts, a, assert, b, calm (+25 more)

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
Cohesion: 0.11
Nodes (51): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, errorResponse(), GET() (+43 more)

### Community 10 - "host-console.tsx"
Cohesion: 0.08
Nodes (30): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+22 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.09
Nodes (22): 25 companies, Audience bells, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+14 more)

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 24 - "ref_node_fs"
Cohesion: 0.16
Nodes (9): typescript@5.9.3, typescript, assert, cases, fs, ts, assert, fs (+1 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.15
Nodes (11): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+3 more)

### Community 33 - "trading-flow-check.cjs"
Cohesion: 0.15
Nodes (9): assert, fs, Module, {NextRequest}, now, path, storePath, ts (+1 more)

### Community 37 - "package.json"
Cohesion: 0.07
Nodes (31): POST(), runtime, POST(), runtime, config, dependencies, next@16.4.0, react@19.3.0 (+23 more)

### Community 45 - "news-live-check.cjs"
Cohesion: 0.36
Nodes (8): affects(), assert, expectDirection(), fs, rank(), scope(), ts, winners()

### Community 50 - "trader-parts.tsx"
Cohesion: 0.11
Nodes (21): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+13 more)

### Community 77 - "Skills architecture"
Cohesion: 0.22
Nodes (7): Dalaal Street — agent instructions, graphify, Skills: how they work together, Flow, Hooks in `.claude/settings.json`, Skills architecture, What runs where

## Knowledge Gaps
- **1 isolated node(s):** `PATH`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 290 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `package.json` to `trader.tsx`, `types.ts`, `trading-flow-check.cjs`, `engine.ts`, `layout.tsx`, `trader-parts.tsx`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `advance()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`advance()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `trader.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0636030636030636 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `ref_node_fs` to `trading-flow-check.cjs`, `engine.ts`, `news-behavior-check.cjs`, `package.json`, `engine-smoke.cjs`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `brain-settings-check.cjs`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07777777777777778 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `trader-parts.tsx`, `host-console.tsx`, `Using the skills`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._