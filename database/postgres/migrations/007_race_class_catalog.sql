-- Centralized, editable race-class catalog.
-- Races keep a snapshot of these values when they are created so historical
-- eligibility and assigned-weight rules do not change after catalog edits.

CREATE TABLE IF NOT EXISTS "raceClasses" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(128) NOT NULL,
  "ratingMin" NUMERIC(6, 2) NOT NULL,
  "ratingMax" NUMERIC(6, 2) NOT NULL,
  "handicapMin" NUMERIC(6, 2) NOT NULL,
  "handicapMax" NUMERIC(6, 2) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" VARCHAR(64),
  CONSTRAINT "chk_race_classes_rating"
    CHECK ("ratingMin" >= 0 AND "ratingMax" <= 140 AND "ratingMin" <= "ratingMax"),
  CONSTRAINT "chk_race_classes_weight"
    CHECK ("handicapMin" >= 110 AND "handicapMax" <= 135 AND "handicapMin" <= "handicapMax")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_race_classes_name_ci"
  ON "raceClasses" (LOWER("name"));

INSERT INTO "raceClasses" (
  "id", "name", "ratingMin", "ratingMax", "handicapMin", "handicapMax", "sortOrder"
) VALUES
  ('race_class_1', 'Class 1', 101, 140, 115, 135, 10),
  ('race_class_2', 'Class 2', 81, 100, 115, 135, 20),
  ('race_class_3', 'Class 3', 61, 80, 113, 133, 30),
  ('race_class_4', 'Class 4', 41, 60, 112, 132, 40),
  ('race_class_5', 'Class 5', 0, 40, 110, 130, 50),
  ('race_class_open', 'Open', 0, 140, 110, 135, 60)
ON CONFLICT ("id") DO NOTHING;
