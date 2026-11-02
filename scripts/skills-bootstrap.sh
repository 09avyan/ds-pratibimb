#!/usr/bin/env bash
# Idempotent setup for the Taste, Ponytail and Graphify agent skills in this repository.
#
#   scripts/skills-bootstrap.sh --session   light check at session start: reinstall the graphify CLI only if missing
#   scripts/skills-bootstrap.sh --setup     first-time setup: CLI, project skill, initial code graph
#   scripts/skills-bootstrap.sh --update    update graphify CLI + skill, Ponytail plugin, vendored Taste skill
#   scripts/skills-bootstrap.sh --check     health report (exit 1 if something essential is missing)
#
# What persists: everything committed to git (.claude/, CLAUDE.md, graphify-out/graph.json, GRAPH_REPORT.md).
# What does not: the graphify CLI (~/.local) and Ponytail's plugin cache (~/.claude/plugins) live in the
# container and are restored by --session / Claude Code itself on a fresh container.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.local/bin:$PATH"
mode="${1:---check}"
ok() { printf '  ok    %s\n' "$1"; }
bad() { printf '  MISS  %s\n' "$1"; missing=1; }
missing=0

install_cli() {
  command -v graphify >/dev/null 2>&1 && return 0
  command -v uv >/dev/null 2>&1 || { echo "uv not found; install uv or run: pipx install graphifyy" >&2; return 1; }
  uv tool install graphifyy >/dev/null 2>&1
}

case "$mode" in
  --session)
    # Must stay fast and silent: no graph rebuild, no network unless the CLI is missing.
    install_cli || true
    exit 0 ;;
  --setup)
    install_cli || exit 1
    [ -f .claude/skills/graphify/SKILL.md ] || graphify install --project
    [ -f graphify-out/graph.json ] || graphify update .
    exec "$0" --check ;;
  --update)
    uv tool upgrade graphifyy
    graphify install --project
    claude plugin marketplace update ponytail && claude plugin update ponytail@ponytail --scope project
    tmp="$(mktemp -d)"
    git clone -q --depth 1 https://github.com/Leonxlnx/taste-skill "$tmp/taste" &&
      rm -rf .claude/skills/design-taste-frontend &&
      cp -r "$tmp/taste/skills/taste-skill" .claude/skills/design-taste-frontend &&
      cp "$tmp/taste/LICENSE" .claude/skills/design-taste-frontend/LICENSE &&
      printf 'Vendored from https://github.com/Leonxlnx/taste-skill (skills/taste-skill) at commit %s (%s). MIT licence. Update: rerun scripts/skills-bootstrap.sh --update.\n' \
        "$(git -C "$tmp/taste" rev-parse --short HEAD)" "$(git -C "$tmp/taste" log -1 --format=%cd --date=short)" > .claude/skills/design-taste-frontend/UPSTREAM.txt
    rm -rf "$tmp"
    echo "Review the diff (git diff --stat .claude) before committing."
    exec "$0" --check ;;
  --check)
    echo "Runtimes"
    node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' 2>/dev/null && ok "node $(node -v) (Taste needs 22+)" || bad "node 22+ for Taste scripts"
    command -v python3 >/dev/null && ok "$(python3 --version)" || bad "python3 for graphify"
    command -v uv >/dev/null && ok "uv $(uv --version | cut -d' ' -f2)" || bad "uv (or pipx) to install graphify"
    { command -v google-chrome || command -v chromium || ls /opt/pw-browsers/chromium-*/chrome-linux/chrome; } >/dev/null 2>&1 && ok "Chromium-based browser (Taste inspect)" || bad "Chrome/Chromium for Taste inspect"
    echo "Skills"
    [ -f .claude/skills/design-taste-frontend/SKILL.md ] && ok "Taste: .claude/skills/design-taste-frontend ($(grep -o "commit [0-9a-f]*" .claude/skills/design-taste-frontend/UPSTREAM.txt 2>/dev/null))" || bad "Taste skill"
    [ -f .claude/skills/graphify/SKILL.md ] && ok "Graphify skill: .claude/skills/graphify" || bad "Graphify skill"
    grep -q '"ponytail@ponytail": true' .claude/settings.json 2>/dev/null && ok "Ponytail plugin enabled in .claude/settings.json" || bad "Ponytail plugin in project settings"
    command -v claude >/dev/null && claude plugin list 2>/dev/null | grep -q 'ponytail@ponytail' && ok "Ponytail plugin installed in this container" || echo "  note  Ponytail plugin not yet cached here; Claude Code installs it from project settings on start"
    echo "Graphify"
    command -v graphify >/dev/null && ok "$(graphify --version)" || bad "graphify CLI (run --setup)"
    if [ -f graphify-out/graph.json ]; then
      built="$(grep -m1 -o 'Built from commit: `[0-9a-f]*' graphify-out/GRAPH_REPORT.md 2>/dev/null | grep -o '[0-9a-f]*$')"
      head="$(git rev-parse --short=8 HEAD)"
      ok "graph.json ($(du -h graphify-out/graph.json | cut -f1)), built from ${built:-?}, HEAD ${head}"
      [ "${built:-}" = "$head" ] || echo "  note  graph may be stale: run graphify update . (AST only, seconds, no API)"
    else bad "graphify-out/graph.json (run --setup)"; fi
    exit $missing ;;
  *) sed -n '2,10p' "$0"; exit 2 ;;
esac
