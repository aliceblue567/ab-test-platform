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

-- UX Writing System: guidelines (이미 있으면 건너뜀)
CREATE TABLE IF NOT EXISTS "guidelines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "rule_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "example_bad" TEXT,
    "example_good" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guidelines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "guidelines_category_idx" ON "guidelines"("category");

-- CSV upsert·일괄 동기화: rule_name 기준 유일
CREATE UNIQUE INDEX IF NOT EXISTS "guidelines_rule_name_key" ON "guidelines"("rule_name");

-- 기존 DB: AI 분석 제외용 활성 플래그
ALTER TABLE "guidelines" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- 서비스 롤(API 라우트)로만 읽기/쓰기하는 것을 권장. anon은 비활성(또는 필요 시 읽기만 허용).
ALTER TABLE "guidelines" ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있으면 충돌할 수 있으므로 이름 고정 후 재생성
DROP POLICY IF EXISTS "guidelines_service_role_all" ON "guidelines";
CREATE POLICY "guidelines_service_role_all" ON "guidelines"
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 샘플 데이터 (선택)
INSERT INTO "guidelines" ("category", "rule_name", "description", "example_bad", "example_good")
SELECT * FROM (VALUES
    ('명확성', '동사로 행동 표현', '버튼·링크는 사용자가 할 일을 동사로 짧게 씁니다.', '다음', '계속하기'),
    ('톤', '죄책감 유발 금지', '오류 메시지에서 사용자를 비난하지 않습니다.', '잘못 입력하셨습니다.', '형식을 확인해 주세요.'),
    ('간결성', '불필요한 수식어 제거', '핵심 정보만 남기고 중복을 줄입니다.', '지금 바로 무료로 가입해 보세요', '무료로 가입')
) AS v(category, rule_name, description, example_bad, example_good)
WHERE NOT EXISTS (SELECT 1 FROM "guidelines" LIMIT 1);

-- UX Writing: 외부 클라이언트(피그마 플러그인 등)용 API 키 (원문은 저장하지 않고 해시만 보관)
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash")
);

CREATE INDEX IF NOT EXISTS "api_keys_is_active_idx" ON "api_keys"("is_active");

ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_service_role_all" ON "api_keys";
CREATE POLICY "api_keys_service_role_all" ON "api_keys"
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- UX Writing: 월간 검수 횟수 상한(UX_WRITING_MAX_CHECKS_PER_MONTH) 집계
CREATE TABLE IF NOT EXISTS "ux_writing_usage" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "month_key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ux_writing_usage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ux_writing_usage_id_singleton" CHECK ("id" = 'singleton')
);

ALTER TABLE "ux_writing_usage" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ux_writing_usage_service_role_all" ON "ux_writing_usage";
CREATE POLICY "ux_writing_usage_service_role_all" ON "ux_writing_usage"
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
