#!/bin/sh
set -eu
cd "$(git rev-parse --show-toplevel)"
# Older commits may predate the managed harness. Deletion after adoption must fail.
if ! git cat-file -e HEAD:docs/agent-harness/manifest.json 2>/dev/null &&
  [ -z "$(git ls-files -- docs/agent-harness .codex/agents .claude/agents .agents/skills/git-commit .claude/skills/git-commit .agents/skills/task-team-orchestrator .claude/skills/task-team-orchestrator .agents/skills/bug-team-orchestrator .claude/skills/bug-team-orchestrator .agents/skills/cross-agent-handoff .claude/skills/cross-agent-handoff)" ]; then
  echo "Managed harness is absent from both HEAD and the index; check not applicable."
  exit 0
fi
# Check the staged snapshot, including partial staging and deleted files.
task_snapshot=$(mktemp -d)
trap 'rm -rf "$task_snapshot"' EXIT HUP INT TERM
git checkout-index --all --prefix="$task_snapshot/"
node "$task_snapshot/scripts/sync-agent-harness.mjs" --check
