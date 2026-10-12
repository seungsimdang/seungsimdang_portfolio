#!/bin/sh
# PreToolUse(AskUserQuestion) 훅: 마지막 사용자 메시지 이후 AskUserQuestion 답변에 선택지 밖 직접 입력이 있으면 같은 응답의 재질문 차단
# 직접 입력은 대개 질문이고, 답변 직후 질문 창이 뜨면 답변 텍스트가 가려지므로 텍스트로 답하고 응답 종료를 유도
# 트랜스크립트 형식이 바뀌거나 읽을 수 없으면 차단하지 않음

input=$(cat)
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
[ -n "$transcript" ] && [ -r "$transcript" ] || exit 0

free_text=$(jq -nR '
  reduce (inputs | fromjson? | select(.type == "user" and (.isMeta | not))) as $e (false;
    if ($e.message.content | type) == "string"
      or ([$e.message.content[]? | select(.type == "text")] | length > 0)
    then false
    elif ($e.toolUseResult | type) == "object" and ($e.toolUseResult.answers | type) == "object"
    then . or ([
      $e.toolUseResult.questions[]? as $q
      | ($e.toolUseResult.answers[$q.question] // "") as $a
      | select($a != "")
      | (if $q.multiSelect then ($a | split(", ")[]) else $a end) as $p
      | select(any($q.options[]?; .label == $p) | not)
    ] | length > 0)
    else . end)
' "$transcript" 2>/dev/null)

[ "$free_text" = "true" ] || exit 0

reason="직전 AskUserQuestion 답변에 사용자가 직접 입력한 내용이 있음. 그 내용(질문이면 답변)을 텍스트로만 처리하고 응답을 끝낼 것. 남은 질문은 사용자의 다음 메시지 이후에 다시 할 것."
jq -n --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
exit 0
