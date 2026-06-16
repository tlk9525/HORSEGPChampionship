-- Optional one-shot migration for an existing Horse Racing database.
-- Fresh installs should use database/postgres/schema.sql + seed.sql instead.

BEGIN;

DROP TABLE IF EXISTS "rolePermissions";

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "authProvider",
  DROP COLUMN IF EXISTS "googleId",
  DROP COLUMN IF EXISTS "avatarUrl";

CREATE TABLE IF NOT EXISTS "raceRefereeAssignments" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL,
  "refereeUserId" VARCHAR(64) NOT NULL,
  "assignedBy" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'assigned' CHECK ("status" IN ('assigned', 'confirmed', 'declined', 'removed')),
  "assignedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "uq_race_referee_assignment" UNIQUE ("raceId", "refereeUserId")
);

CREATE INDEX IF NOT EXISTS "idx_race_referee_assignments_race"
  ON "raceRefereeAssignments" ("raceId", "status");

CREATE INDEX IF NOT EXISTS "idx_race_referee_assignments_referee"
  ON "raceRefereeAssignments" ("refereeUserId", "status");

CREATE TABLE IF NOT EXISTS "refereeReports" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL,
  "raceEntryId" VARCHAR(64),
  "refereeUserId" VARCHAR(64) NOT NULL,
  "reportType" VARCHAR(64) NOT NULL DEFAULT 'incident',
  "description" TEXT NOT NULL,
  "violation" TEXT,
  "status" VARCHAR(32) NOT NULL DEFAULT 'submitted' CHECK ("status" IN ('draft', 'submitted', 'reviewed', 'dismissed')),
  "createdAt" TIMESTAMPTZ NOT NULL,
  "reviewedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_referee_reports_race"
  ON "refereeReports" ("raceId", "status");

CREATE INDEX IF NOT EXISTS "idx_referee_reports_referee"
  ON "refereeReports" ("refereeUserId", "status");

CREATE TABLE IF NOT EXISTS "horseTournamentRegistrations" (
  "id" VARCHAR(64) PRIMARY KEY,
  "tournamentId" VARCHAR(64) NOT NULL,
  "horseId" VARCHAR(64) NOT NULL,
  "ownerUserId" VARCHAR(64) NOT NULL,
  "jockeyUserId" VARCHAR(64) NOT NULL,
  "invitationId" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending-jockey',
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reviewedAt" TIMESTAMPTZ
);

ALTER TABLE "horseTournamentRegistrations"
  ADD COLUMN IF NOT EXISTS "invitationId" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "idx_horse_tournament_registrations_tournament"
  ON "horseTournamentRegistrations" ("tournamentId", "status");

CREATE INDEX IF NOT EXISTS "idx_horse_tournament_registrations_owner"
  ON "horseTournamentRegistrations" ("ownerUserId", "status");

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

ALTER TABLE "horses"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

ALTER TABLE "races"
  ADD COLUMN IF NOT EXISTS "raceDate" DATE,
  ADD COLUMN IF NOT EXISTS "raceTime" TIME,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "type" VARCHAR(50) NOT NULL DEFAULT 'general';

DO $$
DECLARE
  field RECORD;
