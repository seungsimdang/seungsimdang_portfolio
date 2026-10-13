import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["__tests__/setup/clear-git-env.ts"],
    include: ["__tests__/lint/**/*.test.ts"],
    exclude: ["node_modules/**", ".claude/worktrees/**", ".codex/worktrees/**"],
  },
});
