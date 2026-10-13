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

test("develop·main push는 병합 커밋만 받고 main은 develop 병합만 허용한다", () => {
  const fixture = mkdtempSync(join(tmpdir(), "portfolio-merge-only-"));
  const git = (...args: string[]) =>
    spawnSync("git", args, { cwd: fixture, encoding: "utf8" }).stdout.trim();
  const commit = (message: string) => {
    git("commit", "-q", "--allow-empty", "-m", message);
    return git("rev-parse", "HEAD");
  };
  const zero = "0".repeat(40);
  const push = (lines: string[][]) =>
    spawnSync("sh", ["scripts/check-merge-only-push.sh", "origin"], {
      cwd: fixture,
      encoding: "utf8",
      input: `${lines.map((line) => line.join(" ")).join("\n")}\n`,
    }).status;
  try {
    cpSync(resolve("scripts"), join(fixture, "scripts"), { recursive: true });
    git("init", "-q", "-b", "main");
    git("config", "user.name", "Test");
    git("config", "user.email", "test@example.com");
    const base = commit("base");
    git("switch", "-q", "-c", "feature/a");
    const feature = commit("feature");
    git("switch", "-q", "--detach", base);
    git("merge", "-q", "--no-ff", "feature/a", "-m", "merge feature");
    const developMerge = git("rev-parse", "HEAD");
    git("switch", "-q", "--detach", base);
    git("merge", "-q", "--no-ff", developMerge, "-m", "merge develop");
    const mainMerge = git("rev-parse", "HEAD");
    git("switch", "-q", "--detach", base);
    git("merge", "-q", "--no-ff", "feature/a", "-m", "merge feature to main");
    const mainFromFeature = git("rev-parse", "HEAD");

    const develop = (sha: string) => [
      "refs/heads/develop",
      sha,
      "refs/heads/develop",
      base,
    ];
    const main = (sha: string) => [
      "refs/heads/main",
      sha,
      "refs/heads/main",
      base,
    ];
    expect(push([develop(feature)])).toBe(1);
    expect(push([develop(developMerge)])).toBe(0);
    expect(push([develop(developMerge), main(mainMerge)])).toBe(0);
    expect(push([main(mainMerge)])).toBe(1);
    expect(push([develop(developMerge), main(mainFromFeature)])).toBe(1);
    expect(push([develop(zero)])).toBe(1);
    expect(
      push([["refs/heads/feature/a", feature, "refs/heads/feature/a", zero]]),
    ).toBe(0);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
