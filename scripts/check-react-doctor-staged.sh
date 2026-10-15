#!/bin/sh
# pre-commit 훅: 스테이징된 소스·설정 변경이 있을 때만 React Doctor를 warning 차단 수준으로 실행
set -eu
if git diff --cached --quiet -- '*.js' '*.jsx' '*.ts' '*.tsx' '*.mjs' '*.cjs' '*.json' '*.yaml' '*.yml' '*.css'; then
  echo 'No staged source or configuration changes; React Doctor staged check not applicable.'
  exit 0
fi
pnpm exec react-doctor --staged --blocking warning --yes --no-telemetry
