-- Ensure each user can receive the spectator starter bonus at most once.
-- Fixed ledger ids use starter_bonus:{userId}; this unique index also blocks
-- legacy random-UUID duplicate starter rows going forward.

CREATE UNIQUE INDEX IF NOT EXISTS "uq_credit_transactions_starter_bonus_user"
  ON "creditTransactions" ("userId")
  WHERE "type" = 'starter_bonus';
