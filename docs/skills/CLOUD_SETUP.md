# Cloud setup

## Environment (detected 2026-11-02)

Ubuntu 24.04 container, x86_64, 4 vCPU, 15 GB RAM, ~30 GB free. Node 22.23, Python 3.13, uv 0.11, git 2.43,
Chrome for Testing 153 and Playwright Chromium in `/opt/pw-browsers`, Claude Code 2.1.316 with plugins, skills, hooks and MCP.
Outbound HTTPS goes through the environment proxy (GitHub and PyPI reachable; some hosts such as docs.graphify.com are not).

## Persistence

The container is ephemeral. **Only what is committed to this repository survives.** So everything essential is project-scoped:

| Item | Location | Persists via |
|---|---|---|
| Taste skill | `.claude/skills/design-taste-frontend/` | git (vendored, MIT) |
| Graphify skill + guard hooks | `.claude/skills/graphify/`, `.claude/settings.json` | git |
| Ponytail plugin choice | `.claude/settings.json` (`extraKnownMarketplaces`, `enabledPlugins`) | git; Claude Code fetches the plugin |
| Coordination rules | `CLAUDE.md` (imports `AGENTS.md`) | git |
| Knowledge graph | `graphify-out/graph.json`, `GRAPH_REPORT.md`, `manifest.json` | git |
| graphify CLI | `~/.local/bin` (uv tool) | **not persisted**; restored by the SessionStart hook |
| Graph cache, `graph.html` | `graphify-out/cache/`, `graphify-out/graph.html` | not persisted (gitignored, regenerated) |
| Ponytail plugin cache, band CSV | `~/.claude/plugins/`, `~/.config/ponytail/` | not persisted (re-fetched / non-essential) |

## First-time setup (new clone or new environment)

```bash
scripts/skills-bootstrap.sh --setup   # installs graphify CLI, skill and initial graph if missing, then runs --check
```
Ponytail: Claude Code reads `.claude/settings.json` and offers/installs the plugin when the project is trusted. Manually:
`claude plugin marketplace add DietrichGebert/ponytail --scope project && claude plugin install ponytail@ponytail --scope project`.

## Updates

`scripts/skills-bootstrap.sh --update` upgrades graphify, re-registers its skill, updates Ponytail and re-vendors Taste
from upstream. Review `git diff --stat .claude` before committing.

## Limitations

- `.sql` files are skipped by Graphify until `graphifyy[sql]` is installed (only `supabase/migrations/*.sql`; low value).
- Docs/images are not semantically indexed (that needs an LLM backend; off by design).
- Taste's `assets.mjs` needs outbound access to image archives; not exercised here.
- Ponytail's `/ponytail` level switch and the `band` board are interactive features, verified only through a headless session.
