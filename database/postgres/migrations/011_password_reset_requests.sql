CREATE TABLE IF NOT EXISTS "passwordResetRequests" (
  "id" VARCHAR(64) PRIMARY KEY,
  "userId" VARCHAR(64) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK ("status" IN ('pending', 'approved', 'rejected', 'completed', 'expired')),
  "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "reviewedAt" TIMESTAMPTZ,
  "reviewedBy" VARCHAR(64),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "completedAt" TIMESTAMPTZ,
  CONSTRAINT "fk_password_reset_requests_user"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_password_reset_requests_reviewer"
    FOREIGN KEY ("reviewedBy") REFERENCES "users" ("id")
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_password_reset_requests_status"
  ON "passwordResetRequests" ("status", "requestedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_password_reset_requests_pending_user"
  ON "passwordResetRequests" ("userId")
  WHERE "status" = 'pending';