BEGIN
  FOR field IN
    SELECT * FROM (VALUES
      ('users', 'createdAt'),
      ('users', 'updatedAt'),
      ('tournaments', 'createdAt'),
      ('tournaments', 'updatedAt'),
      ('horses', 'createdAt'),
      ('horses', 'updatedAt'),
      ('races', 'registrationOpensAt'),
      ('races', 'registrationClosesAt'),
      ('races', 'createdAt'),
      ('races', 'updatedAt'),
      ('raceRefereeAssignments', 'assignedAt'),
      ('jockeyProfiles', 'updatedAt'),
      ('jockeyTournamentRegistrations', 'createdAt'),
      ('jockeyTournamentRegistrations', 'reviewedAt'),
      ('jockeyInvitations', 'createdAt'),
      ('jockeyInvitations', 'respondedAt'),
      ('horseTournamentRegistrations', 'createdAt'),
      ('horseTournamentRegistrations', 'reviewedAt'),
      ('raceEntries', 'createdAt'),
      ('refereeReports', 'createdAt'),
      ('refereeReports', 'reviewedAt'),
      ('notifications', 'createdAt'),
      ('sessions', 'createdAt'),
      ('sessions', 'expiresAt')
    ) AS fields(table_name, column_name)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = field.table_name
        AND column_name = field.column_name
        AND data_type <> 'timestamp with time zone'
    ) THEN
      EXECUTE FORMAT(
        'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING NULLIF(%I::TEXT, '''')::TIMESTAMPTZ',
        field.table_name,
        field.column_name,
        field.column_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  field RECORD;
BEGIN
  FOR field IN
    SELECT * FROM (VALUES
      ('tournaments', 'startDate'),
      ('tournaments', 'finalDate'),
      ('races', 'raceDate')
    ) AS fields(table_name, column_name)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = field.table_name
        AND column_name = field.column_name
        AND data_type <> 'date'
    ) THEN
      EXECUTE FORMAT(
        'ALTER TABLE %I ALTER COLUMN %I TYPE DATE USING NULLIF(REGEXP_REPLACE(%I::TEXT, ''\s+0+([0-9]+),'', '' \1,''), '''')::DATE',
        field.table_name,
        field.column_name,
        field.column_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'races'
      AND column_name = 'raceTime'
      AND data_type <> 'time without time zone'
  ) THEN
    ALTER TABLE "races"
      ALTER COLUMN "raceTime" TYPE TIME USING NULLIF("raceTime"::TEXT, '')::TIME;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'races'
      AND column_name = 'date'
  ) THEN
    UPDATE "races"
    SET "raceDate" = COALESCE(
      "raceDate",
      NULLIF(REGEXP_REPLACE("date"::TEXT, '\s+0+([0-9]+),', ' \1,'), '')::DATE
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'races'
      AND column_name = 'time'
  ) THEN
    UPDATE "races"
    SET "raceTime" = COALESCE("raceTime", NULLIF("time"::TEXT, '')::TIME);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "races" WHERE "raceDate" IS NULL) THEN
    ALTER TABLE "races" ALTER COLUMN "raceDate" SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "races" WHERE "raceTime" IS NULL) THEN
    ALTER TABLE "races" ALTER COLUMN "raceTime" SET NOT NULL;
  END IF;

  ALTER TABLE "races"
    DROP COLUMN IF EXISTS "date",
    DROP COLUMN IF EXISTS "time";
END $$;

