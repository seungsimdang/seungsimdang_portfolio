#!/bin/sh
# PreToolUse(Edit|Write) 훅: 여러 줄 주석의 문장 중간 줄바꿈을 작성 시점에 차단.
# 커밋 시점 검사는 lint-staged가 같은 검사기(scripts/check-comment-line-breaks.mjs)로 담당.
project_dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "$project_dir" ] || exit 0
exec node "$project_dir/scripts/check-comment-line-breaks.mjs" --hook
