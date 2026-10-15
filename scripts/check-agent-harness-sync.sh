#!/bin/sh
# pre-commit 훅: 스테이징된 하네스 생성 원본과 결과가 바이트 단위로 같은지 검사
set -eu
cd "$(git rev-parse --show-toplevel)"
# 하네스 도입 이전 커밋에서는 검사 대상이 없어 통과시키고, 도입 이후 삭제는 index에 파일이 남아 검사에 걸리게 함
if ! git cat-file -e HEAD:docs/agent-harness/manifest.json 2>/dev/null &&
  [ -z "$(git ls-files -- docs/agent-harness .codex/agents .claude/agents .agents/skills/git-commit .claude/skills/git-commit .agents/skills/task-team-orchestrator .claude/skills/task-team-orchestrator .agents/skills/bug-team-orchestrator .claude/skills/bug-team-orchestrator .agents/skills/cross-agent-handoff .claude/skills/cross-agent-handoff)" ]; then
  echo "Managed harness is absent from both HEAD and the index; check not applicable."
  exit 0
fi
# 작업 트리가 아니라 index 스냅샷을 검사해 부분 스테이징과 삭제도 커밋될 내용 그대로 판정
task_snapshot=$(mktemp -d)
trap 'rm -rf "$task_snapshot"' EXIT HUP INT TERM
git checkout-index --all --prefix="$task_snapshot/"
node "$task_snapshot/scripts/sync-agent-harness.mjs" --check
