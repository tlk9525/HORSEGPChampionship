-- Horse Racing Tournament Website - PostgreSQL schema
-- Run:
--   npm run db:init

DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "raceEntries";
DROP TABLE IF EXISTS "jockeyInvitations";
DROP TABLE IF EXISTS "jockeyTournamentRegistrations";
DROP TABLE IF EXISTS "jockeyProfiles";
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
  "status" VARCHAR(32) NOT NULL DEFAULT 'active' CHECK ("status" IN ('pending', 'active', 'approved', 'rejected', 'suspended', 'locked'))
);

CREATE TABLE "tournaments" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "status" VARCHAR(64) NOT NULL,
  "registrationWindow" VARCHAR(128),
  "startDate" VARCHAR(64),
  "finalDate" VARCHAR(64),
  "location" VARCHAR(255),
  "prizePool" NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE "horses" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "breed" VARCHAR(128),
  "species" VARCHAR(128),
  "age" INTEGER CHECK ("age" IS NULL OR "age" > 0),
  "sex" VARCHAR(64),
  "color" VARCHAR(128),
  "weightKg" NUMERIC(7, 2) NOT NULL DEFAULT 0,
  "heightCm" NUMERIC(7, 2) NOT NULL DEFAULT 0,
  "baseHandicap" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "healthStatus" VARCHAR(128),
  "profileNotes" TEXT,
  "ownerUserId" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('draft', 'pending', 'approved', 'rejected', 'retired')),
  "selectedJockeyUserId" VARCHAR(64),
  "jockeyConfirmation" VARCHAR(64) NOT NULL DEFAULT 'waiting-owner',
  "veterinaryCertificateUrl" TEXT,
  "createdAt" VARCHAR(64)
);

CREATE INDEX "idx_horses_owner" ON "horses" ("ownerUserId");
CREATE INDEX "idx_horses_status" ON "horses" ("status");

CREATE TABLE "races" (
  "id" VARCHAR(64) PRIMARY KEY,
  "tournamentId" VARCHAR(64),
  "raceNumber" VARCHAR(64),
  "name" VARCHAR(255) NOT NULL,
  "round" VARCHAR(64),
  "date" VARCHAR(64) NOT NULL,
  "time" VARCHAR(32) NOT NULL,
  "venue" VARCHAR(255) NOT NULL,
  "distance" VARCHAR(64),
  "surface" VARCHAR(64),
  "raceClass" VARCHAR(128),
  "handicapMin" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "handicapMax" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "totalPrize" NUMERIC(14, 2) NOT NULL DEFAULT 0,
  "refereeUserId" VARCHAR(64),
  "refereeUserIds" TEXT,
  "referee" VARCHAR(255),
  "status" VARCHAR(64) NOT NULL DEFAULT 'draft',
  "participants" INTEGER NOT NULL DEFAULT 0,
  "ownerConfirmed" INTEGER NOT NULL DEFAULT 0,
  "jockeyConfirmed" INTEGER NOT NULL DEFAULT 0,
  "registrationPeriodMinutes" INTEGER NOT NULL DEFAULT 10,
  "registrationOpensAt" VARCHAR(64),
  "registrationClosesAt" VARCHAR(64),
  "resultStatus" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "awardsPublished" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdBy" VARCHAR(64),
  "createdAt" VARCHAR(64)
);

CREATE INDEX "idx_races_tournament" ON "races" ("tournamentId", "status");

CREATE TABLE "jockeyProfiles" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL UNIQUE,
  "bio" TEXT,
  "certificate" TEXT,
  "competitionLevel" VARCHAR(128),
  "weight" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "status" VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'pending', 'published', 'rejected', 'archived')),
  "updatedAt" VARCHAR(64)
);

CREATE TABLE "jockeyTournamentRegistrations" (
  "id" VARCHAR(64) PRIMARY KEY,
  "tournamentId" VARCHAR(64) NOT NULL,
  "jockeyUserId" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected')),
  "createdAt" VARCHAR(64) NOT NULL,
  "reviewedAt" VARCHAR(64),
  CONSTRAINT "uq_jockey_tournament_registration" UNIQUE ("tournamentId", "jockeyUserId")
);

CREATE INDEX "idx_jockey_tournament_registrations_tournament"
  ON "jockeyTournamentRegistrations" ("tournamentId", "status");

CREATE TABLE "jockeyInvitations" (
  "id" VARCHAR(64) PRIMARY KEY,
  "horseId" VARCHAR(64) NOT NULL,
  "ownerUserId" VARCHAR(64) NOT NULL,
  "jockeyUserId" VARCHAR(64) NOT NULL,
  "tournamentId" VARCHAR(64),
  "raceId" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'accepted', 'rejected', 'cancelled')),
  "adminStatus" VARCHAR(32),
  "createdAt" VARCHAR(64) NOT NULL,
  "respondedAt" VARCHAR(64)
);

CREATE INDEX "idx_jockey_invitations_jockey"
  ON "jockeyInvitations" ("jockeyUserId", "status");

CREATE TABLE "raceEntries" (
  "id" VARCHAR(64) PRIMARY KEY,
  "raceId" VARCHAR(64) NOT NULL,
  "horseId" VARCHAR(64) NOT NULL,
  "jockeyUserId" VARCHAR(64) NOT NULL,
  "invitationId" VARCHAR(64),
  "status" VARCHAR(32) NOT NULL DEFAULT 'approved',
  "lane" INTEGER,
  "handicap" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "ownerConfirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "jockeyConfirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "preRaceStatus" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "disqualified" BOOLEAN NOT NULL DEFAULT FALSE,
  "resultStatus" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "position" INTEGER,
  "finishTime" VARCHAR(64),
  "notes" TEXT,
  "violationNotes" TEXT,
  "createdAt" VARCHAR(64)
);

CREATE INDEX "idx_race_entries_race" ON "raceEntries" ("raceId");

CREATE TABLE "notifications" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" VARCHAR(64) NOT NULL
);

CREATE INDEX "idx_notifications_user"
  ON "notifications" ("userId", "isRead", "createdAt");

CREATE TABLE "sessions" (
  "token" VARCHAR(128) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL,
  "createdAt" VARCHAR(64) NOT NULL
);
