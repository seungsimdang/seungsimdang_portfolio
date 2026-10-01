#!/bin/sh
# 생성 원본과 결과의 불일치 안내; 커밋 차단은 staged snapshot 검사 담당
cat >/dev/null
project_dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "$project_dir" ] || exit 0
cd "$project_dir" || exit 0
node scripts/sync-agent-harness.mjs --check || echo '하네스 생성 원본과 결과가 다름. pnpm harness:sync 실행 필요.'
exit 0
