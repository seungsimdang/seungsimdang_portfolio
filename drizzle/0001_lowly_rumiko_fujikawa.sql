CREATE TABLE "resume_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"sort_order" integer NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"details" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resume_entries_kind_valid" CHECK ("resume_entries"."kind" in ('work','education','activity','award','certification','language'))
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "tools" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "resume_entries_order_idx" ON "resume_entries" USING btree ("kind","sort_order","created_at","id");