-- Betting-only migration (safe for existing production DBs).
-- Creates wallets + bets without requiring a full schema rebuild.
-- Each existing spectator gets an individual wallet with starting credits.

CREATE TABLE IF NOT EXISTS "wallets" (
  "userId" VARCHAR(64) PRIMARY KEY,
  "credits" NUMERIC(12, 2) NOT NULL DEFAULT 100 CHECK ("credits" >= 0),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_wallets_user"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "bets" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL,
  "raceId" VARCHAR(64) NOT NULL,
  "raceEntryId" VARCHAR(64) NOT NULL,
  "amount" NUMERIC(12, 2) NOT NULL CHECK ("amount" > 0),
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK ("status" IN ('pending', 'won', 'lost', 'cancelled', 'refunded')),
  "payout" NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "settledAt" TIMESTAMPTZ,
  CONSTRAINT "fk_bets_user"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_bets_race"
    FOREIGN KEY ("raceId") REFERENCES "races" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_bets_race_entry"
    FOREIGN KEY ("raceEntryId") REFERENCES "raceEntries" ("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_bets_user" ON "bets" ("userId", "status");
CREATE INDEX IF NOT EXISTS "idx_bets_race" ON "bets" ("raceId", "status");

-- Allow re-betting the same horse after cancel; only one pending bet per entry.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_bet_user_entry_pending"
  ON "bets" ("userId", "raceEntryId")
  WHERE "status" = 'pending';

-- Drop legacy full unique constraint if an older schema created it.
ALTER TABLE "bets" DROP CONSTRAINT IF EXISTS "uq_bet_user_entry";

ALTER TABLE "bets" ADD COLUMN IF NOT EXISTS "payout" NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "bets" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMPTZ;

-- Seed a wallet for every existing spectator.
INSERT INTO "wallets" ("userId", "credits", "updatedAt")
SELECT u."id", 100, NOW()
FROM "users" u
WHERE u."role" = 'spectator'
ON CONFLICT ("userId") DO NOTHING;

-- If an older install stored credits on users, copy those balances into wallets.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'credits'
  ) THEN
    UPDATE "wallets" AS w
    SET
      "credits" = COALESCE(u."credits", w."credits"),
      "updatedAt" = NOW()
    FROM "users" AS u
    WHERE u."id" = w."userId"
      AND u."role" = 'spectator'
      AND u."credits" IS NOT NULL;
  END IF;
END $$;
