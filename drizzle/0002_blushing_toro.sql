CREATE TABLE "admin_rate_limits" (
	"github_id" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	"prev_count" integer DEFAULT 0 NOT NULL
);
