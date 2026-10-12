#!/bin/sh
# 로컬 e2e 실행: .env.local의 E2E_DATABASE_URL로 빌드·실행해 Production DB 대신 fixture 데이터로 검사
# 프로세스 환경변수가 .env.local보다 우선하므로 DATABASE_URL만 덮어씀
set -e
url=$(sed -n 's/^E2E_DATABASE_URL=//p' .env.local 2>/dev/null | tr -d '"')
if [ -z "$url" ]; then
  echo ".env.local에 E2E_DATABASE_URL 없음" >&2
  exit 1
fi
DATABASE_URL="$url" pnpm build
DATABASE_URL="$url" pnpm test:e2e "$@"
