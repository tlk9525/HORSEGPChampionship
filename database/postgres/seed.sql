-- PostgreSQL demo seed data
-- Run after database/postgres/schema.sql.

BEGIN;

INSERT INTO "users" ("id", "name", "email", "password", "role", "status") VALUES
  ('u_admin', 'Admin User', 'admin@race.test', 'admin123', 'admin', 'active'),
  ('u_owner', 'Sterling Stables', 'owner@race.test', 'owner123', 'owner', 'active'),
  ('u_jockey', 'Marcus Sterling', 'jockey@race.test', 'jockey123', 'jockey', 'active'),
  ('u_referee', 'Olivia Grant', 'referee@race.test', 'referee123', 'referee', 'active'),
  ('u_spectator', 'Spectator User', 'spectator@race.test', 'spectator123', 'spectator', 'active'),
  ('u_jockey_pending', 'Diego Martinez', 'diego@race.test', 'diego123', 'jockey', 'active'),
  ('u_jockey_sarah', 'Sarah Chen', 'sarah@race.test', 'sarah123', 'jockey', 'active'),
  ('u_jockey_emily', 'Emily Johnson', 'emily@race.test', 'emily123', 'jockey', 'active'),
  ('u_jockey_james', 'James O''Connor', 'james@race.test', 'james123', 'jockey', 'active');

INSERT INTO "tournaments" ("id", "name", "status", "registrationWindow", "startDate", "finalDate", "location", "prizePool") VALUES
  ('t_001', 'Summer Derby Classic', 'approvals', 'May 20 - May 31, 2026', 'June 10, 2026', 'June 30, 2026', 'Churchill Downs', 750000);

INSERT INTO "horses" ("id", "name", "breed", "species", "age", "sex", "color", "weightKg", "heightCm", "baseHandicap", "healthStatus", "profileNotes", "ownerUserId", "status", "selectedJockeyUserId", "jockeyConfirmation", "veterinaryCertificateUrl", "createdAt") VALUES
  ('h_001', 'Midnight Storm', 'Thoroughbred', 'Equus ferus caballus', 4, 'Stallion', 'Black', 485, 164, 5, 'Cleared', 'Explosive late sprint and stable turf performance.', 'u_owner', 'approved', 'u_jockey', 'confirmed', NULL, NULL),
  ('h_002', 'Racing Thunder', 'Quarter Horse', 'Equus ferus caballus', 3, 'Mare', 'Bay', 462, 158, 4, 'Cleared', 'Strong start speed, best suited for short-distance races.', 'u_owner', 'approved', 'u_jockey', 'confirmed', NULL, NULL);

INSERT INTO "races" ("id", "tournamentId", "raceNumber", "name", "round", "date", "time", "venue", "distance", "surface", "raceClass", "handicapMin", "handicapMax", "totalPrize", "refereeUserId", "refereeUserIds", "referee", "status", "participants", "ownerConfirmed", "jockeyConfirmed", "registrationPeriodMinutes", "registrationOpensAt", "registrationClosesAt", "resultStatus", "awardsPublished", "createdBy", "createdAt") VALUES
  ('r_001', 't_001', 'R1', 'Summer Derby Qualifier R1', 'Qualifier', 'June 10, 2026', '16:30', 'Churchill Downs', '1400m', 'Turf', 'Class A', 0, 5, 150000, 'u_referee', 'u_referee', 'Olivia Grant', 'awaiting-confirmations', 2, 0, 0, 10, '2026-06-10T09:00:00.000Z', '2026-06-10T09:20:00.000Z', 'draft', FALSE, 'u_admin', NULL),
  ('r_002', 't_001', 'R2', 'Summer Derby Sprint R2', 'Qualifier', 'June 12, 2026', '15:00', 'Churchill Downs', '1200m', 'Dirt', 'Class B', 2, 6, 175000, 'u_referee', 'u_referee', 'Olivia Grant', 'registration-open', 0, 0, 0, 10, '2026-06-12T07:00:00.000Z', '2026-06-12T07:10:00.000Z', 'draft', FALSE, 'u_admin', NULL),
  ('r_003', 't_001', 'R3', 'Summer Derby Semi Final R3', 'Semi Final', 'June 20, 2026', '17:00', 'Churchill Downs', '1600m', 'Turf', 'Class A', 4, 8, 200000, 'u_referee', 'u_referee', 'Olivia Grant', 'draft', 0, 0, 0, 10, '2026-06-20T09:30:00.000Z', '2026-06-20T09:40:00.000Z', 'draft', FALSE, 'u_admin', NULL),
  ('r_004', 't_001', 'R4', 'Summer Derby Final R4', 'Final', 'June 30, 2026', '18:00', 'Churchill Downs', '1800m', 'Turf', 'Championship', 5, 10, 225000, 'u_referee', 'u_referee', 'Olivia Grant', 'draft', 0, 0, 0, 10, '2026-06-30T10:00:00.000Z', '2026-06-30T10:10:00.000Z', 'draft', FALSE, 'u_admin', NULL);

