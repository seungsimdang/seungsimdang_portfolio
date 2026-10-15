import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const files = readdirSync("src", { recursive: true, encoding: "utf8" })
  .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name))
  .map((name) => resolve("src", name));

// window/globalThis 경유 호출과 전역 직접 호출을 모두 잡고, 메서드 호출(x.confirm)과 함수 선언은 제외함
const DIALOG_CALL =
  /(?:\b(?:window|globalThis|self)\s*\.\s*|(?<![\w$.]))(?<!function\s)(confirm|alert|prompt)\s*\(/g;

function findDialogCalls(source: string) {
  return [...source.matchAll(DIALOG_CALL)].map((match) => match[0]);
}

test("src 소스에 브라우저 기본 대화상자 호출이 없다", () => {
  expect(files.length > 0).toBeTruthy();
  for (const file of files) {
    const calls = findDialogCalls(readFileSync(file, "utf8"));
    expect(calls, `${file}: use ConfirmDialog or toast`).toEqual([]);
  }
});

test("대화상자 호출 감지 정규식이 실제 호출 형태를 잡는다", () => {
  expect(findDialogCalls("if (window.confirm('x')) go();")).toHaveLength(1);
  expect(findDialogCalls("globalThis.alert('x');")).toHaveLength(1);
  expect(findDialogCalls("const v = prompt('x');")).toHaveLength(1);
  expect(findDialogCalls("async function confirm() {}")).toEqual([]);
  expect(findDialogCalls("dialog.confirm();")).toEqual([]);
});
