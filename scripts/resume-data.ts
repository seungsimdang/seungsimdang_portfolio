// 이력 데이터를 DATABASE_URL 대상 DB에 입력하는 일회성 스크립트
// 실행: pnpm db:resume:seed (이력 항목), pnpm db:resume:profile (profile.skills, profile.tools 갱신)
// 접속 호스트명을 출력하고 y 입력을 받아야 진행하며 --yes로 확인을 생략
// 운영 편집 데이터를 덮어쓰지 않도록 두 서브커맨드 모두 조건부로만 쓰기를 수행
import { createInterface } from "node:readline/promises";
import { neon } from "@neondatabase/serverless";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { ResumeKind } from "../src/constants/resume";
import { profile, resumeEntries } from "../src/db/schema/portfolio";

interface SeedEntry {
  kind: ResumeKind;
  period: string;
  title: string;
  subtitle: string;
  details: string[];
}

// 이력서 표기 순서(위에서 아래)가 kind별 sort_order가 됨
const ENTRIES: SeedEntry[] = [
  {
    kind: "work",
    period: "2026.08 - 현재",
    title: "Frontend Developer",
    subtitle: "빅웨이브로보틱스",
    details: [
      "휴머노이드 로봇 공정 현황 모니터링 대시보드 개발",
      "물류 운반 로봇 관제 시스템 및 리포트 기능 개발",
    ],
  },
  {
    kind: "work",
    period: "2024.07 - 2026.07",
    title: "Frontend Developer",
    subtitle: "웨이센",
    details: [
      "테스트 자동화 도입으로 배포 프로세스 개선",
      "렌더링 성능 최적화로 초기 로딩 시간 42% 단축",
      "AI 내시경 리포트 생성 시스템 구축",
      "MCP 기술 동향 분석 및 발표",
    ],
  },
  {
    kind: "work",
    period: "2024.02 - 2024.06",
    title: "Frontend Developer (Intern)",
    subtitle: "웨이센",
    details: ["AI 호흡기건강 확인서비스 WAYMED Cough 단독 개발"],
  },
  {
    kind: "education",
    period: "졸업 2024.08",
    title: "동국대학교 학사",
    subtitle: "컴퓨터정보통신공학부 컴퓨터공학전공",
    details: [],
  },
  ...(
    [
      ["2025.12 - 현재", "디프만 코어 (Depromeet Core) 2기"],
      ["2025.08 - 현재", "디프만 (Depromeet) 17기"],
      ["2024.02 - 2024.08", "9oormthon Univ. 2기"],
      ["2023.07 - 2024.01", "패스트캠퍼스 X 야놀자 프론트엔드 부트캠프 1기"],
      ["2023.07 - 2023.08", "동국대학교 SW코딩역량강화캠프"],
      ["2023.01 - 2023.02", "42 Seoul"],
      ["2022.09 - 2022.12", "DoDream 학습동아리"],
    ] as const
  ).map(([period, title]) => ({
    kind: "activity" as const,
    period,
    title,
    subtitle: "",
    details: [],
  })),
  {
    kind: "award",
    period: "",
    title: "국민행복 서비스 발굴 · 창업 경진대회",
    subtitle: "사회보장정보원",
    details: ["장려상 (한국노인개발원장상)"],
  },
  {
    kind: "certification",
    period: "2024",
    title: "정보처리기사",
    subtitle: "",
    details: [],
  },
  {
    kind: "language",
    period: "2024",
    title: "TOEIC SPEAKING",
    subtitle: "IH(150)",
    details: [],
  },
];

// 적용 직전 운영 값과 다르면 skills는 갱신되지 않으므로 이 상수를 실제 값에 맞춤
const OLD_SKILLS = [
  "React",
  "Vue 3",
  "TypeScript",
  "Next.js",
  "TanStack Query",
  "Zustand",
  "Pinia",
  "Tailwind CSS",
  "Playwright",
];
const NEW_SKILLS = [
  "React",
  "Vue.js",
  "TypeScript",
  "Next.js",
  "Vite",
  "Tanstack Query",
  "Emotion",
  "TailwindCSS",
  "Zustand",
  "Playwright",
];
const NEW_TOOLS = ["Git/Github", "Jira", "Slack", "Notion", "Figma"];

async function confirm(hostname: string) {
  if (process.argv.includes("--yes")) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${hostname} 에 실행할까요? (y/N) `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

async function main() {
  const command = process.argv[2];
  if (command !== "seed" && command !== "profile") {
    throw new Error("서브커맨드는 seed 또는 profile 이어야 함");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL이 설정되지 않음");

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("DATABASE_URL 형식이 올바르지 않음");
  }
  console.log(`대상 호스트: ${hostname}`);
  if (!(await confirm(hostname))) {
    console.log("취소됨");
    return;
  }

  const db = drizzle(neon(url));

  if (command === "seed") {
    // admin에서 섹션을 전부 지운 뒤 재실행해도 되살리지 않도록 테이블 단위로 판정
    const [existing] = await db
      .select({ id: resumeEntries.id })
      .from(resumeEntries)
      .limit(1);
    if (existing) {
      console.log("resume_entries: 건너뜀(이미 존재)");
      return;
    }
    const counters: Partial<Record<ResumeKind, number>> = {};
    await db.insert(resumeEntries).values(
      ENTRIES.map((e) => {
        const sortOrder = counters[e.kind] ?? 0;
        counters[e.kind] = sortOrder + 1;
        return { ...e, sortOrder };
      }),
    );
    console.log(`resume_entries: ${ENTRIES.length}건`);
    return;
  }

  const skills = await db
    .update(profile)
    .set({ skills: NEW_SKILLS, updatedAt: new Date() })
    .where(and(eq(profile.id, 1), eq(profile.skills, OLD_SKILLS)))
    .returning({ id: profile.id });
  console.log(
    skills.length > 0
      ? "profile.skills: 갱신"
      : "profile.skills: 건너뜀(현재 값이 기대와 다름)",
  );
  const tools = await db
    .update(profile)
    .set({ tools: NEW_TOOLS, updatedAt: new Date() })
    .where(and(eq(profile.id, 1), sql`${profile.tools} = '{}'::text[]`))
    .returning({ id: profile.id });
  console.log(
    tools.length > 0
      ? "profile.tools: 갱신"
      : "profile.tools: 건너뜀(이미 값이 있음)",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "실행 실패");
  process.exit(1);
});
