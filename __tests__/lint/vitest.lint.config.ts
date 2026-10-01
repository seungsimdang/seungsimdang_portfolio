import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/lint/**/*.test.ts"],
    exclude: ["node_modules/**", ".claude/worktrees/**", ".codex/worktrees/**"],
  },
});
