-- Credit ledger and Vietnam-time daily login streak.
-- Apply after 004_betting.sql. This migration is idempotent.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "loginStreak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastLoginRewardDate" DATE;

CREATE TABLE IF NOT EXISTS "creditTransactions" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL,
  "type" VARCHAR(32) NOT NULL CHECK (
    "type" IN (
      'starter_bonus',
      'daily_login_bonus',
      'bet_placed',
      'bet_cancelled',
      'bet_refunded',
      'bet_payout',
      'admin_adjustment'
    )
  ),
  "amount" NUMERIC(12, 2) NOT NULL,
  "balanceAfter" NUMERIC(12, 2) NOT NULL CHECK ("balanceAfter" >= 0),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_credit_transactions_user"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_credit_transactions_user_created"
  ON "creditTransactions" ("userId", "createdAt" DESC);

-- Existing wallets predate the ledger, so record their current balance as an
-- opening adjustment instead of pretending it was a new starter bonus.
INSERT INTO "creditTransactions" (
  "id", "userId", "type", "amount", "balanceAfter", "metadata", "createdAt"
)
SELECT
  'opening-' || MD5(w."userId"),
  w."userId",
  'admin_adjustment',
  w."credits",
  w."credits",
  '{"source":"migration_opening_balance"}'::JSONB,
  w."updatedAt"
FROM "wallets" w
ON CONFLICT ("id") DO NOTHING;
