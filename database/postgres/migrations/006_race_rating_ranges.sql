-- Add editable race rating ranges to existing databases.
-- Backfill only when a column is first introduced. Re-running this migration
-- must not overwrite snapshots created from the editable race-class catalog.

DO $$
DECLARE
  had_rating_min BOOLEAN;
  had_rating_max BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'races'
      AND column_name = 'ratingMin'
  ) INTO had_rating_min;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'races'
      AND column_name = 'ratingMax'
  ) INTO had_rating_max;

  ALTER TABLE "races"
    ADD COLUMN IF NOT EXISTS "ratingMin" NUMERIC(6, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "ratingMax" NUMERIC(6, 2) NOT NULL DEFAULT 140;

  IF NOT had_rating_min THEN
    UPDATE "races"
    SET "ratingMin" = CASE "raceClass"
      WHEN 'Class 1' THEN 101
      WHEN 'Class 2' THEN 81
      WHEN 'Class 3' THEN 61
      WHEN 'Class 4' THEN 41
      WHEN 'Class 5' THEN 0
      ELSE 0
    END;
  END IF;

  IF NOT had_rating_max THEN
    UPDATE "races"
    SET "ratingMax" = CASE "raceClass"
      WHEN 'Class 1' THEN 140
      WHEN 'Class 2' THEN 100
      WHEN 'Class 3' THEN 80
      WHEN 'Class 4' THEN 60
      WHEN 'Class 5' THEN 40
      ELSE 140
    END;
  END IF;
END $$;
