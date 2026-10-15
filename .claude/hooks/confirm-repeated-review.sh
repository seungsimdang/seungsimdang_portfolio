#!/bin/sh
# PreToolUse(Agent) 훅: code-reviewer/security-reviewer 스폰 시 현재 사이클 폴더에 같은 종류의 번호 리뷰 파일이 이미 3개 이상이면 사용자 확인(ask) 요청.

input=$(cat)
agent_type=$(printf '%s' "$input" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null)

case "$agent_type" in
  code-reviewer) prefix="code-review" ;;
  security-reviewer) prefix="security-review" ;;
  *) exit 0 ;;
esac

project="${CLAUDE_PROJECT_DIR:-.}"
base="$project/artifacts/task-team"
prompt=$(printf '%s' "$input" | jq -r '.tool_input.prompt // .tool_input.message // empty' 2>/dev/null)

# 현재 사이클은 스폰 프롬프트에 적힌 리뷰 저장 경로로 판단함
# 별도 worktree에서 진행하는 사이클은 프로젝트 폴더 밖에 있어 수정 시각 추정으로는 다른 사이클 폴더를 세게 됨
# 저장 경로가 없으면 프롬프트에 처음 나온 사이클 경로를 씀
# 아래 grep은 선택적 절대 경로 접두부터 artifacts/task-team/<work-id>/ 까지를 추출함
pc='[^[:space:]"'"'"'`()]'
seg='[^/[:space:]"'"'"'`()]'
cycle=$(printf '%s' "$prompt" | grep -oE "(/${pc}*)?artifacts/task-team/${seg}+/${prefix}-[0-9]+\.md" | head -n 1 | sed 's|/[^/]*$||')
[ -n "$cycle" ] || cycle=$(printf '%s' "$prompt" | grep -oE "(/${pc}*)?artifacts/task-team/${seg}+/" | head -n 1 | sed 's|/$||')
case "$cycle" in
  "") dir="" ;;
  /*) dir="$cycle" ;;
  *) dir="$project/$cycle" ;;
esac

# 프롬프트에서 찾지 못한 경우만 가장 최근에 바뀐 하위 폴더를 현재 사이클로 봄
# 하위 폴더가 없던 예전 구조는 최상위를 그대로 셈
{ [ -n "$dir" ] && [ -d "$dir" ]; } || dir=$(ls -td "$base"/*/ 2>/dev/null | head -n 1)
[ -n "$dir" ] || dir="$base"
count=$(ls "$dir" 2>/dev/null | grep -cE "^${prefix}-[0-9]+\.md$")
[ "${count:-0}" -ge 3 ] || exit 0

reason="${prefix} 리뷰 파일이 현재 사이클(${dir%/})에 이미 ${count}개입니다. 2차 이후는 Medium 이상만 재작업하고 Low는 모아서 사용자 결정을 받으며, Low 이하만 수정한 재작업은 재리뷰를 생략하는 규칙(task-team-orchestrator SKILL 9-1, 11)대로 진행 중인지 확인 후 승인하세요."
jq -n --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
exit 0
