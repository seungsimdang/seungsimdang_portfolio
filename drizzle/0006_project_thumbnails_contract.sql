UPDATE "projects" SET "thumbnails" = ARRAY["thumbnail"] WHERE "thumbnail" IS NOT NULL AND "thumbnail" <> '' AND cardinality("thumbnails") = 0;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "thumbnail";
