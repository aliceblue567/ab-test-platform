-- AlterEnum: add member to UserRole
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'member';

-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "InsightArtifactKind" AS ENUM ('benchmark', 'flow', 'screen');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable experiments: owner
ALTER TABLE "experiments" ADD COLUMN IF NOT EXISTS "owner_id" TEXT;
CREATE INDEX IF NOT EXISTS "experiments_owner_id_idx" ON "experiments"("owner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'experiments_owner_id_fkey'
  ) THEN
    ALTER TABLE "experiments"
      ADD CONSTRAINT "experiments_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable insight_artifacts
CREATE TABLE IF NOT EXISTS "insight_artifacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "InsightArtifactKind" NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "insight_artifacts_user_id_kind_idx" ON "insight_artifacts"("user_id", "kind");
CREATE INDEX IF NOT EXISTS "insight_artifacts_user_id_updated_at_idx" ON "insight_artifacts"("user_id", "updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'insight_artifacts_user_id_fkey'
  ) THEN
    ALTER TABLE "insight_artifacts"
      ADD CONSTRAINT "insight_artifacts_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
