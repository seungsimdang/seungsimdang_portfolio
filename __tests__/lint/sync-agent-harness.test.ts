import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("하네스 변경과 누락을 검출하고 인덱스 상태를 독립적으로 검사한다", () => {
  const fixture = mkdtempSync(join(tmpdir(), "portfolio-harness-"));
  try {
    for (const directory of [
      "scripts",
      "docs/agent-harness",
      ".codex/agents",
      ".claude/agents",
    ]) {
      cpSync(join(root, directory), join(fixture, directory), {
        recursive: true,
      });
    }
    const manifest = JSON.parse(
      readFileSync(join(root, "docs/agent-harness/manifest.json"), "utf8"),
    );
    for (const skill of manifest.skills) {
      for (const tool of [".agents", ".claude"]) {
        const directory = `${tool}/skills/${skill}`;
        cpSync(join(root, directory), join(fixture, directory), {
          recursive: true,
        });
      }
    }
    const run = (command: string, args: string[], expected = 0) => {
      const result = spawnSync(command, args, {
        cwd: fixture,
        encoding: "utf8",
      });
      expect(
        result.status,
        `${command}: ${result.stdout}\n${result.stderr}`,
      ).toBe(expected);
    };
    const check = (expected = 0) =>
      run(
        process.execPath,
        ["scripts/sync-agent-harness.mjs", "--check"],
        expected,
      );
    const sync = () =>
      run(process.execPath, ["scripts/sync-agent-harness.mjs", "--write"]);
    check();
    const manifestPath = join(fixture, "docs/agent-harness/manifest.json");
    const validManifest = readFileSync(manifestPath, "utf8");
    delete manifest.roles[0].codex.model_reasoning_effort;
    writeFileSync(manifestPath, JSON.stringify(manifest));
    check(1);
    run(process.execPath, ["scripts/sync-agent-harness.mjs", "--write"], 1);
    writeFileSync(manifestPath, validManifest);
    check();

    const output = join(fixture, ".codex/agents/designer.toml");
    writeFileSync(output, `${readFileSync(output, "utf8")}# drift\n`);
    check(1);
    sync();
    check();
    unlinkSync(output);
    check(1);
    sync();
    check();

    const role = join(
      fixture,
      "docs/agent-harness/templates/.claude/agents/designer.md",
    );
    writeFileSync(role, `${readFileSync(role, "utf8")}\nFixture change.\n`);
    check(1);
    sync();
    check();

    run("git", ["init", "-q"]);
    run("sh", ["scripts/check-agent-harness-sync.sh"]);
    run("sh", ["scripts/check-react-doctor-staged.sh"]);
    writeFileSync(join(fixture, ".gitignore"), "/artifacts/archive/\n");
    run("git", ["add", ".gitignore"]);
    run("sh", ["scripts/check-react-doctor-staged.sh"]);
    run("git", ["add", "."]);
    run("sh", ["scripts/check-agent-harness-sync.sh"]);
    run("git", ["rm", "--cached", "scripts/sync-agent-harness.mjs"]);
    run("sh", ["scripts/check-agent-harness-sync.sh"], 1);
    run("git", ["add", "scripts/sync-agent-harness.mjs"]);
    const source = join(
      fixture,
      "docs/agent-harness/templates/.claude/skills/git-commit/SKILL.md",
    );
    writeFileSync(
      source,
      `${readFileSync(source, "utf8")}\nStaged-only drift.\n`,
    );
    run("git", [
      "add",
      "docs/agent-harness/templates/.claude/skills/git-commit/SKILL.md",
    ]);
    sync();
    check();
    run("sh", ["scripts/check-agent-harness-sync.sh"], 1);
    run("git", ["add", "."]);
    run("sh", ["scripts/check-agent-harness-sync.sh"]);
    run("git", [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.com",
      "commit",
      "-qm",
      "fixture",
    ]);
    run("git", [
      "rm",
      "-r",
      "--cached",
      "docs/agent-harness",
      ".codex/agents",
      ".claude/agents",
      ".agents/skills/git-commit",
      ".claude/skills/git-commit",
    ]);
    run("sh", ["scripts/check-agent-harness-sync.sh"], 1);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
