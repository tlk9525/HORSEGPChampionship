ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "authProvider" VARCHAR(32) NOT NULL DEFAULT 'password',
  ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

UPDATE "users"
SET "authProvider" = 'password'
WHERE "authProvider" IS NULL;
