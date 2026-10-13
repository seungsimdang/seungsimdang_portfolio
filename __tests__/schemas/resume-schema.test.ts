import { describe, expect, it } from "vitest";
import { RESUME_KINDS } from "@/constants/resume";
import {
  RESUME_KIND_MAX,
  resumeEntryCreateInputSchema,
  resumeEntryUpdateInputSchema,
  resumeOrderInputSchema,
} from "@/schemas/portfolio.schema";

const entry = {
  period: "2024.07 - 2026.07",
  title: "t",
  subtitle: "",
  details: [],
};
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("이력 항목 생성 스키마", () => {
  it.each(RESUME_KINDS)("허용 kind %s를 통과시킨다", (kind) => {
    expect(
      resumeEntryCreateInputSchema.safeParse({ ...entry, kind }).success,
    ).toBe(true);
  });

  it("허용 목록 밖 kind를 거부한다", () => {
    for (const kind of ["experience", "", "WORK", undefined, 1]) {
      expect(
        resumeEntryCreateInputSchema.safeParse({ ...entry, kind }).success,
      ).toBe(false);
    }
  });

  it("kind 없는 생성 요청을 거부한다", () => {
    expect(resumeEntryCreateInputSchema.safeParse(entry).success).toBe(false);
  });

  it("알 수 없는 필드를 거부한다", () => {
    expect(
      resumeEntryCreateInputSchema.safeParse({
        ...entry,
        kind: "work",
        gpa: "4.0",
      }).success,
    ).toBe(false);
  });
});

describe("이력 항목 수정 스키마", () => {
  it("빈 period와 빈 subtitle을 허용한다", () => {
    const parsed = resumeEntryUpdateInputSchema.safeParse({
      ...entry,
      period: "",
      subtitle: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("period 앞뒤 공백을 제거하고 공백만 있으면 빈 값이 된다", () => {
    const parsed = resumeEntryUpdateInputSchema.parse({
      ...entry,
      period: "   ",
    });
    expect(parsed.period).toBe("");
  });

  it("period 100자는 통과하고 101자는 거부한다", () => {
    expect(
      resumeEntryUpdateInputSchema.safeParse({
        ...entry,
        period: "a".repeat(100),
      }).success,
    ).toBe(true);
    expect(
      resumeEntryUpdateInputSchema.safeParse({
        ...entry,
        period: "a".repeat(101),
      }).success,
    ).toBe(false);
  });

  it("title은 필수이며 공백만 있으면 거부한다", () => {
    expect(
      resumeEntryUpdateInputSchema.safeParse({ ...entry, title: "" }).success,
    ).toBe(false);
    expect(
      resumeEntryUpdateInputSchema.safeParse({ ...entry, title: "  " }).success,
    ).toBe(false);
  });

  it("title과 subtitle은 200자까지 허용하고 201자는 거부한다", () => {
    expect(
      resumeEntryUpdateInputSchema.safeParse({
        ...entry,
        title: "a".repeat(200),
      }).success,
    ).toBe(true);
    expect(
      resumeEntryUpdateInputSchema.safeParse({
        ...entry,
        title: "a".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      resumeEntryUpdateInputSchema.safeParse({
        ...entry,
        subtitle: "a".repeat(200),
      }).success,
    ).toBe(true);
    expect(
      resumeEntryUpdateInputSchema.safeParse({
        ...entry,
        subtitle: "a".repeat(201),
      }).success,
    ).toBe(false);
  });

  it("details는 50개까지 허용하고 51개는 거부한다", () => {
    const make = (n: number) => Array.from({ length: n }, (_, i) => `d${i}`);
    expect(
      resumeEntryUpdateInputSchema.safeParse({ ...entry, details: make(50) })
        .success,
    ).toBe(true);
    expect(
      resumeEntryUpdateInputSchema.safeParse({ ...entry, details: make(51) })
        .success,
    ).toBe(false);
  });

  it("details의 빈 문자열 항목과 200자 초과 항목을 거부한다", () => {
    expect(
      resumeEntryUpdateInputSchema.safeParse({ ...entry, details: [""] })
        .success,
    ).toBe(false);
    expect(
      resumeEntryUpdateInputSchema.safeParse({
        ...entry,
        details: ["a".repeat(201)],
      }).success,
    ).toBe(false);
  });

  it("kind를 포함한 수정 요청을 거부한다", () => {
    expect(
      resumeEntryUpdateInputSchema.safeParse({ ...entry, kind: "work" })
        .success,
    ).toBe(false);
  });
});

describe("이력 정렬 스키마", () => {
  it("kind별 id 목록을 통과시킨다", () => {
    expect(
      resumeOrderInputSchema.safeParse({
        kind: "work",
        ids: [uuid(1), uuid(2)],
      }).success,
    ).toBe(true);
  });

  it("허용 목록 밖 kind를 거부한다", () => {
    expect(
      resumeOrderInputSchema.safeParse({ kind: "x", ids: [uuid(1)] }).success,
    ).toBe(false);
  });

  it("빈 목록을 거부한다", () => {
    expect(
      resumeOrderInputSchema.safeParse({ kind: "work", ids: [] }).success,
    ).toBe(false);
  });

  it("uuid가 아닌 id를 거부한다", () => {
    expect(
      resumeOrderInputSchema.safeParse({ kind: "work", ids: ["abc"] }).success,
    ).toBe(false);
  });

  it("중복 id를 거부한다", () => {
    expect(
      resumeOrderInputSchema.safeParse({
        kind: "work",
        ids: [uuid(1), uuid(1)],
      }).success,
    ).toBe(false);
  });

  it("상한 개수는 통과하고 상한을 넘으면 거부한다", () => {
    const make = (n: number) =>
      Array.from({ length: n }, (_, i) => uuid(i + 1));
    expect(
      resumeOrderInputSchema.safeParse({
        kind: "activity",
        ids: make(RESUME_KIND_MAX),
      }).success,
    ).toBe(true);
    expect(
      resumeOrderInputSchema.safeParse({
        kind: "activity",
        ids: make(RESUME_KIND_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("kind별 생성 상한은 50이다", () => {
    expect(RESUME_KIND_MAX).toBe(50);
  });
});