DO $$
DECLARE
  referee_list_sql TEXT := '';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'races'
      AND column_name = 'refereeUserId'
  ) THEN
    referee_list_sql := 'NULLIF("races"."refereeUserId", '''')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'races'
      AND column_name = 'refereeUserIds'
  ) THEN
    IF referee_list_sql = '' THEN
      referee_list_sql := 'NULLIF("races"."refereeUserIds", '''')';
    ELSE
      referee_list_sql := 'CONCAT_WS('','', ' || referee_list_sql || ', NULLIF("races"."refereeUserIds", ''''))';
    END IF;
  END IF;

  IF referee_list_sql <> '' THEN
    EXECUTE FORMAT($sql$
      INSERT INTO "raceRefereeAssignments"
        ("id", "raceId", "refereeUserId", "assignedBy", "status", "assignedAt")
      SELECT DISTINCT
        'rra_' || MD5("races"."id" || ':' || "referees"."refereeId"),
        "races"."id",
        "referees"."refereeId",
        "races"."createdBy",
        'assigned',
        COALESCE("races"."createdAt", "races"."registrationOpensAt", NOW())
      FROM "races"
      CROSS JOIN LATERAL (
        SELECT TRIM("refereeId") AS "refereeId"
        FROM UNNEST(STRING_TO_ARRAY(COALESCE(%s, ''), ',')) AS "raw"("refereeId")
      ) AS "referees"
      WHERE "referees"."refereeId" <> ''
      ON CONFLICT ("raceId", "refereeUserId") DO NOTHING
    $sql$, referee_list_sql);
  END IF;

  ALTER TABLE "races"
    DROP CONSTRAINT IF EXISTS "fk_races_referee",
    DROP COLUMN IF EXISTS "refereeUserId",
    DROP COLUMN IF EXISTS "refereeUserIds",
    DROP COLUMN IF EXISTS "referee";
END $$;

ALTER TABLE "horses"
  DROP CONSTRAINT IF EXISTS "fk_horses_selected_jockey",
  DROP COLUMN IF EXISTS "selectedJockeyUserId";

UPDATE "users"
SET
  "createdAt" = COALESCE("createdAt", NOW()),
  "updatedAt" = COALESCE("updatedAt", "createdAt", NOW());

ALTER TABLE "users"
  ALTER COLUMN "createdAt" SET DEFAULT NOW(),
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET DEFAULT NOW(),
  ALTER COLUMN "updatedAt" SET NOT NULL;

UPDATE "tournaments"
SET
  "createdAt" = COALESCE("createdAt", NOW()),
  "updatedAt" = COALESCE("updatedAt", "createdAt", NOW());

ALTER TABLE "tournaments"
  ALTER COLUMN "createdAt" SET DEFAULT NOW(),
  ALTER COLUMN "createdAt" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET DEFAULT NOW(),
  ALTER COLUMN "updatedAt" SET NOT NULL;

UPDATE "horses"
SET "updatedAt" = COALESCE("updatedAt", "createdAt", NOW());

UPDATE "races"
SET "updatedAt" = COALESCE("updatedAt", "createdAt", NOW());

UPDATE "sessions"
SET "expiresAt" = COALESCE("expiresAt", COALESCE("createdAt", NOW()) + INTERVAL '7 days');

ALTER TABLE "sessions"
  ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_horses_owner" ON "horses" ("ownerUserId");
CREATE INDEX IF NOT EXISTS "idx_horses_status" ON "horses" ("status");
CREATE INDEX IF NOT EXISTS "idx_races_tournament" ON "races" ("tournamentId", "status");
CREATE INDEX IF NOT EXISTS "idx_jockey_tournament_registrations_tournament"
  ON "jockeyTournamentRegistrations" ("tournamentId", "status");
CREATE INDEX IF NOT EXISTS "idx_jockey_invitations_jockey"
  ON "jockeyInvitations" ("jockeyUserId", "status");
CREATE INDEX IF NOT EXISTS "idx_race_entries_race" ON "raceEntries" ("raceId");
CREATE INDEX IF NOT EXISTS "idx_notifications_user"
  ON "notifications" ("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_notifications_type"
  ON "notifications" ("type", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_horses_owner') THEN
    ALTER TABLE "horses"
      ADD CONSTRAINT "fk_horses_owner"
      FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id") NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_races_tournament') THEN
    ALTER TABLE "races"
      ADD CONSTRAINT "fk_races_tournament"
      FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_races_created_by') THEN
    ALTER TABLE "races"
      ADD CONSTRAINT "fk_races_created_by"
      FOREIGN KEY ("createdBy") REFERENCES "users" ("id")
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_race_referee_assignments_race') THEN
    ALTER TABLE "raceRefereeAssignments"
      ADD CONSTRAINT "fk_race_referee_assignments_race"
      FOREIGN KEY ("raceId") REFERENCES "races" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_race_referee_assignments_referee') THEN
    ALTER TABLE "raceRefereeAssignments"
      ADD CONSTRAINT "fk_race_referee_assignments_referee"
      FOREIGN KEY ("refereeUserId") REFERENCES "users" ("id") NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_race_referee_assignments_assigned_by') THEN
    ALTER TABLE "raceRefereeAssignments"
      ADD CONSTRAINT "fk_race_referee_assignments_assigned_by"
      FOREIGN KEY ("assignedBy") REFERENCES "users" ("id")
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jockey_profiles_user') THEN
    ALTER TABLE "jockeyProfiles"
      ADD CONSTRAINT "fk_jockey_profiles_user"
      FOREIGN KEY ("userId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jockey_tournament_registrations_tournament') THEN
    ALTER TABLE "jockeyTournamentRegistrations"
      ADD CONSTRAINT "fk_jockey_tournament_registrations_tournament"
      FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jockey_tournament_registrations_jockey') THEN
    ALTER TABLE "jockeyTournamentRegistrations"
      ADD CONSTRAINT "fk_jockey_tournament_registrations_jockey"
      FOREIGN KEY ("jockeyUserId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jockey_invitations_horse') THEN
    ALTER TABLE "jockeyInvitations"
      ADD CONSTRAINT "fk_jockey_invitations_horse"
      FOREIGN KEY ("horseId") REFERENCES "horses" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jockey_invitations_owner') THEN
    ALTER TABLE "jockeyInvitations"
      ADD CONSTRAINT "fk_jockey_invitations_owner"
      FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jockey_invitations_jockey') THEN
    ALTER TABLE "jockeyInvitations"
      ADD CONSTRAINT "fk_jockey_invitations_jockey"
      FOREIGN KEY ("jockeyUserId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jockey_invitations_tournament') THEN
    ALTER TABLE "jockeyInvitations"
      ADD CONSTRAINT "fk_jockey_invitations_tournament"
      FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_jockey_invitations_race') THEN
    ALTER TABLE "jockeyInvitations"
      ADD CONSTRAINT "fk_jockey_invitations_race"
      FOREIGN KEY ("raceId") REFERENCES "races" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_horse_tournament_registration') THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "uq_horse_tournament_registration"
      UNIQUE ("tournamentId", "horseId");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_horse_tournament_registrations_status') THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "chk_horse_tournament_registrations_status"
      CHECK ("status" IN ('pending-jockey', 'pending-admin', 'approved', 'rejected', 'cancelled')) NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_jockey_tournament_pairing') THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "uq_jockey_tournament_pairing"
      UNIQUE ("tournamentId", "jockeyUserId");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_horse_tournament_registrations_tournament') THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "fk_horse_tournament_registrations_tournament"
      FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_horse_tournament_registrations_horse') THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "fk_horse_tournament_registrations_horse"
      FOREIGN KEY ("horseId") REFERENCES "horses" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_horse_tournament_registrations_owner') THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "fk_horse_tournament_registrations_owner"
      FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_horse_tournament_registrations_jockey') THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "fk_horse_tournament_registrations_jockey"
      FOREIGN KEY ("jockeyUserId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_horse_tournament_registrations_invitation') THEN
    ALTER TABLE "horseTournamentRegistrations"
      ADD CONSTRAINT "fk_horse_tournament_registrations_invitation"
      FOREIGN KEY ("invitationId") REFERENCES "jockeyInvitations" ("id")
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_race_entries_race') THEN
    ALTER TABLE "raceEntries"
      ADD CONSTRAINT "fk_race_entries_race"
      FOREIGN KEY ("raceId") REFERENCES "races" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_race_entries_horse') THEN
    ALTER TABLE "raceEntries"
      ADD CONSTRAINT "fk_race_entries_horse"
      FOREIGN KEY ("horseId") REFERENCES "horses" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_race_entries_jockey') THEN
    ALTER TABLE "raceEntries"
      ADD CONSTRAINT "fk_race_entries_jockey"
      FOREIGN KEY ("jockeyUserId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_race_entries_invitation') THEN
    ALTER TABLE "raceEntries"
      ADD CONSTRAINT "fk_race_entries_invitation"
      FOREIGN KEY ("invitationId") REFERENCES "jockeyInvitations" ("id")
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_referee_reports_race') THEN
    ALTER TABLE "refereeReports"
      ADD CONSTRAINT "fk_referee_reports_race"
      FOREIGN KEY ("raceId") REFERENCES "races" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_referee_reports_entry') THEN
    ALTER TABLE "refereeReports"
      ADD CONSTRAINT "fk_referee_reports_entry"
      FOREIGN KEY ("raceEntryId") REFERENCES "raceEntries" ("id")
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_referee_reports_referee') THEN
    ALTER TABLE "refereeReports"
      ADD CONSTRAINT "fk_referee_reports_referee"
      FOREIGN KEY ("refereeUserId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user') THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "fk_notifications_user"
      FOREIGN KEY ("userId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sessions_user') THEN
    ALTER TABLE "sessions"
      ADD CONSTRAINT "fk_sessions_user"
      FOREIGN KEY ("userId") REFERENCES "users" ("id")
      ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT conrelid::REGCLASS::TEXT AS table_name, conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND connamespace = 'public'::REGNAMESPACE
      AND NOT convalidated
  LOOP
    EXECUTE FORMAT('ALTER TABLE %s VALIDATE CONSTRAINT %I', item.table_name, item.conname);
  END LOOP;
END $$;

COMMIT;
