import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/portfolio.ts",
  out: "./drizzle",
  // knip 등 설정만 읽는 도구가 DATABASE_URL 없이도 로드하도록 빈 값 허용, 접속 시점에 drizzle-kit이 실패 처리
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
