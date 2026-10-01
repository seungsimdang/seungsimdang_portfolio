export default {
  "*.{ts,tsx,js,jsx,mjs,json,css}":
    "biome check --write --error-on-warnings --no-errors-on-unmatched",
  "{src,tests/e2e}/**/*.{ts,tsx,js,jsx}": [
    "sh scripts/check-ephemeral-comment-refs.sh",
    "sh scripts/check-em-dash-in-source.sh",
  ],
  "{src,tests,__tests__,scripts,.claude/hooks,.codex/hooks}/**/*.{ts,tsx,js,jsx,mjs,sh}":
    "node scripts/check-comment-line-breaks.mjs",
  "*.md": "sh scripts/check-markdown-line-wrap.sh",
};
