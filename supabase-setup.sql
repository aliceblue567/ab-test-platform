-- Supabase SQL Editor에서 실행 (이미 있으면 건너뜀)

-- Enum (이미 있으면 무시)
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('admin', 'viewer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ExperimentStatus" AS ENUM ('draft', 'running', 'paused', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VariantKey" AS ENUM ('control', 'variant_a', 'variant_b');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Tables (이미 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT
);

CREATE TABLE IF NOT EXISTS "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "experiments" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primary_goal_key" TEXT,
    "primary_goal_custom" TEXT,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'draft',
    "trafficAllocation" INTEGER NOT NULL DEFAULT 100,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "variants" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "key" "VariantKey" NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 50,
    "payload" JSONB NOT NULL,
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "assignments" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "variant_key" TEXT NOT NULL,
    "user_key" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "event_logs" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "variant_key" TEXT NOT NULL,
    "user_key" TEXT NOT NULL,
    "session_key" TEXT,
    "event_name" TEXT NOT NULL,
    "event_value" DOUBLE PRECISION,
    "event_props" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "report_snapshots" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "uniqueUsers" INTEGER NOT NULL,
    "totalEvents" INTEGER NOT NULL,
    "conversionRate" DOUBLE PRECISION,
    "uplift" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "winner" BOOLEAN NOT NULL DEFAULT false,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "experimentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes (이미 있으면 무시)
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX IF NOT EXISTS "experiments_key_key" ON "experiments"("key");
CREATE INDEX IF NOT EXISTS "experiments_status_key_idx" ON "experiments"("status", "key");
CREATE INDEX IF NOT EXISTS "variants_experimentId_idx" ON "variants"("experimentId");
CREATE UNIQUE INDEX IF NOT EXISTS "variants_experimentId_key_key" ON "variants"("experimentId", "key");
CREATE INDEX IF NOT EXISTS "assignments_experiment_id_idx" ON "assignments"("experiment_id");
CREATE INDEX IF NOT EXISTS "assignments_user_key_idx" ON "assignments"("user_key");
CREATE UNIQUE INDEX IF NOT EXISTS "assignments_experiment_id_user_key_key" ON "assignments"("experiment_id", "user_key");
CREATE INDEX IF NOT EXISTS "event_logs_experiment_id_variant_key_event_name_idx" ON "event_logs"("experiment_id", "variant_key", "event_name");
CREATE INDEX IF NOT EXISTS "event_logs_experiment_id_user_key_idx" ON "event_logs"("experiment_id", "user_key");
CREATE INDEX IF NOT EXISTS "event_logs_created_at_idx" ON "event_logs"("created_at");
CREATE INDEX IF NOT EXISTS "report_snapshots_experimentId_idx" ON "report_snapshots"("experimentId");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Foreign Keys (이미 있으면 무시)
DO $$ BEGIN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "variants" ADD CONSTRAINT "variants_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "assignments" ADD CONSTRAINT "assignments_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "assignments" ADD CONSTRAINT "assignments_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
