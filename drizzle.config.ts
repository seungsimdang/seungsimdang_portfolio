import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL이 설정되지 않음");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/portfolio.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
