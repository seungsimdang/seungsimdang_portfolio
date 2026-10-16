#!/bin/sh
# 로컬 e2e 실행: .env.local의 E2E_DATABASE_URL로 빌드·실행해 Production DB 대신 fixture 데이터로 검사
# 프로세스 환경변수가 .env.local보다 우선하므로 DATABASE_URL만 덮어씀
set -e
url=$(sed -n 's/^E2E_DATABASE_URL=//p' .env.local 2>/dev/null | tr -d '"')
if [ -z "$url" ]; then
  echo ".env.local에 E2E_DATABASE_URL 없음" >&2
  exit 1
fi
# 빌드 마이그레이션이 Production에 적용되지 않도록 .env.local의 DATABASE_URL과 같은 DB 호스트면 중단
# 따옴표·공백·쿼리스트링·pooler 접미사 차이로 같은 DB를 놓치지 않도록 호스트만 뽑아 비교함
db_host() {
  printf '%s' "$1" | tr -d "\"' \r" | sed -e 's#^[^@]*@##' -e 's#[:/?].*$##' -e 's#-pooler\.#.#'
}
prod_url=$(sed -n 's/^DATABASE_URL=//p' .env.local 2>/dev/null)
if [ -n "$prod_url" ] && [ "$(db_host "$url")" = "$(db_host "$prod_url")" ]; then
  echo "E2E_DATABASE_URL이 DATABASE_URL과 같은 DB 호스트를 가리킴" >&2
  exit 1
fi
# CI와 같은 E2E DB를 쓰므로 썸네일 Blob 호스트도 CI(.github/workflows/ci.yml) 값으로 맞춤
# 로컬 .env.local의 실제 호스트를 쓰면 fixture 썸네일 URL이 검증에서 걸러짐
blob_host=ci-test.public.blob.vercel-storage.com
DATABASE_URL="$url" NEXT_PUBLIC_BLOB_HOSTNAME="$blob_host" MIGRATE_ON_BUILD=1 pnpm build
DATABASE_URL="$url" NEXT_PUBLIC_BLOB_HOSTNAME="$blob_host" pnpm test:e2e "$@"
