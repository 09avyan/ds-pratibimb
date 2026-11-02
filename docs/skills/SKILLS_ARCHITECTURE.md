# Skills architecture

Three agent skills give Claude Code context, discipline and design judgement in this repository. Their own
`SKILL.md` files are authoritative; [`CLAUDE.md`](../../CLAUDE.md) coordinates them.

| Layer | Skill | Source (inspected) | Licence | Installed as |
|---|---|---|---|---|
| Understand | **Graphify** 0.9.100 (`graphifyy` on PyPI) | github.com/Graphify-Labs/graphify @ `32e5efe` (2026-11-01) | Apache-2.0 / MIT | CLI via `uv tool`; skill in `.claude/skills/graphify` (`graphify install --project`) |
| Implement | **Ponytail** 5.3.3 | github.com/DietrichGebert/ponytail @ `96608e0` (2026-10-29) | MIT | Claude Code plugin, project scope (`.claude/settings.json`) |
| Design | **Taste** v2 (`design-taste-frontend`) | github.com/Leonxlnx/taste-skill @ `12af471` (2026-10-25) | MIT | Vendored in `.claude/skills/design-taste-frontend` (see `UPSTREAM.txt`) |

## Flow

```
question / task
   │
   ├─ Graphify ── graphify query | path | explain  → files, symbols, callers (EXTRACTED / INFERRED / AMBIGUOUS)
   ├─ Ponytail ── smallest complete change: exists already? stdlib? installed dep? update every caller + test
   ├─ Taste ───── UI only: direction → build → inspect.mjs screenshots + rule checks → fix
   ├─ Validate ── node scripts/*.cjs, npx tsc --noEmit -p ., Taste inspect for UI
   └─ graphify update .  (incremental, AST only, seconds) → commit graph with the change
```

## What runs where

- **Graphify, code:** tree-sitter parsing on this machine; no LLM, no network, no cost. That is the only mode enabled.
- **Graphify, docs/media semantic pass:** needs an LLM backend (assistant session or an API key). Not enabled.
- **Graphify MCP / Cloud:** `graphify-mcp` is installed but not registered; Graphify Cloud is not configured.
- **Ponytail:** instructions plus three local Node hooks (SessionStart, SubagentStart, UserPromptSubmit). Its optional
  "band" writes a per-project CSV under `~/.config/ponytail/band/`; the webhook option is unset, so nothing leaves the container.
- **Taste:** Node 22 scripts. `draw.mjs` deals directions offline; `inspect.mjs` drives the installed Chrome over CDP;
  `assets.mjs` searches open image archives (network).

## Hooks in `.claude/settings.json`

| Hook | From | Behaviour |
|---|---|---|
| PreToolUse Bash/Grep/Read/Glob → `graphify hook-guard` | Graphify | Nudges toward `graphify query` when a graph exists; fails open; skipped if the CLI is missing |
| SessionStart → `scripts/skills-bootstrap.sh --session` | this repo | Reinstalls the graphify CLI only if absent; otherwise ~5 ms |
| SessionStart/SubagentStart/UserPromptSubmit | Ponytail plugin | Loads the active level (default FULL) |
