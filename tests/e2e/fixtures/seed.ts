// e2e 테스트 DB에 fixture 데이터를 넣는 스크립트
// 실행: pnpm db:seed:e2e (.env.local의 E2E_DATABASE_URL 사용, DATABASE_URL은 읽지 않음)
// 접속 호스트명을 출력하고 y 입력을 받아야 진행하며 --yes로 확인을 생략
// 행이 하나라도 있는 테이블은 건너뛰므로 재실행해도 기존 데이터를 덮어쓰지 않음
import { createInterface } from "node:readline/promises";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  experiences,
  posts,
  profile,
  projects,
  resumeEntries,
  techTalks,
} from "../../../src/db/schema/portfolio";
import {
  profileData,
  posts as seedPosts,
  projects as seedProjects,
  resumeEntries as seedResume,
  techTalks as seedTalks,
} from "./portfolio";

async function confirm(hostname: string) {
  if (process.argv.includes("--yes")) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${hostname} 에 seed를 실행할까요? (y/N) `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

async function main() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("E2E_DATABASE_URL이 설정되지 않음");

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("E2E_DATABASE_URL 형식이 올바르지 않음");
  }
  console.log(`대상 호스트: ${hostname}`);
  if (!(await confirm(hostname))) {
    console.log("취소됨");
    return;
  }

  const db = drizzle(neon(url));
  const [[hasProfile], [hasProject], [hasTalk], [hasResume], [hasPost]] =
    await Promise.all([
      db.select({ id: profile.id }).from(profile).limit(1),
      db.select({ id: projects.id }).from(projects).limit(1),
      db.select({ id: techTalks.id }).from(techTalks).limit(1),
      db.select({ id: resumeEntries.id }).from(resumeEntries).limit(1),
      db.select({ id: posts.id }).from(posts).limit(1),
    ]);

  const statements = [];
  const summary: string[] = [];

  if (hasProfile) {
    summary.push("profile: 건너뜀(이미 존재)");
  } else {
    statements.push(db.insert(profile).values({ id: 1, ...profileData }));
    summary.push("profile: 1건");
  }

  if (hasProject) {
    summary.push("projects/experiences: 건너뜀(이미 존재)");
  } else {
    const ids = seedProjects.map(() => crypto.randomUUID());
    statements.push(
      db.insert(projects).values(
        seedProjects.map((p, i) => ({
          id: ids[i],
          slug: p.id,
          title: p.title,
          period: p.period,
          role: p.role,
          summary: p.summary,
          link: p.link ?? null,
          thumbnail: p.thumbnail ?? null,
          techStack: p.techStack,
          sortOrder: i,
        })),
      ),
    );
    const experienceRows = seedProjects.flatMap((p, i) =>
      p.experiences.map((e, j) => ({
        projectId: ids[i],
        sortOrder: j,
        title: e.title,
        problem: e.problem,
        solution: e.solution,
        result: e.result,
        learning: e.learning,
        tradeoffAdvantages: e.tradeoff.advantages,
        tradeoffDisadvantages: e.tradeoff.disadvantages,
        tradeoffRationale: e.tradeoff.rationale,
        links: e.links ?? [],
      })),
    );
    if (experienceRows.length > 0) {
      statements.push(db.insert(experiences).values(experienceRows));
    }
    summary.push(
      `projects: ${seedProjects.length}건, experiences: ${experienceRows.length}건`,
    );
  }

  if (hasTalk) {
    summary.push("tech_talks: 건너뜀(이미 존재)");
  } else {
    statements.push(
      db.insert(techTalks).values(
        seedTalks.map((t, i) => ({
          slug: t.id,
          title: t.title,
          date: t.date,
          venue: t.venue,
          description: t.description,
          impact: t.impact,
          link: t.link,
          sortOrder: i,
        })),
      ),
    );
    summary.push(`tech_talks: ${seedTalks.length}건`);
  }

  if (hasResume) {
    summary.push("resume_entries: 건너뜀(이미 존재)");
  } else {
    // sort_order는 kind별로 fixture 표기 순서대로 0부터 부여
    const counters: Record<string, number> = {};
    statements.push(
      db.insert(resumeEntries).values(
        seedResume.map((e) => {
          const sortOrder = counters[e.kind] ?? 0;
          counters[e.kind] = sortOrder + 1;
          return { ...e, sortOrder };
        }),
      ),
    );
    summary.push(`resume_entries: ${seedResume.length}건`);
  }

  if (hasPost) {
    summary.push("posts: 건너뜀(이미 존재)");
  } else {
    statements.push(db.insert(posts).values(seedPosts));
    summary.push(`posts: ${seedPosts.length}건`);
  }

  if (statements.length > 0) {
    // 하나의 HTTP 트랜잭션으로 전송되어 중간 실패 시 전체 롤백
    await db.batch(
      statements as [(typeof statements)[0], ...typeof statements],
    );
  }
  console.log(summary.join("\n"));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed 실패");
  process.exit(1);
});
