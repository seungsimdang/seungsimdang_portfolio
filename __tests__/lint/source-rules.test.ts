import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { Button } from "@/components/ui/button";

const files = ["src/app", "src/components"].flatMap((directory) =>
  readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.(ts|tsx)$/.test(name))
    .map((name) => resolve(directory, name)),
);

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
