# Graph Report - ds-pratibimb  (2026-11-03)

## Corpus Check
- 78 files · ~62,640 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: .css 16, (none) 2, .example 1)

## Summary
- 693 nodes · 1463 edges · 37 communities (30 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f6d05f6e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store.ts
- engine.ts
- trader-parts.tsx
- news-behavior-check.cjs
- trader.tsx
- Cloud setup
- Using the skills
- skills-bootstrap.sh
- engine-smoke.cjs
- HostConsole
- host-console.tsx
- Health check and recovery
- price-tick-check.cjs
- package.json
- Dalaal Street
- market-sound.ts
- host-auth.ts
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- store-format-check.cjs
- isValidTerminalPath
- uiVariantForVersion
- ui-options.ts
- typescript
- brain-settings-check.cjs
- short-batch-check.cjs
- next
- autonomous-news.ts
- game-logs-check.cjs
- HostLogs
- trading-flow-check.cjs
- news-live-check.cjs
- vercel.json
- AGENTS.md
- Skills architecture

## God Nodes (most connected - your core abstractions)
1. `Trader()` - 44 edges
2. `advance()` - 34 edges
3. `hostAction()` - 31 edges
4. `HostConsole()` - 27 edges
5. `AudienceStage()` - 24 edges
6. `next` - 23 edges
7. `mutate()` - 19 edges
8. `typescript` - 18 edges
9. `chooseAutonomousNewsPlan()` - 17 edges
10. `recordGameLog()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Examples` --references--> `Trader()`  [INFERRED]
  docs/skills/SKILLS_USAGE.md → app/components/trader.tsx
- `VersionHome()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/page.tsx → src/ui-options.ts
- `VersionedNumberedPlayPage()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/play/[terminal]/page.tsx → src/ui-options.ts
- `POST()` --calls--> `advance()`  [EXTRACTED]
  app/api/auto/route.ts → src/game/engine.ts
- `POST()` --calls--> `hostAction()`  [EXTRACTED]
  app/api/auto/route.ts → src/game/engine.ts

## Import Cycles
- None detected.

## Communities (37 total, 7 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.09
Nodes (48): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, errorResponse(), GET() (+40 more)

### Community 1 - "engine.ts"
Cohesion: 0.11
Nodes (54): newAutonomousNewsState(), readAutonomousNewsSignals(), makeNews(), makeStocks(), adaptBrainSettings(), advance(), advanceNewsDrift(), advanceNewsReaction() (+46 more)

### Community 2 - "trader-parts.tsx"
Cohesion: 0.13
Nodes (19): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money(), TerminalEntry(), dynamic (+11 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.05
Nodes (36): a, assert, b, calm, closing, context, contextReading, effectWorld (+28 more)

### Community 4 - "trader.tsx"
Cohesion: 0.06
Nodes (78): AudiencePage(), dynamic, AudienceStage(), BatchReport(), CANDLE_LINE, CandleChart(), CANDLES, CONFETTI (+70 more)

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

### Community 9 - "HostConsole"
Cohesion: 0.12
Nodes (12): describeHostAction(), editableControls(), fmtTime(), HostConsole(), act(), HostMetric(), money(), NewsDirectionIcon() (+4 more)

### Community 10 - "host-console.tsx"
Cohesion: 0.20
Nodes (12): HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostWorld, NewsCategory, Tab, VIRTUAL_BOT_COUNT, groupTerminalSessions() (+4 more)

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+11 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.09
Nodes (22): 25 companies, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Bells and countdown sound, Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+14 more)

### Community 15 - "market-sound.ts"
Cohesion: 0.18
Nodes (20): bellBuffer(), bellCache, BellKind, chime(), countdownTick(), GONG, gongStrike(), knock() (+12 more)

### Community 16 - "host-auth.ts"
Cohesion: 0.27
Nodes (8): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), signature()

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "store-format-check.cjs"
Cohesion: 0.17
Nodes (10): assert, before, fs, now, original, restored, stored, ts (+2 more)

### Community 21 - "isValidTerminalPath"
Cohesion: 0.24
Nodes (8): dynamic, NumberedPlayPage(), dynamic, NumberedTestPage(), UiPreviewOptionPage(), dynamic, VersionedNumberedPlayPage(), isValidTerminalPath()

### Community 22 - "uiVariantForVersion"
Cohesion: 0.31
Nodes (6): dynamic, VersionedAudiencePage(), VersionHome(), dynamic, VersionedPlayPage(), uiVariantForVersion()

### Community 23 - "ui-options.ts"
Cohesion: 0.39
Nodes (5): dynamic, UiPreviewAudiencePage(), dynamic, UI_OPTIONS, UiVariant

### Community 24 - "typescript"
Cohesion: 0.14
Nodes (12): typescript@5.9.3, typescript, assert, cases, fs, ts, assert, fs (+4 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "short-batch-check.cjs"
Cohesion: 0.33
Nodes (5): assert, fs, full, summary, ts

### Community 28 - "autonomous-news.ts"
Cohesion: 0.05
Nodes (50): labels, affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts (+42 more)

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 339 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `store.ts`, `trading-flow-check.cjs`, `trader-parts.tsx`, `package.json`, `host-auth.ts`, `layout.tsx`, `isValidTerminalPath`, `uiVariantForVersion`, `ui-options.ts`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08597285067873303 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `trading-flow-check.cjs`, `news-behavior-check.cjs`, `trader.tsx`, `engine-smoke.cjs`, `price-tick-check.cjs`, `package.json`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `store-format-check.cjs`, `brain-settings-check.cjs`, `short-batch-check.cjs`, `autonomous-news.ts`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10649350649350649 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `engine.ts`, `Using the skills`, `isValidTerminalPath`, `uiVariantForVersion`, `ui-options.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `trader-parts.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12962962962962962 - nodes in this community are weakly interconnected._