-- Race Class Catalog is the source of truth for assigned-weight ranges.
-- Keep only structural validation here; each new race stores a snapshot of
-- the selected catalog values so historical races remain unchanged.

ALTER TABLE "raceClasses"
  DROP CONSTRAINT IF EXISTS "chk_race_classes_weight";

ALTER TABLE "raceClasses"
  ADD CONSTRAINT "chk_race_classes_weight"
  CHECK ("handicapMin" > 0 AND "handicapMin" <= "handicapMax");

ALTER TABLE "races"
  ALTER COLUMN "handicapMin" DROP DEFAULT,
  ALTER COLUMN "handicapMax" DROP DEFAULT;

ALTER TABLE "races"
  DROP CONSTRAINT IF EXISTS "chk_races_weight";

ALTER TABLE "races"
  ADD CONSTRAINT "chk_races_weight"
  CHECK ("handicapMin" > 0 AND "handicapMin" <= "handicapMax");
