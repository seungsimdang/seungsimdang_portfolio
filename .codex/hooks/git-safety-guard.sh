#!/bin/sh
# PreToolUse(Bash) 훅: 프로젝트 공용 Git 안전 규칙을 대화 중 다짐이 아니라 기계적으로 강제
#
# 차단 대상:
#   1) 파괴적 명령: git reset --hard, git clean(-f/-d/-x), git branch -D, git checkout -- .(경로 미지정)
#   2) bare git stash / git stash pop - worktree 간 공유 스택이라 다른 세션 것을 건드릴 수 있음
#   0) 프로세스 이름 기준 일괄 종료(pkill, killall) - 사용자가 띄운 dev 서버 등 다른 세션의 프로세스까지 종료함
#   3) 메인 체크아웃(worktree 아님)에서 브랜치 생성(git checkout -b / git switch -c) - 이미 다른 worktree/브랜치가 있으면(다른 세션이 쓰고 있을 가능성) `Agent(isolation:"worktree")`로 격리 스폰하게 함(subagent가 스스로 `EnterWorktree`를 호출하는 경로는 막혀 있음)
#
# 이 훅을 우회해야 하는 정당한 사유(예: 사용자가 직접 승인한 destructive 작업)가 있으면, 사용자가 터미널에서 `!<command>`로 직접 실행하거나(에이전트의 Bash 도구를 거치지 않음), 이 훅을 일시적으로 settings.json에서 제거

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

# 0) 이름 패턴 종료는 git 명령 여부와 무관하게 차단
if printf '%s' "$cmd" | grep -qE '(^|[;&|(]\s*)(pkill|killall)\b'; then
  echo "차단: pkill/killall 금지. 다른 세션이나 사용자가 띄운 프로세스까지 종료됩니다. 직접 띄운 서버는 포트로 지정해 종료하세요: kill \$(lsof -ti tcp:<port>)" >&2
  exit 2
fi

# git 명령이 아니면 통과
printf '%s' "$cmd" | grep -qE '(^|[;&|]\s*)git\b' || exit 0

deny() {
  echo "차단: $1 (프로젝트 Git 안전 규칙)" >&2
  exit 2
}

# 1) 파괴적 명령
if printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+reset[[:space:]]+--hard\b'; then
  deny "git reset --hard 금지. 되돌릴 필요가 있으면 orchestrator/사용자에게 상황을 보고하고 승인받아 실행하세요."
fi
if printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+clean\b[^|;&]*-[a-zA-Z]*[fdx]'; then
  deny "git clean -f/-d/-x 금지. 다른 worktree/세션의 미커밋 변경사항까지 지울 수 있습니다."
fi
if printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+branch[[:space:]]+(-D|--delete[[:space:]]+--force)\b'; then
  deny "git branch -D 금지. 다른 worktree가 그 브랜치를 쓰고 있을 수 있습니다. 필요하면 사용자 승인을 받으세요."
fi
if printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+checkout[[:space:]]+(--[[:space:]]+)?\.[[:space:]]*($|[;&|])'; then
  deny "경로 미지정 git checkout -- . 금지. 되돌릴 파일 경로를 구체적으로 지정하세요."
fi

# 2) bare stash / stash pop
if printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+stash[[:space:]]*($|[;&|])'; then
  deny "bare git stash 금지 - stash 스택은 모든 worktree/세션이 공유합니다. 'git stash push -u -m \"<고유-태그>\"'로 태그를 남기세요."
fi
if printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+stash[[:space:]]+push\b'; then
  if ! printf '%s' "$cmd" | grep -qE '\-m[[:space:]]'; then
    deny "태그 없는 git stash push 금지 - 'git stash push -u -m \"<고유-태그>\"'로 자신의 항목을 나중에 식별 가능하게 남기세요."
  fi
fi
if printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+stash[[:space:]]+pop\b'; then
  deny "git stash pop 금지 - 다른 세션이 방금 올린 stash를 팝할 수 있습니다. 'git stash list --format=%H %gs'로 자신의 태그를 찾아 'git stash apply <sha>'를 쓰고, 확인 후 직접 drop하세요."
fi

# 3) 메인 체크아웃에서 새 브랜치 생성 - 다른 worktree/브랜치가 이미 있으면 차단
if printf '%s' "$cmd" | grep -qE '\bgit[[:space:]]+(checkout[[:space:]]+-b|switch[[:space:]]+-c)\b'; then
  # .git이 디렉터리면 메인 체크아웃, 파일이면(gitdir 참조) linked worktree.
  if [ -d .git ]; then
    worktree_count=$(git worktree list 2>/dev/null | wc -l | tr -d ' ')
    branch_count=$(git branch -a 2>/dev/null | wc -l | tr -d ' ')
    if [ "${worktree_count:-1}" -gt 1 ] || [ "${branch_count:-0}" -gt 3 ]; then
      deny "메인 체크아웃에서 새 브랜치 생성 시도가 감지됐고, 이미 다른 worktree(${worktree_count}개)나 여러 브랜치(${branch_count}개)가 있어 다른 세션이 동시 사용 중일 수 있습니다. orchestrator가 Agent(isolation:\"worktree\")로 격리 스폰한 뒤 그 안에서 브랜치를 만드세요 (subagent가 직접 EnterWorktree를 호출하지 마세요 - 관리형/child 세션에서 실패합니다)."
    fi
  fi
fi

exit 0
