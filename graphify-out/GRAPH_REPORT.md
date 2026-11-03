# Graph Report - ds-pratibimb  (2026-11-03)

## Corpus Check
- 77 files · ~60,873 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: .css 16, (none) 2, .example 1)

## Summary
- 682 nodes · 1432 edges · 36 communities (30 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `00d3cf9a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types.ts
- engine.ts
- auto-launcher.tsx
- news-behavior-check.cjs
- trader.tsx
- Cloud setup
- Using the skills
- skills-bootstrap.sh
- engine-smoke.cjs
- animation-switches-check.cjs
- ui-options.ts
- Health check and recovery
- price-tick-check.cjs
- package.json
- Dalaal Street
- host-console.tsx
- host-auth.ts
- layout.tsx
- audience-leaderboard-check.cjs
- compilerOptions
- [option]/play/[terminal]/page.tsx
- store-format-check.cjs
- brain-pacing-check.cjs
- TerminalEntry
- typescript
- brain-settings-check.cjs
- terminals.ts
- brain-scenarios.cjs
- next
- game-logs-check.cjs
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
5. `AudienceStage()` - 23 edges
6. `next` - 23 edges
7. `mutate()` - 19 edges
8. `typescript` - 17 edges
9. `chooseAutonomousNewsPlan()` - 17 edges
10. `recordGameLog()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Examples` --references--> `Trader()`  [INFERRED]
  docs/skills/SKILLS_USAGE.md → app/components/trader.tsx
- `VersionHome()` --calls--> `uiVariantForVersion()`  [EXTRACTED]
  app/[version]/page.tsx → src/ui-options.ts
- `VersionedNumberedPlayPage()` --calls--> `isValidTerminalPath()`  [EXTRACTED]
  app/[version]/play/[terminal]/page.tsx → src/game/terminals.ts
- `POST()` --calls--> `advance()`  [EXTRACTED]
  app/api/auto/route.ts → src/game/engine.ts
- `POST()` --calls--> `hostAction()`  [EXTRACTED]
  app/api/auto/route.ts → src/game/engine.ts

## Import Cycles
- None detected.

## Communities (36 total, 6 thin omitted)

### Community 0 - "types.ts"
Cohesion: 0.06
Nodes (66): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, errorResponse(), GET() (+58 more)

### Community 1 - "engine.ts"
Cohesion: 0.07
Nodes (73): ANIMATION_KEYS, activeTerminalPlayers(), chooseAutonomousNewsPlan(), clamp(), latestSet(), newAutonomousNewsState(), readAutonomousNewsSignals(), readNewsResponse() (+65 more)

### Community 2 - "auto-launcher.tsx"
Cohesion: 0.33
Nodes (6): AutoPage(), dynamic, AutoLauncher(), AutoStatus, clock(), money()

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.05
Nodes (36): a, assert, b, calm, closing, context, contextReading, effectWorld (+28 more)

### Community 4 - "trader.tsx"
Cohesion: 0.06
Nodes (79): AudiencePage(), dynamic, AudienceStage(), CANDLE_LINE, CANDLES, CONFETTI, CountdownScene(), DIGITS (+71 more)

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

### Community 9 - "animation-switches-check.cjs"
Cohesion: 0.33
Nodes (5): assert, fs, ts, w, ANIMATIONS

### Community 10 - "ui-options.ts"
Cohesion: 0.26
Nodes (8): dynamic, VersionedAudiencePage(), VersionHome(), dynamic, VersionedPlayPage(), dynamic, VersionedNumberedPlayPage(), uiVariantForVersion()

### Community 12 - "price-tick-check.cjs"
Cohesion: 0.18
Nodes (9): assert, cheapest, distinct, first, fs, now, pub, ts (+1 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, next@16.4.0, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+11 more)

### Community 14 - "Dalaal Street"
Cohesion: 0.09
Nodes (22): 25 companies, Audience stage (every version: `/audience`, `/v1/audience` … `/v7/audience`), Bells and countdown sound, Compact brain and situation-aware pacing, Dalaal Street, Host brain details, How the game works, Latest host and display refinements (+14 more)

### Community 15 - "host-console.tsx"
Cohesion: 0.06
Nodes (43): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+35 more)

### Community 16 - "host-auth.ts"
Cohesion: 0.27
Nodes (8): POST(), runtime, POST(), runtime, checkPassword(), clearHostSession(), createHostSession(), signature()

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "[option]/play/[terminal]/page.tsx"
Cohesion: 0.27
Nodes (7): dynamic, NumberedPlayPage(), dynamic, NumberedTestPage(), dynamic, UiPreviewOptionPage(), isValidTerminalPath()

### Community 21 - "store-format-check.cjs"
Cohesion: 0.17
Nodes (10): assert, before, fs, now, original, restored, stored, ts (+2 more)

### Community 22 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 23 - "TerminalEntry"
Cohesion: 0.32
Nodes (5): TerminalEntry(), dynamic, PlayPage(), dynamic, TestPage()

### Community 24 - "typescript"
Cohesion: 0.14
Nodes (12): typescript@5.9.3, typescript, assert, cases, fs, ts, assert, fs (+4 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "terminals.ts"
Cohesion: 0.32
Nodes (6): groupTerminalSessions(), lastSeen(), ParticipantGroup, TERMINAL_ACTIVE_WINDOW_MS, TERMINAL_COUNT, Player

### Community 27 - "brain-scenarios.cjs"
Cohesion: 0.29
Nodes (4): assert, fs, modes, ts

### Community 29 - "game-logs-check.cjs"
Cohesion: 0.15
Nodes (10): assert, authPath, fs, Module, {NextRequest}, now, path, storePath (+2 more)

### Community 33 - "trading-flow-check.cjs"
Cohesion: 0.17
Nodes (9): assert, fs, Module, {NextRequest}, now, path, storePath, ts (+1 more)

### Community 45 - "news-live-check.cjs"
Cohesion: 0.36
Nodes (8): affects(), assert, expectDirection(), fs, rank(), scope(), ts, winners()

### Community 77 - "Skills architecture"
Cohesion: 0.22
Nodes (7): Dalaal Street — agent instructions, graphify, Skills: how they work together, Flow, Hooks in `.claude/settings.json`, Skills architecture, What runs where

## Knowledge Gaps
- **1 isolated node(s):** `PATH`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 333 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `types.ts`, `trading-flow-check.cjs`, `trader.tsx`, `ui-options.ts`, `package.json`, `host-auth.ts`, `layout.tsx`, `[option]/play/[terminal]/page.tsx`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `trading-flow-check.cjs`, `news-behavior-check.cjs`, `engine-smoke.cjs`, `animation-switches-check.cjs`, `price-tick-check.cjs`, `package.json`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `store-format-check.cjs`, `brain-pacing-check.cjs`, `brain-settings-check.cjs`, `brain-scenarios.cjs`, `game-logs-check.cjs`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07392607392607392 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `engine.ts`, `Using the skills`, `ui-options.ts`, `host-console.tsx`, `[option]/play/[terminal]/page.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `news-behavior-check.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._