import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const SECRET = "very-secret-password";

function run(args: string[], env: Record<string, string>) {
  const result = spawnSync("node", ["scripts/migrate.mjs", ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: "",
      CI: "",
      MIGRATE_ON_BUILD: "",
      DATABASE_URL: "",
      ...env,
    },
  });
  return { ...result, out: `${result.stdout}${result.stderr}` };
}

describe("migrate.mjs 빌드 허용 조건", () => {
  it.each([
    ["환경 신호 없음", {}],
    ["VERCEL_ENV=development", { VERCEL_ENV: "development" }],
    ["CI=false", { CI: "false" }],
  ])("--build는 %s이면 건너뛰고 0으로 종료한다", (_n, env) => {
    const r = run(["--build"], { DATABASE_URL: "not-a-url", ...env });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Skipping build migration");
  });

  it.each([
    ["VERCEL_ENV=preview", { VERCEL_ENV: "preview" }],
    ["VERCEL_ENV=production", { VERCEL_ENV: "production" }],
    ["CI=true", { CI: "true" }],
    ["MIGRATE_ON_BUILD=1", { MIGRATE_ON_BUILD: "1" }],
  ])("--build는 %s이면 실행 단계로 넘어간다", (_n, env) => {
    const r = run(["--build"], env);
    expect(r.stdout).not.toContain("Skipping");
    expect(r.status).toBe(1);
    expect(r.out).toContain("Missing required environment variable");
  });

  it("--build 없이 실행하면 환경 신호 없이도 건너뛰지 않는다", () => {
    const r = run([], {});
    expect(r.status).toBe(1);
    expect(r.out).toContain("DATABASE_URL");
  });
});

describe("migrate.mjs 잘못된 DATABASE_URL", () => {
  it("URL이 아니면 원문 없이 변수명만 알리고 1로 종료한다", () => {
    const r = run([], { DATABASE_URL: `postgres//user:${SECRET}@host` });
    expect(r.status).toBe(1);
    expect(r.out).toContain("DATABASE_URL is not a valid URL");
    expect(r.out).not.toContain(SECRET);
  });
});
