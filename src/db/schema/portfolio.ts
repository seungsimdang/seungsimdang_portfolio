import { sql } from "drizzle-orm";
import {
  check,
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
    thumbnail: text("thumbnail"),
    techStack: text("tech_stack").array().notNull().default(sql`'{}'::text[]`),
    sortOrder: integer("sort_order").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("projects_slug_format", sql`${table.slug} ~ ${SLUG_PATTERN_SQL}`),
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
