import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    setupFiles: ["__tests__/setup/clear-git-env.ts"],
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    exclude: ["node_modules/**", ".claude/worktrees/**", ".codex/worktrees/**"],
  },
});
