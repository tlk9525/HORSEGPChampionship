BEGIN;

ALTER TABLE "raceEntries"
  ADD COLUMN IF NOT EXISTS "resultOutcome" VARCHAR(32) NOT NULL DEFAULT 'finished';

ALTER TABLE "raceEntries"
  ADD COLUMN IF NOT EXISTS "incidentReason" TEXT;

ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "ratingMin" NUMERIC(6, 2) NOT NULL DEFAULT 0;
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "ratingMax" NUMERIC(6, 2) NOT NULL DEFAULT 140;
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "handicapMin" NUMERIC(6, 2) NOT NULL DEFAULT 110;
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "handicapMax" NUMERIC(6, 2) NOT NULL DEFAULT 135;
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "totalPrize" NUMERIC(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "ownerConfirmed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "jockeyConfirmed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "resultStatus" VARCHAR(32) NOT NULL DEFAULT 'draft';
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "awardsPublished" BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO "tournaments" (
  "id", "name", "status", "startDate", "finalDate", "location", "prizePool", "createdAt", "updatedAt"
) VALUES (
  't_nonfinish_demo',
  'Non-Finish Outcome Demo',
  'active',
  CURRENT_DATE - 1,
  CURRENT_DATE + 7,
  'Demo Track',
  50000,
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();

INSERT INTO "races" (
  "id", "tournamentId", "raceNumber", "name", "raceDate", "raceTime", "venue",
  "distance", "surface", "raceClass", "ratingMin", "ratingMax", "handicapMin", "handicapMax",
  "totalPrize", "status", "participants", "ownerConfirmed", "jockeyConfirmed",
  "registrationOpensAt", "registrationClosesAt", "resultStatus", "awardsPublished",
  "createdBy", "createdAt", "updatedAt"
) VALUES (
  'r_nonfinish_demo',
  't_nonfinish_demo',
  'DNF-TEST',
  'DNF / Fall / Injury Test Race',
  CURRENT_DATE,
  '15:30',
  'Demo Track',
  '1200m',
  'Turf',
  'Open',
  0,
  140,
  110,
  135,
  50000,
  'finished',
  5,
  5,
  5,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day',
  'draft',
  FALSE,
  'u_admin',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "status" = 'finished',
  "resultStatus" = 'draft',
  "awardsPublished" = FALSE,
  "updatedAt" = NOW();

INSERT INTO "raceRefereeAssignments" (
  "id", "raceId", "refereeUserId", "assignedBy", "status", "assignedAt"
) VALUES (
  'rra_nonfinish_demo_ref1',
  'r_nonfinish_demo',
  'u_referee_1',
  'u_admin',
  'assigned',
  NOW()
)
ON CONFLICT ("raceId", "refereeUserId") DO UPDATE SET
  "status" = 'assigned',
  "assignedAt" = NOW();

DELETE FROM "raceEntries" WHERE "raceId" = 'r_nonfinish_demo';

INSERT INTO "raceEntries" (
  "id", "raceId", "horseId", "jockeyUserId", "status", "lane", "handicap",
  "ratingSnapshot", "ratingChange", "postRaceRating", "ownerConfirmed", "jockeyConfirmed",
  "preRaceStatus", "disqualified", "resultStatus", "resultOutcome", "position", "finishTime",
  "notes", "incidentReason", "violationNotes", "createdAt"
) VALUES
  (
    're_nonfinish_demo_1', 'r_nonfinish_demo', 'h_001', 'u_jockey_1', 'approved', 1, 118,
    60, 0, 0, TRUE, TRUE, 'ready', FALSE, 'draft', 'finished', 1, '01:12.340',
    'Finished normally.', '', '', NOW()
  ),
  (
    're_nonfinish_demo_2', 'r_nonfinish_demo', 'h_002', 'u_jockey_2', 'approved', 2, 119,
    61, 0, 0, TRUE, TRUE, 'ready', FALSE, 'draft', 'finished', 2, '01:13.010',
    'Finished normally.', '', '', NOW()
  ),
  (
    're_nonfinish_demo_3', 'r_nonfinish_demo', 'h_003', 'u_jockey_3', 'approved', 3, 120,
    62, 0, 0, TRUE, TRUE, 'ready', TRUE, 'dnf', 'dnf', NULL, '',
    'Did not finish.', 'DNF at final turn after losing momentum.', '', NOW()
  ),
  (
    're_nonfinish_demo_4', 'r_nonfinish_demo', 'h_004', 'u_jockey_4', 'approved', 4, 121,
    63, 0, 0, TRUE, TRUE, 'ready', TRUE, 'fell', 'fell', NULL, '',
    'Horse fell before finish.', 'Fell near 600m marker; medical review required.', '', NOW()
  ),
  (
    're_nonfinish_demo_5', 'r_nonfinish_demo', 'h_005', 'u_jockey_5', 'approved', 5, 122,
    64, 0, 0, TRUE, TRUE, 'ready', TRUE, 'injured', 'injured', NULL, '',
    'Pulled up due to injury.', 'Jockey stopped horse after visible lameness.', '', NOW()
  );

COMMIT;
