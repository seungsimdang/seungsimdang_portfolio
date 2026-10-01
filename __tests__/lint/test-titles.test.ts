import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

test("한글 제목은 허용하고 플러그인이 영문 설명과 동적 제목을 차단한다", () => {
  const fixture = mkdtempSync(join(tmpdir(), "portfolio-test-titles-"));
  try {
    cpSync("plugins/korean-test-titles.grit", join(fixture, "titles.grit"));
    writeFileSync(
      join(fixture, "biome.json"),
      JSON.stringify({
        plugins: ["./titles.grit"],
        linter: { rules: { preset: "none" } },
        formatter: { enabled: false },
      }),
    );
    const check = (body: string, expected = 0) => {
      const file = join(fixture, "fixture.spec.ts");
      writeFileSync(file, body);
      const result = spawnSync(
        resolve("node_modules/.bin/biome"),
        ["lint", `--config-path=${fixture}`, file],
        { encoding: "utf8" },
      );
      expect(result.status, `${body}\n${result.stdout}\n${result.stderr}`).toBe(
        expected,
      );
      if (expected) expect(result.stderr).toMatch(/테스트 제목의 설명/);
    };
    const source = (body: string) =>
      `import { test } from '@playwright/test'; ${body}`;
    check(source("test('페이지를 표시한다', () => {});"));
    check(source("test(`" + "$" + "{path} 페이지를 표시한다`, () => {});"));
    check(source("test('english', () => {});"), 1);
    check(source("test('페이지 renders', () => {});"), 1);
    check(source("test(`" + "$" + "{path} 페이지 renders`, () => {});"), 1);
    check(source("test(title, () => {});"), 1);
    check(source("test.describe.only('suite', () => {});"), 1);
    check(source("test.skip('english', () => {});"), 1);
    check(source("test('페이지를 표시한다', {tag: '@smoke'}, () => {});"));
    check(
      source(
        "test.describe(() => {}); test.skip(true, 'reason'); test.skip(condition, 'reason');",
      ),
    );
    check(
      "import {test as scenario, expect} from '@playwright/test'; scenario('english', () => {});",
      1,
    );
    check(
      "import {test as scenario} from '@playwright/test'; scenario.describe.only('suite', () => {});",
      1,
    );
    check(
      "import {test as scenario} from '@playwright/test'; scenario('한글 제목', () => {}); scenario.extend({});",
    );
    check(
      "import scenario from 'node:test'; scenario('english', () => {});",
      1,
    );
    check("import scenario from 'node:test'; scenario('한글 제목', () => {});");
    check(
      "import * as runner from '@playwright/test'; runner.test('english', () => {});",
      1,
    );
    check(
      "import * as runner from '@playwright/test'; runner.test('한글 제목', () => {});",
    );
    check("import helper from './helper'; helper('english', () => {});");
    check("import { it } from 'vitest'; it('페이지를 표시한다', () => {});");
    check("import { it } from 'vitest'; it('english', () => {});", 1);
    check(
      "import { describe } from 'vitest'; describe('탐색 기능', () => {});",
    );
    check(
      "import { describe } from 'vitest'; describe('navigation', () => {});",
      1,
    );
    check(
      "import { it as scenario } from 'vitest'; scenario('english', () => {});",
      1,
    );
    check(
      "import { it as scenario } from 'vitest'; scenario('페이지를 표시한다', () => {});",
    );
    check(
      "import * as runner from 'vitest'; runner.describe('navigation', () => {});",
      1,
    );
    check(
      "import * as runner from 'vitest'; runner.it('페이지를 표시한다', () => {});",
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
