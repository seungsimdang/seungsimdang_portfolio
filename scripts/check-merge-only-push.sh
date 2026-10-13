#!/bin/sh
# develop·main 갱신 push에서 fast-forward 반영 차단
# 새로 들어오는 first-parent 커밋은 모두 병합 커밋이어야 함
# main 병합 커밋의 두 번째 부모는 develop first-parent 경로 위의 커밋이어야 함
set -eu
remote=${1:-origin}
zero=0000000000000000000000000000000000000000
input=$(cat)
develop_sha=$(printf '%s\n' "$input" | awk '$3 == "refs/heads/develop" { print $2 }')

fail() {
  echo "push 차단: $1" >&2
  exit 1
}

printf '%s\n' "$input" | while read -r _local_ref local_sha remote_ref remote_sha; do
  case "$remote_ref" in
    refs/heads/develop | refs/heads/main) ;;
    *) continue ;;
  esac
  branch=${remote_ref#refs/heads/}
  [ "$local_sha" != "$zero" ] || fail "${branch} 삭제는 허용하지 않습니다"
  if [ "$remote_sha" = "$zero" ]; then
    commits=$(git rev-list --first-parent "$local_sha" --not --remotes="$remote")
  else
    git cat-file -e "$remote_sha^{commit}" 2>/dev/null ||
      fail "원격 ${branch}($remote_sha)가 로컬에 없습니다. git fetch 후 다시 시도하세요"
    commits=$(git rev-list --first-parent "$remote_sha..$local_sha")
  fi
  for commit in $commits; do
    second=$(git rev-parse -q --verify "$commit^2" || true)
    [ -n "$second" ] ||
      fail "${branch}에 병합 커밋이 아닌 $(git log -1 --format='%h %s' "$commit")이 들어갑니다. feature/*(main은 develop)를 git merge --no-ff로만 반영하세요"
    [ "$branch" = main ] || continue
    for develop_ref in "$develop_sha" "refs/remotes/$remote/develop"; do
      [ -n "$develop_ref" ] && git rev-list --first-parent "$develop_ref" 2>/dev/null | grep -qx "$second" && continue 2
    done
    fail "main 병합 커밋 $(git rev-parse --short "$commit")의 두 번째 부모가 develop에 없습니다. develop만 main에 병합하세요"
  done
done
