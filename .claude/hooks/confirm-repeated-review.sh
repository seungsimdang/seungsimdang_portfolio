#!/bin/sh
# PreToolUse(Agent) 훅: code-reviewer/security-reviewer 스폰 시 같은 종류의 번호 리뷰 파일이
# artifacts/task-team/에 이미 3개 이상이면 사용자 확인(ask) 요청.

input=$(cat)
agent_type=$(printf '%s' "$input" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null)

case "$agent_type" in
  code-reviewer) prefix="code-review" ;;
  security-reviewer) prefix="security-review" ;;
  *) exit 0 ;;
esac

dir="${CLAUDE_PROJECT_DIR:-.}/artifacts/task-team"
count=$(ls "$dir" 2>/dev/null | grep -cE "^${prefix}-[0-9]+\.md$")
[ "${count:-0}" -ge 3 ] || exit 0

reason="${prefix} 리뷰 파일이 이미 ${count}개입니다. 2차 이후는 Medium 이상만 재작업하고 Low는 모아서 사용자 결정을 받는 규칙(task-team-orchestrator SKILL 9-1, 11)대로 진행 중인지 확인 후 승인하세요."
jq -n --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
exit 0
