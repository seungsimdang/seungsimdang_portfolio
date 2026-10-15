import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  postCreateFormSchema,
  postCreateInputSchema,
  postEditFormSchema,
  postUpdateInputSchema,
} from "@/schemas/blog.schema";
import {
  profileInputSchema,
  profileSectionFormSchema,
  profileUpdateInputSchema,
  projectFormKeepThumbnailSchema,
  projectFormSchema,
  projectUpdateInputSchema,
  resumeEntryFormSchema,
  resumeEntryUpdateInputSchema,
  talkUpdateInputSchema,
} from "@/schemas/portfolio.schema";

const profile = {
  name: "이름",
  title: "직함",
  tagline: "소개 문구",
  description: "설명",
  email: "test@example.com",
  github: "https://github.com/example",
  skills: [{ value: "React" }],
  tools: [{ value: "Git" }],
};

const experience = {
  title: "개선",
  problem: "문제 설명",
  solution: "해결 설명",
  tradeoff: { advantages: "장점", disadvantages: "단점", rationale: "근거" },
  result: "결과",
  learning: "배운 점",
  links: [],
};

const project = {
  slug: "sample-project",
  title: "프로젝트",
  period: "2025",
  role: "개발",
  summary: "요약",
  link: "",
  thumbnail: "https://ci-test.public.blob.vercel-storage.com/thumbnails/a.png",
  techStack: [{ value: "Next.js" }],
  experiences: [experience],
};

const post = {
  title: "게시글",
  content: "본문",
  categories: [{ value: "개발" }],
  tags: [{ value: "테스트" }],
  publishedAt: "2025.06.15",
};

beforeAll(() => {
  vi.stubEnv(
    "NEXT_PUBLIC_BLOB_HOSTNAME",
    "ci-test.public.blob.vercel-storage.com",
  );
});

afterAll(() => vi.unstubAllEnvs());

describe("프로필 부분 저장 입력 스키마", () => {
  it("일부 항목만 검증하고 기존 값 규칙으로 정리한다", () => {
    expect(
      profileUpdateInputSchema.parse({ name: " 이름 ", skills: [" React "] }),
    ).toEqual({
      name: "이름",
      skills: ["React"],
    });
  });

  it.each([{}, { name: undefined }])(
    "변경 값이 없는 입력을 거부한다: %j",
    (input) => {
      expect(profileUpdateInputSchema.safeParse(input).success).toBe(false);
    },
  );

  it("null, 잘못된 값, 알 수 없는 키를 거부한다", () => {
    expect(profileUpdateInputSchema.safeParse({ name: null }).success).toBe(
      false,
    );
    expect(
      profileUpdateInputSchema.safeParse({ email: "잘못된 이메일" }).success,
    ).toBe(false);
    expect(
      profileUpdateInputSchema.safeParse({ name: "이름", admin: true }).success,
    ).toBe(false);
  });
});

describe("관리자 폼 출력과 서버 입력 스키마 호환", () => {
  it.each([
    ["home", ["name", "title", "tagline", "description"]],
    ["about", ["skills", "tools"]],
    ["contact", ["email", "github"]],
  ] as const)(
    "프로필 %s 폼은 해당 키만 서버 입력 모양으로 출력한다",
    (section, keys) => {
      const output = profileSectionFormSchema(section).parse(profile);
      expect(Object.keys(output).sort()).toEqual([...keys].sort());
      expect(profileUpdateInputSchema.parse(output)).toEqual(output);
      expect(profileInputSchema.partial().safeParse(output).success).toBe(true);
    },
  );

  it("이력 폼의 상세 항목을 서버 입력 모양으로 출력한다", () => {
    const output = resumeEntryFormSchema.parse({
      period: "2025",
      title: "경력",
      subtitle: "회사",
      details: [{ value: "업무" }],
    });
    expect(output).toEqual({
      period: "2025",
      title: "경력",
      subtitle: "회사",
      details: ["업무"],
    });
    expect(resumeEntryUpdateInputSchema.parse(output)).toEqual(output);
  });

  it("프로젝트 폼의 기술 스택과 경험을 서버 입력 모양으로 출력한다", () => {
    const output = projectFormSchema.parse(project);
    expect(output.techStack).toEqual(["Next.js"]);
    expect(projectUpdateInputSchema.parse(output)).toEqual(output);
  });

  it("변경하지 않은 기존 썸네일은 제외하면 서버 입력에 호환된다", () => {
    const output = projectFormKeepThumbnailSchema.parse({
      ...project,
      thumbnail: " legacy-value ",
    });
    expect(output.thumbnail).toBe("legacy-value");
    const { thumbnail: _thumbnail, ...withoutThumbnail } = output;
    expect(projectUpdateInputSchema.parse(withoutThumbnail)).toEqual(
      withoutThumbnail,
    );
  });

  it("발표 폼 입력은 서버 발표 수정 스키마와 호환된다", () => {
    const output = {
      slug: "sample-talk",
      title: "발표",
      date: "2025.06",
      venue: "장소",
      description: "설명",
      impact: "효과",
      link: "https://example.com",
    };
    expect(talkUpdateInputSchema.parse(output)).toEqual(output);
  });

  it("게시글 생성 폼 출력은 생성 API 입력과 일치한다", () => {
    const output = postCreateFormSchema.parse({ ...post, slug: "sample-post" });
    expect(output).toEqual({
      slug: "sample-post",
      title: "게시글",
      content: "본문",
      categories: ["개발"],
      tags: ["테스트"],
      publishedAt: "2025-06-15",
    });
    expect(postCreateInputSchema.parse(output)).toEqual(output);
  });

  it("게시글 수정 폼 출력에서 읽기 전용 slug를 빼면 수정 API 입력과 일치한다", () => {
    const output = postEditFormSchema.parse({ ...post, slug: "sample-post" });
    const { slug: _slug, ...apiInput } = output;
    expect(postUpdateInputSchema.parse(apiInput)).toEqual(apiInput);
  });
});
