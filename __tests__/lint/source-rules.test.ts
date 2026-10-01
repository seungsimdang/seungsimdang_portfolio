import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compile } from "tailwindcss";
import { expect, test } from "vitest";
import { Button } from "@/components/ui/button";

const files = ["src/app", "src/components"].flatMap((directory) =>
  readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.(ts|tsx)$/.test(name))
    .map((name) => resolve(directory, name)),
);

test("앱 소스가 이름 있는 픽셀 토큰과 표준 클래스를 사용한다", async () => {
  expect(files.length > 0).toBeTruthy();
  const css = readFileSync("src/app/globals.css", "utf8");
  const theme = readFileSync("node_modules/tailwindcss/theme.css", "utf8");
  const compiler = await compile(
    css.replace(
      '@import "tailwindcss" source("../");',
      `${theme}\n@tailwind utilities;`,
    ),
  );
  const pairs = [
    ["max-w-content", "max-w-[1920px]", "max-width", "1920px"],
    ["max-w-heading", "max-w-[1200px]", "max-width", "1200px"],
    ["pt-header", "pt-[92px]", "padding-top", "92px"],
    ["min-h-project-info", "min-h-[200px]", "min-height", "200px"],
  ];
  for (const [canonical, arbitrary, property, value] of pairs) {
    const output = compiler.build([canonical, arbitrary]);
    expect(
      output.includes(`.${canonical} {\n  ${property}: ${value};`),
      `${canonical} must compile to ${value}`,
    ).toBeTruthy();
  }
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const [canonical, arbitrary] of pairs) {
      expect(
        !source.includes(arbitrary),
        `${file}: use ${canonical}`,
      ).toBeTruthy();
    }
    expect(
      !/\brounded(?:-[a-z]+)?-\[(?:2|4|6|8|12|16|24)px\]/.test(source),
      `${file}: use named radius tokens`,
    ).toBeTruthy();
  }
});

test("앱 소스에 금지된 대시와 문장형 한글 주석이 없다", () => {
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    expect(!source.includes("—"), `${file}: em dash`).toBeTruthy();
    for (const line of source.split("\n")) {
      expect(
        !/(\/\/|\s\*)[^\n]*(?<!마)다[.!]?[ \t]*$/.test(line),
        `${file}: sentence-ending comment`,
      ).toBeTruthy();
    }
  }
});

test("경로 별칭으로 가져온 실제 버튼이 전달받은 링크와 내용을 유지한다", () => {
  const element = Button({ href: "/contact", children: "문의하기" });
  expect(element.props).toMatchObject({
    href: "/contact",
    children: "문의하기",
  });
});
