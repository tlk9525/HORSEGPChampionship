-- Horse Racing Tournament Website - PostgreSQL schema
-- Run:
--   npm run db:init

DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "raceActionLogs";
DROP TABLE IF EXISTS "refereeReports";
DROP TABLE IF EXISTS "raceEntries";
DROP TABLE IF EXISTS "horseRaceRegistrations";
DROP TABLE IF EXISTS "jockeyInvitations";
DROP TABLE IF EXISTS "jockeyRaceRegistrations";
DROP TABLE IF EXISTS "jockeyProfiles";
DROP TABLE IF EXISTS "raceRefereeAssignments";
DROP TABLE IF EXISTS "races";
DROP TABLE IF EXISTS "horses";
DROP TABLE IF EXISTS "tournaments";

DROP TABLE IF EXISTS "users";

CREATE TABLE "users" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  "role" VARCHAR(32) NOT NULL CHECK ("role" IN ('admin', 'owner', 'jockey', 'referee', 'spectator')),
  "status" VARCHAR(32) NOT NULL DEFAULT 'active' CHECK ("status" IN ('pending', 'active', 'approved', 'rejected', 'suspended', 'locked')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "tournaments" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "status" VARCHAR(64) NOT NULL,
  "startDate" DATE,
  "finalDate" DATE,
  "location" VARCHAR(255),
  "prizePool" NUMERIC(14, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "horses" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "breed" VARCHAR(128),
  "species" VARCHAR(128),
  "age" INTEGER CHECK ("age" IS NULL OR "age" > 0),
  "sex" VARCHAR(64),
  "color" VARCHAR(128),
  "weightLb" NUMERIC(7, 2) NOT NULL DEFAULT 0,
  "heightCm" NUMERIC(7, 2) NOT NULL DEFAULT 0,
  "baseHandicap" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "speedRating" NUMERIC(6, 2) NOT NULL DEFAULT 75,
  "staminaRating" NUMERIC(6, 2) NOT NULL DEFAULT 75,
  "formRating" NUMERIC(6, 2) NOT NULL DEFAULT 75,
  "healthRating" NUMERIC(6, 2) NOT NULL DEFAULT 75,
  "overallRating" NUMERIC(6, 2) NOT NULL DEFAULT 75,
  "healthStatus" VARCHAR(128),
  "profileNotes" TEXT,
  "ownerUserId" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('draft', 'pending', 'approved', 'rejected', 'retired')),
  "jockeyConfirmation" VARCHAR(64) NOT NULL DEFAULT 'waiting-owner',
  "veterinaryCertificateUrl" TEXT,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  CONSTRAINT "fk_horses_owner"
    FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id")
);

CREATE INDEX "idx_horses_owner" ON "horses" ("ownerUserId");
CREATE INDEX "idx_horses_status" ON "horses" ("status");

CREATE TABLE "raceClasses" (
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
    CHECK ("handicapMin" > 0 AND "handicapMin" <= "handicapMax")
);

CREATE UNIQUE INDEX "uq_race_classes_name_ci"
  ON "raceClasses" (LOWER("name"));

CREATE TABLE "races" (
  "id" VARCHAR(64) PRIMARY KEY,
  "tournamentId" VARCHAR(64) ,
  "raceNumber" VARCHAR(64),
  "name" VARCHAR(255) NOT NULL,
  "round" VARCHAR(64),
  "raceDate" DATE NOT NULL,
  "raceTime" TIME NOT NULL,
  "venue" VARCHAR(255) NOT NULL,
  "distance" VARCHAR(64),
  "surface" VARCHAR(64),
  "raceClass" VARCHAR(128),
  "ratingMin" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "ratingMax" NUMERIC(6, 2) NOT NULL DEFAULT 140,
  "handicapMin" NUMERIC(6, 2) NOT NULL,
  "handicapMax" NUMERIC(6, 2) NOT NULL,
  "totalPrize" NUMERIC(14, 2) NOT NULL DEFAULT 0,
  "betLimit" NUMERIC(12, 2) CHECK ("betLimit" IS NULL OR "betLimit" > 0),
  "status" VARCHAR(64) NOT NULL DEFAULT 'draft',
  "participants" INTEGER NOT NULL DEFAULT 0,
  "ownerConfirmed" INTEGER NOT NULL DEFAULT 0,
  "jockeyConfirmed" INTEGER NOT NULL DEFAULT 0,
  "registrationOpensAt" TIMESTAMPTZ,
  "registrationClosesAt" TIMESTAMPTZ,
  "resultStatus" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "awardsPublished" BOOLEAN NOT NULL DEFAULT FALSE,
  "replayTimeline" JSONB,
  "createdBy" VARCHAR(64),
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  CONSTRAINT "fk_races_tournament"
    FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_races_created_by"
    FOREIGN KEY ("createdBy") REFERENCES "users" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "chk_races_weight"
    CHECK ("handicapMin" > 0 AND "handicapMin" <= "handicapMax")
);

