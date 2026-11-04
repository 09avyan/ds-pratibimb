# Graph Report - ds-pratibimb  (2026-11-04)

## Corpus Check
- 84 files · ~71,229 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .css 17, (none) 2, .log 2)

## Summary
- 767 nodes · 1612 edges · 41 communities (37 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a576a53`
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
- typescript
- Health check and recovery
- price-tick-check.cjs
- game-logs-check.cjs
- Dalaal Street
- market-sound.ts
- autonomous-news.ts
- next
- audience-leaderboard-check.cjs
- compilerOptions
- types.ts
- brain-mix-check.cjs
- trader.tsx
- trading-flow-check.cjs
- typescript
- brain-settings-check.cjs
- Using the skills
- store-format-check.cjs
- endurance-check.cjs
- package.json
- brain-scenarios.cjs
- wrap-screen.tsx
- brain-pacing-check.cjs
- market-parts.tsx
- trading-motion.tsx
- hall-of-fame-check.cjs
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

## Communities (41 total, 4 thin omitted)

### Community 0 - "store.ts"
Cohesion: 0.08
Nodes (54): dynamic, GET(), POST(), publicStatus(), runtime, dynamic, errorResponse(), GET() (+46 more)

### Community 1 - "engine.ts"
Cohesion: 0.09
Nodes (58): newAutonomousNewsState(), makeNews(), makeStocks(), adaptBrainSettings(), advance(), advanceNewsDrift(), advanceNewsReaction(), applyMove() (+50 more)

### Community 2 - "host-console.tsx"
Cohesion: 0.07
Nodes (33): describeHostAction(), editableControls(), fmtTime(), HOST_SECTIONS, HOST_SHORTCUTS, HostActionEntry, HostConsole(), act() (+25 more)

### Community 3 - "news-behavior-check.cjs"
Cohesion: 0.05
Nodes (36): a, assert, b, calm, closing, context, contextReading, effectWorld (+28 more)

### Community 4 - "audience-stage.tsx"
Cohesion: 0.10
Nodes (39): AudienceStage(), Award, BatchReport(), CANDLE_LINE, CANDLES, CONFETTI, CountMoney(), DEMO (+31 more)

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
Cohesion: 0.05
Nodes (38): dynamic, NumberedPlayPage(), dynamic, NumberedTestPage(), UiPreviewOptionPage(), activeBrainWorld, activePlan, assert (+30 more)

### Community 9 - "animation-switches-check.cjs"
Cohesion: 0.21
Nodes (10): assert, fs, ts, w, ANIMATION_KEYS, AnimationInfo, animationOffClasses(), animationOn() (+2 more)

### Community 10 - "typescript"
Cohesion: 0.33
Nodes (5): assert, fs, full, summary, ts

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
Cohesion: 0.17
Nodes (25): applause(), bellBuffer(), bellCache, BellKind, chime(), chimes(), countdownTick(), fanfare() (+17 more)

### Community 16 - "autonomous-news.ts"
Cohesion: 0.40
Nodes (10): activeTerminalPlayers(), chooseAutonomousNewsPlan(), clamp(), latestSet(), readAutonomousNewsSignals(), readNewsResponse(), scopeOf(), storyKey() (+2 more)

### Community 17 - "next"
Cohesion: 0.05
Nodes (23): POST(), runtime, POST(), runtime, metadata, viewport, dynamic, UiPreviewAudiencePage() (+15 more)

### Community 18 - "audience-leaderboard-check.cjs"
Cohesion: 0.11
Nodes (18): assert, finisher, fs, idle, join(), legacy, now, played() (+10 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "types.ts"
Cohesion: 0.11
Nodes (17): labels, AutonomousNews, AutonomousNewsIntensity, AutonomousNewsLogEntry, AutonomousNewsReading, AutonomousNewsResponse, Candle, Controls (+9 more)

### Community 21 - "brain-mix-check.cjs"
Cohesion: 0.33
Nodes (4): assert, cases, fs, ts

### Community 22 - "trader.tsx"
Cohesion: 0.15
Nodes (25): AudiencePage(), dynamic, Odometer(), changePct(), fmtTime(), latestNewsSet(), newsScope(), noteServerTime() (+17 more)

### Community 23 - "trading-flow-check.cjs"
Cohesion: 0.15
Nodes (9): assert, fs, Module, {NextRequest}, now, path, storePath, ts (+1 more)

### Community 24 - "typescript"
Cohesion: 0.15
Nodes (11): typescript@5.9.3, typescript, assert, fs, ts, assert, fs, ts (+3 more)

### Community 25 - "brain-settings-check.cjs"
Cohesion: 0.14
Nodes (11): assert, baseline, before, changes, difficulties, fs, now, paused (+3 more)

### Community 26 - "Using the skills"
Cohesion: 0.33
Nodes (5): Examples, Graphify — understand first, Ponytail — implement with discipline, Taste — design with intent (UI work only), Using the skills

### Community 27 - "store-format-check.cjs"
Cohesion: 0.17
Nodes (10): assert, before, fs, now, original, restored, stored, ts (+2 more)

### Community 28 - "endurance-check.cjs"
Cohesion: 0.18
Nodes (10): assert, at, first5, fs, last5, LIMIT, peak, sizes (+2 more)

### Community 29 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, next@16.4.5, react@19.3.0, react-dom@19.3.0, devDependencies, @types/node@24.7.2, @types/react@19.2.2, @types/react-dom@19.2.2 (+11 more)

### Community 30 - "brain-scenarios.cjs"
Cohesion: 0.20
Nodes (7): assert, fs, modes, ts, newsContradicts(), Story, News

### Community 31 - "wrap-screen.tsx"
Cohesion: 0.27
Nodes (11): money(), FeedbackCard(), FeedbackEntry, NEXT_STEP, Persona, persona(), PLACE, Report (+3 more)

### Community 32 - "brain-pacing-check.cjs"
Cohesion: 0.28
Nodes (7): affectedSymbols(), assert, fs, now, roundAfterFirstSet(), scopeOf(), ts

### Community 33 - "market-parts.tsx"
Cohesion: 0.31
Nodes (8): IndexSpark(), MiniChart(), smoothPath(), useChartColour(), MainChart(), react, PublicWorld, Stock

### Community 34 - "trading-motion.tsx"
Cohesion: 0.43
Nodes (6): CandleChart(), CountdownScene(), PixelText(), useSmoothRemaining(), serverNow(), TerminalMoments()

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 380 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `store.ts`, `trader-parts.tsx`, `engine-smoke.cjs`, `game-logs-check.cjs`, `trading-flow-check.cjs`, `package.json`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `PATH` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07656341320864991 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `typescript` to `brain-pacing-check.cjs`, `news-behavior-check.cjs`, `hall-of-fame-check.cjs`, `engine-smoke.cjs`, `animation-switches-check.cjs`, `typescript`, `price-tick-check.cjs`, `game-logs-check.cjs`, `news-live-check.cjs`, `audience-leaderboard-check.cjs`, `brain-mix-check.cjs`, `trading-flow-check.cjs`, `brain-settings-check.cjs`, `store-format-check.cjs`, `endurance-check.cjs`, `package.json`, `brain-scenarios.cjs`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09234972677595628 - nodes in this community are weakly interconnected._
- **Why does `Trader()` connect `trader.tsx` to `market-parts.tsx`, `host-console.tsx`, `trading-motion.tsx`, `audience-stage.tsx`, `engine-smoke.cjs`, `animation-switches-check.cjs`, `next`, `Using the skills`, `wrap-screen.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `host-console.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07198228128460686 - nodes in this community are weakly interconnected._