-- Add editable race rating ranges to existing databases.
-- This migration is idempotent and safe to run on production.

ALTER TABLE "races"
  ADD COLUMN IF NOT EXISTS "ratingMin" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ratingMax" NUMERIC(6, 2) NOT NULL DEFAULT 140;

-- Preserve the eligibility ranges represented by each existing race class.
UPDATE "races"
SET
  "ratingMin" = CASE "raceClass"
    WHEN 'Class 1' THEN 101
    WHEN 'Class 2' THEN 81
    WHEN 'Class 3' THEN 61
    WHEN 'Class 4' THEN 41
    WHEN 'Class 5' THEN 0
    ELSE 0
  END,
  "ratingMax" = CASE "raceClass"
    WHEN 'Class 1' THEN 140
    WHEN 'Class 2' THEN 100
    WHEN 'Class 3' THEN 80
    WHEN 'Class 4' THEN 60
    WHEN 'Class 5' THEN 40
    ELSE 140
  END;
