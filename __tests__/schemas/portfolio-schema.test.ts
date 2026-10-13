import { describe, expect, it } from "vitest";
import {
  isValidThumbnail,
  ORDER_SLUGS_MAX,
  orderInputSchema,
  profileInputSchema,
  projectCreateInputSchema,
  projectUpdateInputSchema,
  talkCreateInputSchema,
} from "@/schemas/portfolio.schema";

const experience = {
  title: "t",
  problem: "p",
  solution: "s",
  tradeoff: { advantages: "", disadvantages: "", rationale: "" },
  result: "r",
  learning: "l",
};
const project = {
  slug: "my-proj",
  title: "t",
  period: "2025",
  role: "r",
  summary: "s",
  techStack: ["a"],
  experiences: [experience],
};
const talk = {
  slug: "talk-1",
  title: "t",
  date: "2025.06",
  venue: "v",
  description: "d",
  impact: "i",
  link: "https://example.com",
};
const profile = {
  name: "n",
  title: "t",
  tagline: "a\nb",
  description: "d",
  email: "a@b.co",
  github: "https://github.com/x",
  skills: ["a"],
};

describe("slug", () => {
  it.each(["a", "a1", "my-proj", "a-b-c"])("%s 허용", (slug) => {
    expect(
      projectCreateInputSchema.safeParse({ ...project, slug }).success,
    ).toBe(true);
  });
  it.each([
    "",
    "A",
    "a_b",
    "-a",
    "a-",
    "a--b",
    "a b",
    "new",
    "a".repeat(65),
    "한글",
  ])("%j 거부", (slug) => {
    expect(
      projectCreateInputSchema.safeParse({ ...project, slug }).success,
    ).toBe(false);
  });
  it("talk slug도 같은 규칙", () => {
    expect(
      talkCreateInputSchema.safeParse({ ...talk, slug: "New" }).success,
    ).toBe(false);
    expect(talkCreateInputSchema.safeParse(talk).success).toBe(true);
  });
  it("수정 스키마는 slug 필드를 거부 (불변)", () => {
    const { slug: _s, ...rest } = project;
    expect(projectUpdateInputSchema.safeParse(rest).success).toBe(true);
    expect(projectUpdateInputSchema.safeParse(project).success).toBe(false);
  });
});

describe("링크 스킴", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "ftp://example.com",
    "mailto:a@b.co",
    "//example.com",
    "example.com",
  ])("project.link %s 거부", (link) => {
    expect(
      projectCreateInputSchema.safeParse({ ...project, link }).success,
    ).toBe(false);
  });
  it("http/https와 빈 문자열 허용", () => {
    for (const link of ["http://a.com", "https://a.com", ""]) {
      expect(
        projectCreateInputSchema.safeParse({ ...project, link }).success,
      ).toBe(true);
    }
  });
  it("experience 링크의 javascript: 거부", () => {
    const bad = {
      ...project,
      experiences: [
        { ...experience, links: [{ label: "x", url: "javascript:1" }] },
      ],
    };
    expect(projectCreateInputSchema.safeParse(bad).success).toBe(false);
  });
  it("talk link는 필수이며 http(s)만", () => {
    expect(
      talkCreateInputSchema.safeParse({ ...talk, link: "javascript:1" })
        .success,
    ).toBe(false);
    expect(talkCreateInputSchema.safeParse({ ...talk, link: "" }).success).toBe(
      false,
    );
  });
  it("profile github는 https만", () => {
    expect(profileInputSchema.safeParse(profile).success).toBe(true);
    expect(
      profileInputSchema.safeParse({
        ...profile,
        github: "http://github.com/x",
      }).success,
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({ ...profile, email: "bad" }).success,
    ).toBe(false);
  });
});

