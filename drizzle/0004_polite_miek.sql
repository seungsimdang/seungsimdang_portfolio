DROP INDEX "posts_list_idx";--> statement-breakpoint
CREATE INDEX "posts_list_idx" ON "posts" USING btree ("published_at" DESC NULLS LAST,"slug" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN "published";