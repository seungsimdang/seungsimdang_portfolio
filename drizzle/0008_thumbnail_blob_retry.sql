ALTER TABLE "retired_thumbnail_blobs" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_retired_project_thumbnails()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Project thumbnail writes require READ COMMITTED isolation'
      USING ERRCODE = 'P1003',
            CONSTRAINT = 'projects_thumbnail_retire_read_committed';
  END IF;

  PERFORM pg_advisory_xact_lock(7301005);

  IF EXISTS (
    SELECT 1
    FROM retired_thumbnail_blobs
    WHERE url = ANY(NEW.thumbnails)
  ) THEN
    RAISE EXCEPTION 'A retired thumbnail cannot be reused'
      USING ERRCODE = 'P1001',
            CONSTRAINT = 'projects_thumbnail_retired';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM retired_thumbnail_blobs
    WHERE url = ANY(NEW.mobile_thumbnails)
  ) THEN
    RAISE EXCEPTION 'A retired mobile thumbnail cannot be reused'
      USING ERRCODE = 'P1002',
            CONSTRAINT = 'projects_mobile_thumbnail_retired';
  END IF;

  RETURN NEW;
END;
$$;