CREATE INDEX "idx_races_tournament" ON "races" ("tournamentId", "status");

CREATE TABLE "raceRefereeAssignments" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL,
  "refereeUserId" VARCHAR(64) NOT NULL,
  "assignedBy" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'assigned' CHECK ("status" IN ('assigned', 'confirmed', 'declined', 'removed')),
  "assignedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "uq_race_referee_assignment" UNIQUE ("raceId", "refereeUserId"),
  CONSTRAINT "fk_race_referee_assignments_race"
    FOREIGN KEY ("raceId") REFERENCES "races" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_race_referee_assignments_referee"
    FOREIGN KEY ("refereeUserId") REFERENCES "users" ("id"),
  CONSTRAINT "fk_race_referee_assignments_assigned_by"
    FOREIGN KEY ("assignedBy") REFERENCES "users" ("id")
    ON DELETE SET NULL
);

CREATE INDEX "idx_race_referee_assignments_race"
  ON "raceRefereeAssignments" ("raceId", "status");

CREATE INDEX "idx_race_referee_assignments_referee"
  ON "raceRefereeAssignments" ("refereeUserId", "status");

CREATE TABLE "raceActionLogs" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL,
  "userId" VARCHAR(64),
  "action" VARCHAR(64) NOT NULL,
  "fromStatus" VARCHAR(64),
  "toStatus" VARCHAR(64),
  "details" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "fk_race_action_logs_race"
    FOREIGN KEY ("raceId") REFERENCES "races" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_race_action_logs_user"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL
);

CREATE INDEX "idx_race_action_logs_race"
  ON "raceActionLogs" ("raceId", "createdAt");

CREATE TABLE "jockeyProfiles" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL UNIQUE,
  "bio" TEXT,
  "certificate" TEXT,
  "competitionLevel" VARCHAR(128),
  "weightLb" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'pending', 'published', 'rejected', 'archived')),
  "updatedAt" TIMESTAMPTZ,
  CONSTRAINT "fk_jockey_profiles_user"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE
);

CREATE TABLE "jockeyRaceRegistrations" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL,
  "jockeyUserId" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected')),
  "createdAt" TIMESTAMPTZ NOT NULL,
  "reviewedAt" TIMESTAMPTZ,
  CONSTRAINT "uq_jockey_race_registration" UNIQUE ("raceId", "jockeyUserId"),
  CONSTRAINT "fk_jockey_race_registrations_race"
    FOREIGN KEY ("raceId") REFERENCES "races" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_jockey_race_registrations_jockey"
    FOREIGN KEY ("jockeyUserId") REFERENCES "users" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_jockey_race_registrations_race_status" 
  ON "jockeyRaceRegistrations" ("raceId", "status");

CREATE TABLE "jockeyInvitations" (
  "id" VARCHAR(64) PRIMARY KEY,
  "horseId" VARCHAR(64) NOT NULL,
  "ownerUserId" VARCHAR(64) NOT NULL,
  "jockeyUserId" VARCHAR(64) NOT NULL,
  "tournamentId" VARCHAR(64),
  "raceId" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'accepted', 'rejected', 'cancelled')),
  "adminStatus" VARCHAR(32),
  "createdAt" TIMESTAMPTZ NOT NULL,
  "respondedAt" TIMESTAMPTZ,
  CONSTRAINT "fk_jockey_invitations_horse"
    FOREIGN KEY ("horseId") REFERENCES "horses" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_jockey_invitations_owner"
    FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_jockey_invitations_jockey"
    FOREIGN KEY ("jockeyUserId") REFERENCES "users" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_jockey_invitations_tournament"
    FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_jockey_invitations_race"
    FOREIGN KEY ("raceId") REFERENCES "races" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_jockey_invitations_jockey"
  ON "jockeyInvitations" ("jockeyUserId", "status");

