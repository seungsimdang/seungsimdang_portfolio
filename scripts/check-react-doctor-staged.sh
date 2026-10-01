#!/bin/sh
set -eu
if git diff --cached --quiet -- '*.js' '*.jsx' '*.ts' '*.tsx' '*.mjs' '*.cjs' '*.json' '*.yaml' '*.yml' '*.css'; then
  echo 'No staged source or configuration changes; React Doctor staged check not applicable.'
  exit 0
fi
pnpm exec react-doctor --staged --blocking warning --yes --no-telemetry
