# Dalaal Street — agent instructions

@AGENTS.md

## Skills: how they work together

Three project skills are installed. Each skill's own `SKILL.md` is the authority on how it works; this file only coordinates them.

| Skill | What it is for | Where |
|---|---|---|
| **Graphify** | Understand before acting: a local knowledge graph of the code (tree-sitter AST, no LLM) | `.claude/skills/graphify`, graph in `graphify-out/` |
| **Ponytail** | Implement with discipline: smallest complete change, reuse first, no speculative code. FULL by default | plugin `ponytail@ponytail` (enabled in `.claude/settings.json`) |
| **Taste** (`design-taste-frontend`) | Design with intent: art direction, then browser inspection of the result | `.claude/skills/design-taste-frontend` |

**Order of work:** Graphify → Ponytail → Taste (only for UI) → validation → `graphify update .`. Skip what does not apply:
- Backend, engine or tooling change: Graphify for context, Ponytail for the change. No Taste.
- UI change or new screen: Graphify to find the components, Taste to set the direction and inspect, Ponytail to keep the diff small.
- Question about the code: Graphify only.

**Rules that keep it cheap and honest**
- Query the graph before grepping (rules below). Do not rebuild it from scratch; `graphify update .` is incremental and takes seconds. Report graph relations with their confidence label (EXTRACTED / INFERRED / AMBIGUOUS) and never invent one.
- If the graph or CLI is missing, run `scripts/skills-bootstrap.sh --setup`; if that fails, read the code directly and say so.
- Taste's browser check: `node .claude/skills/design-taste-frontend/scripts/inspect.mjs <url> --app` (needs `pnpm dev` running; app screens use `--app`). Use it for every visible UI change; skip it for non-UI work.
- Keep the existing design language of each UI version; Taste must not restyle screens the task did not touch.
- Ponytail never trades away correctness, security, accessibility, or the project's tests: run the relevant `node scripts/*.cjs` checks and `npx tsc --noEmit -p .`.
- Do not enable Graphify's semantic/LLM extraction, Graphify Cloud or any external MCP service without the owner's approval; code-only extraction keeps source code on the machine.
- Cloud sessions are ephemeral: only committed files persist. Commit `graphify-out/graph.json`, `GRAPH_REPORT.md` and `manifest.json` after significant code changes. Health check: `scripts/skills-bootstrap.sh --check`. Details: `docs/skills/`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
