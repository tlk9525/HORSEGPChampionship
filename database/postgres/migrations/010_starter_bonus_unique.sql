-- Ensure each user can receive the spectator starter bonus at most once.
-- Older deployments used random ledger ids. Preserve those historical credits
-- and ledger rows, but reclassify duplicate grants before adding the index.

WITH ranked_bonus AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "createdAt", "id"
    ) AS duplicate_rank
  FROM "creditTransactions"
  WHERE "type" = 'starter_bonus'
)
UPDATE "creditTransactions" AS duplicate_transaction
SET
  "type" = 'admin_adjustment',
  "metadata" = COALESCE(duplicate_transaction."metadata", '{}'::JSONB)
    || jsonb_build_object(
      'source', 'legacy_duplicate_starter_bonus',
      'originalType', 'starter_bonus'
    )
FROM ranked_bonus
WHERE duplicate_transaction."id" = ranked_bonus."id"
  AND ranked_bonus.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_credit_transactions_starter_bonus_user"
  ON "creditTransactions" ("userId")
  WHERE "type" = 'starter_bonus';
