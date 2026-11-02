# Using the skills

## Graphify — understand first
```bash
graphify query "how does the leaderboard ranking reach the audience stage"
graphify path "advance()" "chooseAutonomousNewsPlan()"   # → advance() calls planAutonomousNews() calls chooseAutonomousNewsPlan() [EXTRACTED]
graphify explain "chooseAutonomousNewsPlan()"           # callers, tests and imports with file:line
graphify update .                                       # after code changes (incremental, no API)
graphify export html                                    # optional interactive graph (graphify-out/graph.html)
```
Path queries are directed by default; use `--undirected` when data flows over HTTP rather than imports (e.g. engine → audience page).

## Ponytail — implement with discipline
Active automatically at **full**. In a session: `/ponytail lite` (name the smaller option, build what was asked),
`/ponytail ultra` (question the need first), `stop ponytail` to turn off. Reviews: `/ponytail:ponytail-review`,
`/ponytail:ponytail-audit`, `/ponytail:ponytail-debt`.

## Taste — design with intent (UI work only)
- New screen or redesign: follow `.claude/skills/design-taste-frontend/SKILL.md`; app screens (audience wall, host console,
  terminals) use `references/app-screens.md` and `node .claude/skills/design-taste-frontend/scripts/draw.mjs --app ...`.
- Check a running page: `pnpm dev`, then
  `node .claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:3000/ui-preview/gallery/audience --app --widths 1920,390 --out /tmp/taste`
  and look at the screenshots it writes before judging.

## Examples
- *"Why does the brain wait before the next set?"* → `graphify explain "chooseAutonomousNewsPlan()"`, read only the lines it points to.
- *"Add a sound toggle to the terminal"* → graph finds `Trader()`; Ponytail reuses the stage's bell code instead of a library; Taste inspects the terminal.
- *"Retune the bots"* → Graphify + Ponytail; no Taste.
