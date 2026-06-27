BEGIN;

CREATE TABLE IF NOT EXISTS "jockeyRaceRegistrations" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL REFERENCES "races" ("id") ON DELETE CASCADE,
  "jockeyUserId" VARCHAR(64) NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected')),
  "createdAt" TIMESTAMPTZ NOT NULL,
  "reviewedAt" TIMESTAMPTZ,
  CONSTRAINT "uq_jockey_race_registration" UNIQUE ("raceId", "jockeyUserId")
);

CREATE INDEX IF NOT EXISTS "idx_jockey_race_registrations_race_status"
  ON "jockeyRaceRegistrations" ("raceId", "status");

ALTER TABLE "horseTournamentRegistrations"
  ADD COLUMN IF NOT EXISTS "raceId" VARCHAR(64);

UPDATE "horseTournamentRegistrations" AS "registration"
SET "raceId" = "invitation"."raceId"
FROM "jockeyInvitations" AS "invitation"
WHERE "registration"."raceId" IS NULL
  AND "registration"."invitationId" = "invitation"."id"
  AND "invitation"."raceId" IS NOT NULL;

ALTER TABLE "horseTournamentRegistrations"
  ALTER COLUMN "jockeyUserId" DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS "uq_horse_tournament_registration",
  DROP CONSTRAINT IF EXISTS "uq_jockey_tournament_pairing";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_horse_race_registration"
  ON "horseTournamentRegistrations" ("raceId", "horseId")
  WHERE "raceId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_jockey_race_pairing"
  ON "horseTournamentRegistrations" ("raceId", "jockeyUserId")
  WHERE "raceId" IS NOT NULL AND "jockeyUserId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_horse_tournament_registrations_race'
  ) THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "fk_horse_tournament_registrations_race"
      FOREIGN KEY ("raceId") REFERENCES "races" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

COMMIT;
