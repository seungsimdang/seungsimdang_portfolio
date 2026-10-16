// e2e 전용 테스트 DB 데이터, 실제 포트폴리오 콘텐츠는 Production DB에만 있음
// pnpm db:seed:e2e로 E2E_DATABASE_URL 대상 DB에 입력하고, spec은 이 값을 기대값으로 사용
// id는 DB의 slug로 저장됨
interface FixtureExperience {
  title: string;
  problem: string;
  solution: string;
  tradeoff: { advantages: string; disadvantages: string; rationale: string };
  result: string;
  learning: string;
  links?: { label: string; url: string }[];
}

interface FixtureProject {
  id: string;
  title: string;
  period: string;
  role: string;
  techStack: string[];
  summary: string;
  link?: string;
  thumbnails?: string[];
  mobileThumbnails?: string[];
  experiences: FixtureExperience[];
}

interface FixtureTalk {
  id: string;
  title: string;
  date: string;
  venue: string;
  description: string;
  impact: string;
  link: string;
}

export const profileData = {
  name: "테스트 사용자",
  title: "Frontend Developer",
  tagline: "e2e 테스트용 소개 문구,\n두 번째 줄입니다.",
  description: "e2e 테스트용 설명입니다.",
  email: "e2e@example.com",
  github: "https://github.com/e2e-fixture",
  skills: ["React", "Vue 3", "TypeScript"],
  tools: ["Git/Github", "Jira"],
};

export const fixtureThumbnailUrl =
  "https://ci-test.public.blob.vercel-storage.com/thumbnails/globber.png";
export const fixtureThumbnailUrls = {
  desktopSecond:
    "https://ci-test.public.blob.vercel-storage.com/thumbnails/desktop-second.png",
  desktopThird:
    "https://ci-test.public.blob.vercel-storage.com/thumbnails/desktop-third.png",
  mobileFirst:
    "https://ci-test.public.blob.vercel-storage.com/thumbnails/mobile-first.png",
  mobileSecond:
    "https://ci-test.public.blob.vercel-storage.com/thumbnails/mobile-second.png",
};

// kind는 constants/resume.ts의 RESUME_KINDS 값, 수상은 period가 빈 항목
export const resumeEntries = [
  {
    kind: "work",
    period: "2025.01 - 현재",
    title: "Fixture Developer",
    subtitle: "Fixture Company",
    details: ["fixture 업무 첫째", "fixture 업무 둘째"],
  },
  {
    kind: "work",
    period: "2024.01 - 2024.12",
    title: "Fixture Intern",
    subtitle: "Fixture Company",
    details: [],
  },
  {
    kind: "education",
    period: "졸업 2024.08",
    title: "Fixture University",
    subtitle: "Fixture Major",
    details: [],
  },
  {
    kind: "activity",
    period: "2023.01 - 2023.02",
    title: "Fixture Community",
    subtitle: "",
    details: [],
  },
  {
    kind: "award",
    period: "",
    title: "Fixture Award",
    subtitle: "Fixture Org",
    details: ["fixture 수상 내역"],
  },
  {
    kind: "certification",
    period: "2024",
    title: "Fixture Certification",
    subtitle: "",
    details: [],
  },
  {
    kind: "language",
    period: "2024",
    title: "Fixture Language Test",
    subtitle: "Fixture Level",
    details: [],
  },
];

export const projects: FixtureProject[] = [
  {
    id: "fixture-alpha",
    title: "Fixture Alpha",
    period: "2025.01 ~ 현재",
    role: "프론트엔드 개발",
    techStack: ["Next.js", "TypeScript"],
    summary: "썸네일과 외부 링크가 있는 테스트 프로젝트.",
    link: "https://example.com/alpha",
    thumbnails: [
      fixtureThumbnailUrl,
      fixtureThumbnailUrls.desktopSecond,
      fixtureThumbnailUrls.desktopThird,
    ],
    mobileThumbnails: [
      fixtureThumbnailUrls.mobileFirst,
      fixtureThumbnailUrls.mobileSecond,
    ],
    experiences: [
      {
        title: "Alpha 경험 1",
        problem: "문제 설명.",
        solution: "해결 설명.",
        tradeoff: {
          advantages: "장점",
          disadvantages: "단점",
          rationale: "선택 근거",
        },
        result: "결과 설명.",
        learning: "배운 점.",
        links: [{ label: "참고 문서", url: "https://example.com/alpha-doc" }],
      },
      {
        title: "Alpha 경험 2",
        problem: "문제 설명.",
        solution: "해결 설명.",
        tradeoff: { advantages: "장점", disadvantages: "단점", rationale: "" },
        result: "결과 설명.",
        learning: "배운 점.",
      },
    ],
  },
  {
    id: "fixture-beta",
    title: "Fixture Beta",
    period: "2024.01 ~ 2024.12",
    role: "프론트엔드 개발",
    techStack: ["React"],
    summary: "썸네일과 외부 링크가 없는 테스트 프로젝트.",
    experiences: [
      {
        title: "Beta 경험 1",
        problem: "문제 설명.",
        solution: "해결 설명.",
        tradeoff: {
          advantages: "장점",
          disadvantages: "단점",
          rationale: "선택 근거",
        },
        result: "결과 설명.",
        learning: "배운 점.",
      },
    ],
  },
];

export const techTalks: FixtureTalk[] = [
  {
    id: "fixture-talk-1",
    title: "테스트 발표 1",
    date: "2025.06",
    venue: "테스트 세미나",
    description: "발표 설명.",
    impact: "발표 효과.",
    link: "https://example.com/talk-1",
  },
  {
    id: "fixture-talk-2",
    title: "테스트 발표 2",
    date: "2024.11",
    venue: "테스트 세미나",
    description: "발표 설명.",
    impact: "발표 효과.",
    link: "https://example.com/talk-2",
  },
];

interface FixturePost {
  slug: string;
  title: string;
  content: string;
  categories: string[];
  tags: string[];
  publishedAt: string;
}

export const posts: FixturePost[] = [
  {
    slug: "2025-01-02-fixture-post-1",
    title: "테스트 글 1",
    content: "# 제목\n\n본문 첫 단락.\n\n```ts\nconst a = 1;\n```\n",
    categories: ["Fixture"],
    tags: ["test"],
    publishedAt: "2025-01-02",
  },
  {
    slug: "2025-01-01-fixture-post-2",
    title: "테스트 글 2",
    content: "두 번째 글 본문.",
    categories: ["Fixture", "Other"],
    tags: [],
    publishedAt: "2025-01-01",
  },
  {
    slug: "2024-12-31-한글-주소-글",
    title: "한글 주소 글",
    content: "한글 slug 본문.",
    categories: ["Other"],
    tags: [],
    publishedAt: "2024-12-31",
  },
];
