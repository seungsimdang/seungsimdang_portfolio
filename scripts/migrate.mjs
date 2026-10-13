import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";

// 로컬 .env.local의 DATABASE_URL은 Production이라 빌드 시 자동 적용은 Vercel Preview·Production, CI, 로컬 e2e(MIGRATE_ON_BUILD=1)로 한정
// vercel env pull이 .env.local에 넣는 VERCEL=1, VERCEL_ENV=development로는 실행되지 않도록 VERCEL_ENV 값으로 판정
const buildMigrationAllowed =
  ["preview", "production"].includes(process.env.VERCEL_ENV ?? "") ||
  process.env.CI === "true" ||
  process.env.MIGRATE_ON_BUILD === "1";
if (process.argv.includes("--build") && !buildMigrationAllowed) {
  console.log("Skipping build migration outside Vercel/CI");
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing required environment variable: DATABASE_URL");
  process.exit(1);
}

const root = process.cwd();
const journal = JSON.parse(
  await readFile(join(root, "drizzle/meta/_journal.json"), "utf8"),
);
if (journal.dialect !== "postgresql" || !Array.isArray(journal.entries)) {
  throw new Error("Unsupported Drizzle migration journal");
}

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
let client;
try {
  client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(7301003)");
  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint NOT NULL
    )
  `);
  const { rows } = await client.query(
    "SELECT COALESCE(MAX(created_at), 0) AS created_at FROM drizzle.__drizzle_migrations",
  );
  const latest = Number(rows[0].created_at);
  const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);
  for (const entry of entries) {
    if (!/^\d{4}_[a-z0-9_]+$/.test(entry.tag) || entry.when <= latest) continue;
    const migration = await readFile(
      join(root, "drizzle", `${entry.tag}.sql`),
      "utf8",
    );
    const statements = migration
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) await client.query(statement);
    const hash = createHash("sha256").update(migration).digest("hex");
    await client.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [hash, entry.when],
    );
  }
  await client.query("COMMIT");
} catch (error) {
  if (client) await client.query("ROLLBACK").catch(() => undefined);
  console.error(
    "Database migration failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
