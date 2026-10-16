ALTER TABLE "projects" ADD COLUMN "thumbnails" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mobile_thumbnails" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "projects" SET "thumbnails" = ARRAY["thumbnail"] WHERE "thumbnail" IS NOT NULL AND "thumbnail" <> '';--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_thumbnails_max" CHECK (cardinality("projects"."thumbnails") <= 10 and cardinality("projects"."mobile_thumbnails") <= 10);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_mobile_requires_base" CHECK (cardinality("projects"."mobile_thumbnails") = 0 or cardinality("projects"."thumbnails") > 0);