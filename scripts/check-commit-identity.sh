#!/bin/sh
set -eu
allowed_name='SeungHyun Lee'
allowed_email='oak20005@naver.com'
actual_name=$(git config user.name || true)
actual_email=$(git config user.email || true)
author_ident=$(git var GIT_AUTHOR_IDENT)
if [ "$actual_name" != "$allowed_name" ] || [ "$actual_email" != "$allowed_email" ]; then
  echo "커밋 차단: Candanta와 동일한 작성자 $allowed_name <$allowed_email>만 허용합니다." >&2
  exit 1
fi
case "$author_ident" in
  "$allowed_name <$allowed_email> "*) ;;
  *) echo '커밋 차단: 실제 author ident가 허용된 작성자와 다릅니다.' >&2; exit 1 ;;
esac