INSERT INTO "jockeyProfiles" ("id", "userId", "bio", "certificate", "competitionLevel", "weight", "status", "updatedAt") VALUES
  ('jp_001', 'u_jockey', 'Experienced sprint jockey with strong turf performance.', 'Class A Racing License', 'Elite', 54, 'published', NULL),
  ('jp_002', 'u_jockey_pending', 'Fast-start jockey with strong qualifier experience.', 'Class B Racing License', 'Qualifier', 56, 'published', NULL),
  ('jp_003', 'u_jockey_sarah', 'Technical turf specialist known for clean pacing and late-race acceleration.', 'Class A Racing License', 'Elite', 53, 'published', NULL),
  ('jp_004', 'u_jockey_emily', 'Consistent race-day performer with strong handling in sprint and dirt events.', 'Class A Racing License', 'Professional', 55, 'published', NULL),
  ('jp_005', 'u_jockey_james', 'Veteran jockey with high-pressure final-round experience.', 'Class S Racing License', 'Champion', 57, 'published', NULL);


INSERT INTO "jockeyInvitations" ("id", "horseId", "ownerUserId", "jockeyUserId", "tournamentId", "raceId", "status", "adminStatus", "createdAt", "respondedAt") VALUES
  ('657f0799-0441-4d71-b346-9de61a779621', 'h_001', 'u_owner', 'u_jockey', 't_001', 'r_001', 'accepted', 'approved', '2026-05-30T06:36:52.174Z', '2026-05-30T06:37:25.068Z'),
  ('6f27d8f4-f06c-47ed-aa42-341b5558c17d', 'h_002', 'u_owner', 'u_jockey', 't_001', 'r_001', 'accepted', 'approved', '2026-05-29T13:29:07.084Z', '2026-05-29T13:29:07.168Z'),
  ('34d39d85-3976-4c41-afa5-f9275e655d0f', 'h_002', 'u_owner', 'u_jockey', NULL, NULL, 'pending', NULL, '2026-05-29T13:28:44.065Z', NULL);

INSERT INTO "raceEntries" ("id", "raceId", "horseId", "jockeyUserId", "invitationId", "status", "lane", "handicap", "ownerConfirmed", "jockeyConfirmed", "preRaceStatus", "disqualified", "resultStatus", "position", "finishTime", "notes", "violationNotes", "createdAt") VALUES
  ('42e7e863-15a1-4179-90e1-42f77c15ebe2', 'r_001', 'h_002', 'u_jockey', '6f27d8f4-f06c-47ed-aa42-341b5558c17d', 'approved', NULL, 0, FALSE, FALSE, 'pending', FALSE, 'draft', NULL, NULL, NULL, NULL, '2026-05-29T13:29:07.246Z'),
  ('fd641ffb-bb7b-4c88-9bc5-a9f66b6e5dfb', 'r_001', 'h_001', 'u_jockey', '657f0799-0441-4d71-b346-9de61a779621', 'approved', NULL, 0, FALSE, FALSE, 'pending', FALSE, 'draft', NULL, NULL, NULL, NULL, '2026-05-30T06:37:55.952Z');

