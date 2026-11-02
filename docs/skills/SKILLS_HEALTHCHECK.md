# Health check and recovery

```bash
scripts/skills-bootstrap.sh --check      # exit 0 = healthy
```
Expected (abridged):
```
  ok    node v22.x (Taste needs 22+)        ok    Taste: .claude/skills/design-taste-frontend (commit …)
  ok    Graphify skill …                    ok    Ponytail plugin enabled in .claude/settings.json
  ok    graphify 0.9.x                      ok    graph.json (…), built from <sha>, HEAD <sha>
```

| Symptom | Fix |
|---|---|
| `graphify: command not found` | `scripts/skills-bootstrap.sh --session` (or `uv tool install graphifyy`) |
| "graph may be stale" | `graphify update .` and commit `graphify-out/graph.json` |
| Graph has far fewer nodes after an update | intended exclusions in `.graphifyignore`; use `graphify update . --force` to accept |
| Ponytail not active | `claude plugin list` → if missing, run the two commands in CLOUD_SETUP.md; then start a new session |
| Taste `inspect.mjs` fails to navigate | start `pnpm dev` first; Chrome is auto-detected (Chrome for Testing / Playwright Chromium) |
| Hook noise in a new container | hooks fail open; run `--setup` once |

## Verification done on 2026-11-02
- Skills discovered by a fresh `claude -p` process: `design-taste-frontend`, `graphify`, `ponytail:*` (6). Ponytail reports level **full** from its SessionStart hook.
- Graphify: full build 548 nodes / 1150 edges / 26 communities in ~7 s, 100 % EXTRACTED; query, path and explain answered with file:line; incremental update ~2.4 s.
- Taste: `inspect.mjs` rendered `/ui-preview/gallery/audience` in headless Chrome at 1920 and 390 px, wrote screenshots and a rule report (5 FAIL, 4 WARN, listed as follow-ups).
- Recovery: CLI uninstalled → SessionStart step reinstalled it; guard hook exits 0 without the CLI.