describe("썸네일", () => {
  it.each(["/images/a.png", "/images/dir/a-b_1.webp"])("%s 허용", (v) => {
    expect(isValidThumbnail(v)).toBe(true);
    expect(
      projectCreateInputSchema.safeParse({ ...project, thumbnail: v }).success,
    ).toBe(true);
  });
  it.each([
    "/images/../etc/passwd",
    "/images/a/..",
    "https://a.com/x.png",
    "images/a.png",
    "/img/a.png",
    "/images/",
    "/images/a b.png",
    "//images/a.png",
  ])("%s 거부", (v) => {
    expect(isValidThumbnail(v)).toBe(false);
    expect(
      projectCreateInputSchema.safeParse({ ...project, thumbnail: v }).success,
    ).toBe(false);
  });
  it("빈 문자열과 생략 허용", () => {
    expect(
      projectCreateInputSchema.safeParse({ ...project, thumbnail: "" }).success,
    ).toBe(true);
    expect(projectCreateInputSchema.safeParse(project).success).toBe(true);
  });
});

describe("strictObject와 길이 상한", () => {
  it("프로젝트 미지 필드 거부", () => {
    expect(
      projectCreateInputSchema.safeParse({ ...project, extra: 1 }).success,
    ).toBe(false);
  });
  it("experience와 tradeoff 미지 필드 거부", () => {
    expect(
      projectCreateInputSchema.safeParse({
        ...project,
        experiences: [{ ...experience, x: 1 }],
      }).success,
    ).toBe(false);
    const t = { ...experience, tradeoff: { ...experience.tradeoff, x: "" } };
    expect(
      projectCreateInputSchema.safeParse({ ...project, experiences: [t] })
        .success,
    ).toBe(false);
  });
  it("profile, talk 미지 필드 거부", () => {
    expect(profileInputSchema.safeParse({ ...profile, x: 1 }).success).toBe(
      false,
    );
    expect(talkCreateInputSchema.safeParse({ ...talk, x: 1 }).success).toBe(
      false,
    );
  });
  it("tradeoff 빈 문자열 허용, problem 빈 문자열 거부", () => {
    expect(projectCreateInputSchema.safeParse(project).success).toBe(true);
    expect(
      projectCreateInputSchema.safeParse({
        ...project,
        experiences: [{ ...experience, problem: " " }],
      }).success,
    ).toBe(false);
  });
  it("단문 200자, 장문 5000자, 목록 50개 상한", () => {
    expect(
      projectCreateInputSchema.safeParse({ ...project, title: "a".repeat(201) })
        .success,
    ).toBe(false);
    expect(
      projectCreateInputSchema.safeParse({ ...project, title: "a".repeat(200) })
        .success,
    ).toBe(true);
    expect(
      projectCreateInputSchema.safeParse({
        ...project,
        summary: "a".repeat(5001),
      }).success,
    ).toBe(false);
    expect(
      projectCreateInputSchema.safeParse({
        ...project,
        techStack: Array(51).fill("a"),
      }).success,
    ).toBe(false);
    expect(
      projectCreateInputSchema.safeParse({
        ...project,
        experiences: Array(51).fill(experience),
      }).success,
    ).toBe(false);
  });
  it("talk date는 YYYY.MM", () => {
    for (const date of ["2025.13", "2025-06", "25.06", "2025.00"]) {
      expect(talkCreateInputSchema.safeParse({ ...talk, date }).success).toBe(
        false,
      );
    }
  });
});

describe("순서 slug 상한", () => {
  const slugs = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);
  it("상한까지 허용, 초과 거부", () => {
    expect(
      orderInputSchema.safeParse({ slugs: slugs(ORDER_SLUGS_MAX) }).success,
    ).toBe(true);
    expect(
      orderInputSchema.safeParse({ slugs: slugs(ORDER_SLUGS_MAX + 1) }).success,
    ).toBe(false);
  });
  it("빈 배열, 중복, 미지 필드 거부", () => {
    expect(orderInputSchema.safeParse({ slugs: [] }).success).toBe(false);
    expect(orderInputSchema.safeParse({ slugs: ["a", "a"] }).success).toBe(
      false,
    );
    expect(orderInputSchema.safeParse({ slugs: ["a"], x: 1 }).success).toBe(
      false,
    );
  });
});
