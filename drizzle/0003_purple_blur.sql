CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"published_at" date NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "posts_slug_format" CHECK ("posts"."slug" ~ '^[a-z0-9가-힣]+(-[a-z0-9가-힣]+)*$'),
	CONSTRAINT "posts_slug_length" CHECK (char_length("posts"."slug") <= 200)
);
--> statement-breakpoint
CREATE INDEX "posts_list_idx" ON "posts" USING btree ("published","published_at" DESC NULLS LAST,"slug" DESC NULLS LAST);