import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { __unstable__loadDesignSystem } from "tailwindcss";
import { expect, test } from "vitest";

const require = createRequire(import.meta.url);

const files = readdirSync("src", { recursive: true, encoding: "utf8" })
  .filter((name) => /\.(ts|tsx)$/.test(name))
  .map((name) => resolve("src", name));

// Tailwind CSS IntelliSense의 suggestCanonicalClasses와 같은 엔진 API로 판정함
// rem 16은 IntelliSense의 rootFontSize 기본값과 맞춘 값
test("앱 소스의 Tailwind 클래스가 canonical 형태로 작성된다", async () => {
  expect(files.length > 0).toBeTruthy();
  const designSystem = await __unstable__loadDesignSystem(
    readFileSync("src/app/globals.css", "utf8"),
    {
      base: resolve("src/app"),
      async loadStylesheet(id, base) {
        const path = require.resolve(
          id === "tailwindcss" ? "tailwindcss/index.css" : id,
          { paths: [base] },
        );
        return {
          path,
          base: dirname(path),
          content: readFileSync(path, "utf8"),
        };
      },
    },
  );
  const violations: string[] = [];
  for (const file of files) {
    // 문자열을 공백·따옴표 단위로 나눈 뒤 parseCandidate로 Tailwind 클래스만 남김
    const tokens = new Set(
      readFileSync(file, "utf8").match(/[^\s"'`{}<>]+/g) ?? [],
    );
    for (const token of tokens) {
      if (designSystem.parseCandidate(token).length === 0) continue;
      const [canonical] = designSystem.canonicalizeCandidates([token], {
        rem: 16,
      });
      if (canonical !== token) {
        violations.push(`${file}: ${token} -> ${canonical}`);
      }
    }
  }
  expect(violations).toEqual([]);
});