INSERT INTO "notifications" ("id", "userId", "title", "message", "isRead", "createdAt") VALUES
  ('4fdc7e54-3a9b-4269-81d1-ba55b9dc1d32', 'u_jockey', 'You are approved for the race', 'Admin approved your assignment to ride Midnight Storm in Summer Derby Qualifier R1.', FALSE, '2026-05-30T06:37:55.954Z'),
  ('93c149c9-bf86-41e4-8eb7-89c64a052891', 'u_owner', 'Pairing approved for race', 'Admin approved Midnight Storm with Marcus Sterling for Summer Derby Qualifier R1.', FALSE, '2026-05-30T06:37:55.954Z'),
  ('059533b5-c2df-4c3b-9321-cfa747f6ee32', 'u_referee', 'Race assignment pending', 'You have been assigned to Summer Derby Qualifier R1. Please confirm your assignment.', FALSE, '2026-05-30T06:37:55.954Z'),
  ('eb60558c-caf7-48b3-a172-31e0994dd9a7', 'u_jockey', 'Confirm race participation', 'Please confirm riding Midnight Storm in Summer Derby Qualifier R1.', FALSE, '2026-05-30T06:37:55.954Z'),
  ('e449743e-8be3-4cba-ab98-b268a00ed52c', 'u_owner', 'Confirm race participation', 'Please confirm Midnight Storm for Summer Derby Qualifier R1.', FALSE, '2026-05-30T06:37:55.954Z'),
  ('a23449a9-13d4-4bbd-99a9-1a9f8c6c9362', 'u_admin', 'Horse-Jockey pairing needs approval', 'Sterling Stables / Midnight Storm + Marcus Sterling for Summer Derby Qualifier R1 is waiting for race assignment approval.', FALSE, '2026-05-30T06:37:25.070Z'),
  ('06f35867-df63-4a1c-aded-1978e745f3c4', 'u_owner', 'Jockey accepted request', 'Marcus Sterling accepted riding Midnight Storm for Summer Derby Qualifier R1. Waiting for Admin approval.', FALSE, '2026-05-30T06:37:25.069Z'),
  ('75a4b857-141e-4924-ab6f-737ef033c500', 'u_jockey', 'New riding request', 'Sterling Stables invited you to ride Midnight Storm.', TRUE, '2026-05-30T06:36:52.174Z'),
  ('8764a9ab-e0be-4504-87a0-df803e18813f', 'u_jockey', 'You are approved for the race', 'Admin approved your assignment to ride Racing Thunder in Summer Derby Qualifier R1.', FALSE, '2026-05-29T13:29:07.246Z'),
  ('c186735b-f62d-4bc6-8eb1-74deea3843f4', 'u_owner', 'Pairing approved for race', 'Admin approved Racing Thunder with Marcus Sterling for Summer Derby Qualifier R1.', FALSE, '2026-05-29T13:29:07.246Z'),
  ('5a4a840c-626d-4783-bc04-fa90cab172d6', 'u_admin', 'Horse-Jockey pairing needs approval', 'Sterling Stables / Racing Thunder + Marcus Sterling for Summer Derby Qualifier R1 is waiting for race assignment approval.', FALSE, '2026-05-29T13:29:07.168Z'),
  ('09308718-7b2a-4f2e-9ea8-5a5c75b10fd6', 'u_owner', 'Jockey accepted request', 'Marcus Sterling accepted riding Racing Thunder for Summer Derby Qualifier R1. Waiting for Admin approval.', FALSE, '2026-05-29T13:29:07.168Z'),
  ('24a86ba8-8982-4180-8544-56507bee27ce', 'u_jockey', 'New riding request', 'Sterling Stables invited you to ride Racing Thunder.', FALSE, '2026-05-29T13:29:07.084Z'),
  ('0d91b781-e3fc-4632-a466-628f3c742906', 'u_jockey', 'New riding request', 'Sterling Stables invited you to ride Racing Thunder.', FALSE, '2026-05-29T13:28:44.065Z'),
  ('6c736589-8c46-4431-8ca3-d8a0a99a7a76', 'u_jockey_pending', 'Jockey account approved', 'Your jockey application has been approved by Admin.', FALSE, '2026-05-29T09:50:12.731Z'),
  ('0f827d69-7d47-473e-aa0b-183af14b598e', 'u_owner', 'Horse approved', 'Racing Thunder has been approved by Admin.', TRUE, '2026-05-29T09:50:07.073Z'),
  ('n_seed_owner', 'u_owner', 'Horse registration submitted', 'Racing Thunder is waiting for admin approval.', TRUE, '2026-05-29T09:00:00.000Z');

COMMIT;
