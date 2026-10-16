import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ExperienceLink } from "@/types/portfolio";

const SLUG_PATTERN_SQL = sql.raw("'^[a-z0-9]+(-[a-z0-9]+)*$'");

// 한글 완성형(가-힣), 영문 소문자, 숫자, 하이픈 조합이며 하이픈 연속과 양끝은 금지
const POST_SLUG_PATTERN_SQL = sql.raw("'^[a-z0-9가-힣]+(-[a-z0-9가-힣]+)*$'");

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const profile = pgTable(
  "profile",
  {
    id: smallint("id").primaryKey().default(1),
    name: text("name").notNull(),
    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    email: text("email").notNull(),
    github: text("github").notNull(),
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    tools: text("tools").array().notNull().default(sql`'{}'::text[]`),
    updatedAt: updatedAt(),
  },
  (table) => [check("profile_single_row", sql`${table.id} = 1`)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    period: text("period").notNull(),
    role: text("role").notNull(),
    summary: text("summary").notNull(),
    link: text("link"),
    thumbnails: text("thumbnails").array().notNull().default(sql`'{}'::text[]`),
    mobileThumbnails: text("mobile_thumbnails")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    techStack: text("tech_stack").array().notNull().default(sql`'{}'::text[]`),
    sortOrder: integer("sort_order").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("projects_slug_format", sql`${table.slug} ~ ${SLUG_PATTERN_SQL}`),
    // 상한 10은 schemas/portfolio.schema.ts의 THUMBNAIL_LIST_MAX와 같게 유지함
    check(
      "projects_thumbnails_max",
      sql`cardinality(${table.thumbnails}) <= 10 and cardinality(${table.mobileThumbnails}) <= 10`,
    ),
    check(
      "projects_mobile_requires_base",
      sql`cardinality(${table.mobileThumbnails}) = 0 or cardinality(${table.thumbnails}) > 0`,
    ),
    index("projects_order_idx").on(table.sortOrder, table.createdAt, table.id),
  ],
);

export const experiences = pgTable(
  "experiences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    title: text("title").notNull(),
    problem: text("problem").notNull(),
    solution: text("solution").notNull(),
    result: text("result").notNull(),
    learning: text("learning").notNull(),
    tradeoffAdvantages: text("tradeoff_advantages").notNull().default(""),
    tradeoffDisadvantages: text("tradeoff_disadvantages").notNull().default(""),
    tradeoffRationale: text("tradeoff_rationale").notNull().default(""),
    links: jsonb("links")
      .$type<ExperienceLink[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("experiences_project_order_idx").on(table.projectId, table.sortOrder),
  ],
);

export const techTalks = pgTable(
  "tech_talks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    venue: text("venue").notNull(),
    description: text("description").notNull(),
    impact: text("impact").notNull(),
    link: text("link").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("tech_talks_slug_format", sql`${table.slug} ~ ${SLUG_PATTERN_SQL}`),
    index("tech_talks_order_idx").on(
      table.sortOrder,
      table.createdAt,
      table.id,
    ),
  ],
);

// githubId당 한 행을 갱신하는 슬라이딩 윈도 카운터 기록
// windowStart는 현재 버킷 시작, count는 현재 버킷 횟수, prevCount는 직전 버킷 횟수
export const adminRateLimits = pgTable("admin_rate_limits", {
  githubId: text("github_id").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
  prevCount: integer("prev_count").notNull().default(0),
});

export const resumeEntries = pgTable(
  "resume_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    sortOrder: integer("sort_order").notNull(),
    period: text("period").notNull().default(""),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    details: text("details").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // 값 목록은 constants/resume.ts의 RESUME_KINDS와 같게 유지함
    check(
      "resume_entries_kind_valid",
      sql`${table.kind} in ('work','education','activity','award','certification','language')`,
    ),
    index("resume_entries_order_idx").on(
      table.kind,
      table.sortOrder,
      table.createdAt,
      table.id,
    ),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    publishedAt: date("published_at", { mode: "string" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("posts_slug_format", sql`${table.slug} ~ ${POST_SLUG_PATTERN_SQL}`),
    check("posts_slug_length", sql`char_length(${table.slug}) <= 200`),
    index("posts_list_idx").on(table.publishedAt.desc(), table.slug.desc()),
  ],
);