CREATE TABLE "horseRaceRegistrations" (
  "id" VARCHAR(64) PRIMARY KEY,
  "tournamentId" VARCHAR(64) NOT NULL,
  "raceId" VARCHAR(64) NOT NULL,
  "horseId" VARCHAR(64) NOT NULL,
  "ownerUserId" VARCHAR(64) NOT NULL,
  "jockeyUserId" VARCHAR(64),
  "invitationId" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending-jockey',
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "reviewedAt" TIMESTAMPTZ,
  CONSTRAINT "uq_horse_race_registration"
    UNIQUE ("raceId", "horseId"),
  CONSTRAINT "uq_jockey_race_pairing"
    UNIQUE ("raceId", "jockeyUserId"),
  CONSTRAINT "chk_horse_race_registrations_status"
    CHECK ("status" IN ('pending-jockey', 'pending-admin', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT "fk_horse_race_registrations_tournament"
    FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_horse_race_registrations_race"
    FOREIGN KEY ("raceId") REFERENCES "races" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_horse_race_registrations_horse"
    FOREIGN KEY ("horseId") REFERENCES "horses" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_horse_race_registrations_owner"
    FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_horse_race_registrations_jockey"
    FOREIGN KEY ("jockeyUserId") REFERENCES "users" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_horse_race_registrations_invitation"
    FOREIGN KEY ("invitationId") REFERENCES "jockeyInvitations" ("id")
    ON DELETE SET NULL
);

CREATE INDEX "idx_horse_race_registrations_tournament"
  ON "horseRaceRegistrations" ("tournamentId", "status");

CREATE INDEX "idx_horse_race_registrations_owner"
  ON "horseRaceRegistrations" ("ownerUserId", "status");

CREATE TABLE "raceEntries" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL,
  "horseId" VARCHAR(64) NOT NULL,
  "jockeyUserId" VARCHAR(64) NOT NULL,
  "invitationId" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'approved',
  "lane" INTEGER,
  "handicap" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "ratingSnapshot" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "ratingChange" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "postRaceRating" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "ownerConfirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "jockeyConfirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "preRaceStatus" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "disqualified" BOOLEAN NOT NULL DEFAULT FALSE,
  "resultStatus" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "resultOutcome" VARCHAR(32) NOT NULL DEFAULT 'finished',
  "position" INTEGER,
  "finishTime" VARCHAR(64),
  "notes" TEXT,
  "incidentReason" TEXT,
  "violationNotes" TEXT,
  "createdAt" TIMESTAMPTZ,
  CONSTRAINT "fk_race_entries_race"
    FOREIGN KEY ("raceId") REFERENCES "races" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_race_entries_horse"
    FOREIGN KEY ("horseId") REFERENCES "horses" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_race_entries_jockey"
    FOREIGN KEY ("jockeyUserId") REFERENCES "users" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_race_entries_invitation"
    FOREIGN KEY ("invitationId") REFERENCES "jockeyInvitations" ("id")
    ON DELETE SET NULL
);

CREATE INDEX "idx_race_entries_race" ON "raceEntries" ("raceId");


CREATE TABLE "refereeReports" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL,
  "raceEntryId" VARCHAR(64),
  "refereeUserId" VARCHAR(64) NOT NULL,
  "reportType" VARCHAR(64) NOT NULL DEFAULT 'incident',
  "description" TEXT NOT NULL,
  "violation" TEXT,
  "status" VARCHAR(32) NOT NULL DEFAULT 'submitted' CHECK ("status" IN ('draft', 'submitted', 'reviewed', 'dismissed')),
  "createdAt" TIMESTAMPTZ NOT NULL,
  "reviewedAt" TIMESTAMPTZ,
  CONSTRAINT "fk_referee_reports_race"
    FOREIGN KEY ("raceId") REFERENCES "races" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_referee_reports_entry"
    FOREIGN KEY ("raceEntryId") REFERENCES "raceEntries" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "fk_referee_reports_referee"
    FOREIGN KEY ("refereeUserId") REFERENCES "users" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_referee_reports_race"
  ON "refereeReports" ("raceId", "status");

CREATE INDEX "idx_referee_reports_referee"
  ON "refereeReports" ("refereeUserId", "status");

CREATE TABLE "notifications" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL,
  "type" VARCHAR(50) NOT NULL DEFAULT 'general',
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "fk_notifications_user"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_notifications_user"
  ON "notifications" ("userId", "isRead", "createdAt");

CREATE INDEX "idx_notifications_type"
  ON "notifications" ("type", "createdAt");

CREATE TABLE "sessions" (
  "token" VARCHAR(128) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "fk_sessions_user"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE
);

CREATE TABLE "systemSettings" (
  "key" VARCHAR(128) PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedBy" VARCHAR(64),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_system_settings_updated_by"
    FOREIGN KEY ("updatedBy") REFERENCES "users" ("id")
    ON DELETE SET NULL
);
