-- Per-race maximum stake (credits) for a single spectator bet.
-- NULL means no maximum (unlimited).

ALTER TABLE "races"
  ADD COLUMN IF NOT EXISTS "betLimit" NUMERIC(12, 2)
  CHECK ("betLimit" IS NULL OR "betLimit" > 0);
