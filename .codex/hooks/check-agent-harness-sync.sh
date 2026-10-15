#!/bin/sh
# PostToolUse(Edit|Write) 훅: 하네스 생성 원본과 결과가 다르면 안내만 함(차단 안 함)
# 편집 도중의 일시적 불일치까지 막지 않도록 커밋 차단은 pre-commit의 scripts/check-agent-harness-sync.sh에 맡김
cat >/dev/null
project_dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "$project_dir" ] || exit 0
cd "$project_dir" || exit 0
node scripts/sync-agent-harness.mjs --check || echo '하네스 생성 원본과 결과가 다름. pnpm harness:sync 실행 필요.'
exit 0
