import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

test("커밋 검사가 인덱스 소스를 확인하고 기준 작성자를 강제한다", () => {
  const fixture = mkdtempSync(join(tmpdir(), "portfolio-git-guards-"));
  const run = (
    command: string,
    args: string[],
    expected = 0,
    extraEnv: Partial<NodeJS.ProcessEnv> = {},
  ) => {
    const result = spawnSync(command, args, {
      cwd: fixture,
      encoding: "utf8",
      env: { ...process.env, ...extraEnv },
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(expected);
  };
  try {
    cpSync(resolve("scripts"), join(fixture, "scripts"), { recursive: true });
    mkdirSync(join(fixture, "src/app"), { recursive: true });
    run("git", ["init", "-q"]);
    run("git", ["config", "user.name", "SeungHyun Lee"]);
    run("git", ["config", "user.email", "oak20005@naver.com"]);
    run("sh", ["scripts/check-commit-identity.sh"]);
    run("sh", ["scripts/check-commit-identity.sh"], 1, {
      GIT_AUTHOR_EMAIL: "other@example.com",
    });
    run("git", ["config", "user.email", "other@example.com"]);
    run("sh", ["scripts/check-commit-identity.sh"], 1);

    const source = join(fixture, "src/app/page.tsx");
    writeFileSync(source, 'export const text = "clean";\n');
    run("git", ["add", "src/app/page.tsx"]);
    run("sh", ["scripts/check-em-dash-in-source.sh", "src/app/page.tsx"]);
    run("sh", ["scripts/check-ephemeral-comment-refs.sh", "src/app/page.tsx"]);
    writeFileSync(source, 'export const text = "bad — text";\n');
    run("git", ["add", "src/app/page.tsx"]);
    writeFileSync(source, 'export const text = "clean working tree";\n');
    run("sh", ["scripts/check-em-dash-in-source.sh", "src/app/page.tsx"], 1);
    writeFileSync(
      source,
      '// code-review-1.md\nexport const text = "clean";\n',
    );
    run("git", ["add", "src/app/page.tsx"]);
    run(
      "sh",
      ["scripts/check-ephemeral-comment-refs.sh", "src/app/page.tsx"],
      1,
    );

    const doc = join(fixture, "sample.md");
    writeFileSync(doc, "A complete paragraph.\n");
    run("git", ["add", "sample.md"]);
    run("sh", ["scripts/check-markdown-line-wrap.sh", "sample.md"]);
    writeFileSync(doc, "A paragraph broken\nin the middle.\n");
    run("git", ["add", "sample.md"]);
    run("sh", ["scripts/check-markdown-line-wrap.sh", "sample.md"], 1);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
