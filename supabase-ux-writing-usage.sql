-- 월간 UX 검수 횟수 카운터 (UX_WRITING_MAX_CHECKS_PER_MONTH 사용 시 필요)
-- Supabase SQL Editor에서 실행

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
