-- UX 인사이트·화면/플로우 분석 모듈 (Supabase SQL Editor에서 실행, 이미 있으면 건너뜀)
-- 기존 supabase-setup.sql과 병행 가능. 앱은 service_role로만 접근하는 것을 권장.
--
-- 분리 원칙: experiments / variants / event_logs / guidelines / api_keys / ux_writing_usage
--   등 A·B·UX 라이팅 테이블과 FOREIGN KEY로 연결하지 않는다. 통합는 앱 레이어에서만(선택).

-- Enums
DO $$ BEGIN
    CREATE TYPE "ux_product_kind" AS ENUM ('own', 'competitor');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ux_screen_source" AS ENUM ('upload', 'url_capture', 'figma');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ux_capture_job_status" AS ENUM ('queued', 'running', 'succeeded', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ux_analysis_run_status" AS ENUM ('pending', 'running', 'succeeded', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ux_insight_severity" AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ux_insight_kind" AS ENUM ('observation', 'problem', 'opportunity', 'heuristic');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 리서치/리디자인 단위
CREATE TABLE IF NOT EXISTS "ux_research_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_research_projects_pkey" PRIMARY KEY ("id")
);

-- 자사/타사 제품
CREATE TABLE IF NOT EXISTS "ux_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ux_product_kind" NOT NULL DEFAULT 'own',
    "base_url" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_products_pkey" PRIMARY KEY ("id")
);

-- 페르소나·역할 등 분석 렌즈 (같은 화면을 여러 관점에서 재분석)
CREATE TABLE IF NOT EXISTS "ux_lenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt_context" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_lenses_pkey" PRIMARY KEY ("id")
);

-- 화면 자산 (캡처/업로드/피그마 링크)
CREATE TABLE IF NOT EXISTS "ux_screens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source" "ux_screen_source" NOT NULL DEFAULT 'upload',
    "storage_path" TEXT,
    "source_url" TEXT,
    "figma_url" TEXT,
    "viewport_width" INTEGER,
    "viewport_height" INTEGER,
    "captured_at" TIMESTAMP(3),
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_screens_pkey" PRIMARY KEY ("id")
);

-- URL 캡처 작업 (Playwright 등 비동기 파이프라인)
CREATE TABLE IF NOT EXISTS "ux_capture_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "screen_id" UUID,
    "product_id" UUID NOT NULL,
    "requested_url" TEXT NOT NULL,
    "full_page" BOOLEAN NOT NULL DEFAULT true,
    "viewport_width" INTEGER NOT NULL DEFAULT 1280,
    "viewport_height" INTEGER NOT NULL DEFAULT 800,
    "cookie_snapshot_ref" TEXT,
    "status" "ux_capture_job_status" NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_capture_jobs_pkey" PRIMARY KEY ("id")
);

-- 플로우 (타사 비교·자사 여정 공통)
CREATE TABLE IF NOT EXISTS "ux_flows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_flows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ux_flow_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "flow_id" UUID NOT NULL,
    "step_index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "screen_id" UUID,
    "notes" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_flow_steps_pkey" PRIMARY KEY ("id")
);

-- 두 플로우 스텝 대 스텝 비교 세션
CREATE TABLE IF NOT EXISTS "ux_flow_comparisons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "flow_a_id" UUID NOT NULL,
    "flow_b_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_flow_comparisons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ux_comparison_step_pairs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "comparison_id" UUID NOT NULL,
    "pair_index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "flow_step_a_id" UUID,
    "flow_step_b_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_comparison_step_pairs_pkey" PRIMARY KEY ("id")
);

-- 분석 실행 (모델·프롬프트 버전·원본 JSON 보관)
CREATE TABLE IF NOT EXISTS "ux_analysis_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "lens_id" UUID,
    "model" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL DEFAULT 'v1',
    "status" "ux_analysis_run_status" NOT NULL DEFAULT 'pending',
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "input_refs" JSONB NOT NULL DEFAULT '{}',
    "result_raw" JSONB,
    "token_usage" JSONB,
    "error_message" TEXT,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_analysis_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ux_analysis_runs_target_type_check" CHECK ("target_type" IN ('screen', 'flow', 'comparison'))
);

-- 정규화된 인사이트 (UI·리포트·보내기용)
CREATE TABLE IF NOT EXISTS "ux_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "kind" "ux_insight_kind" NOT NULL DEFAULT 'problem',
    "severity" "ux_insight_severity" NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "suggestion" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "screen_id" UUID,
    "flow_step_id" UUID,
    "comparison_step_pair_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ux_insights_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "ux_products_project_id_idx" ON "ux_products"("project_id");
CREATE INDEX IF NOT EXISTS "ux_lenses_project_id_idx" ON "ux_lenses"("project_id");
CREATE INDEX IF NOT EXISTS "ux_screens_product_id_idx" ON "ux_screens"("product_id");
CREATE INDEX IF NOT EXISTS "ux_capture_jobs_product_id_idx" ON "ux_capture_jobs"("product_id");
CREATE INDEX IF NOT EXISTS "ux_capture_jobs_status_idx" ON "ux_capture_jobs"("status");
CREATE INDEX IF NOT EXISTS "ux_flows_product_id_idx" ON "ux_flows"("product_id");
CREATE INDEX IF NOT EXISTS "ux_flow_steps_flow_id_idx" ON "ux_flow_steps"("flow_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ux_flow_steps_flow_id_step_index_key" ON "ux_flow_steps"("flow_id", "step_index");
CREATE INDEX IF NOT EXISTS "ux_flow_comparisons_project_id_idx" ON "ux_flow_comparisons"("project_id");
CREATE INDEX IF NOT EXISTS "ux_comparison_step_pairs_comparison_id_idx" ON "ux_comparison_step_pairs"("comparison_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ux_comparison_step_pairs_comparison_pair_idx" ON "ux_comparison_step_pairs"("comparison_id", "pair_index");
CREATE INDEX IF NOT EXISTS "ux_analysis_runs_project_id_idx" ON "ux_analysis_runs"("project_id");
CREATE INDEX IF NOT EXISTS "ux_analysis_runs_target_idx" ON "ux_analysis_runs"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "ux_insights_run_id_idx" ON "ux_insights"("run_id");
CREATE INDEX IF NOT EXISTS "ux_insights_screen_id_idx" ON "ux_insights"("screen_id");

-- Foreign keys
DO $$ BEGIN
    ALTER TABLE "ux_products" ADD CONSTRAINT "ux_products_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ux_research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_lenses" ADD CONSTRAINT "ux_lenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ux_research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_screens" ADD CONSTRAINT "ux_screens_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ux_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_capture_jobs" ADD CONSTRAINT "ux_capture_jobs_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "ux_screens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_capture_jobs" ADD CONSTRAINT "ux_capture_jobs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ux_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_flows" ADD CONSTRAINT "ux_flows_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ux_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_flow_steps" ADD CONSTRAINT "ux_flow_steps_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "ux_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_flow_steps" ADD CONSTRAINT "ux_flow_steps_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "ux_screens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_flow_comparisons" ADD CONSTRAINT "ux_flow_comparisons_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ux_research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_flow_comparisons" ADD CONSTRAINT "ux_flow_comparisons_flow_a_id_fkey" FOREIGN KEY ("flow_a_id") REFERENCES "ux_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_flow_comparisons" ADD CONSTRAINT "ux_flow_comparisons_flow_b_id_fkey" FOREIGN KEY ("flow_b_id") REFERENCES "ux_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_comparison_step_pairs" ADD CONSTRAINT "ux_comparison_step_pairs_comparison_id_fkey" FOREIGN KEY ("comparison_id") REFERENCES "ux_flow_comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_comparison_step_pairs" ADD CONSTRAINT "ux_comparison_step_pairs_flow_step_a_id_fkey" FOREIGN KEY ("flow_step_a_id") REFERENCES "ux_flow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_comparison_step_pairs" ADD CONSTRAINT "ux_comparison_step_pairs_flow_step_b_id_fkey" FOREIGN KEY ("flow_step_b_id") REFERENCES "ux_flow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_analysis_runs" ADD CONSTRAINT "ux_analysis_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ux_research_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_analysis_runs" ADD CONSTRAINT "ux_analysis_runs_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "ux_lenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_insights" ADD CONSTRAINT "ux_insights_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ux_analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_insights" ADD CONSTRAINT "ux_insights_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "ux_screens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_insights" ADD CONSTRAINT "ux_insights_flow_step_id_fkey" FOREIGN KEY ("flow_step_id") REFERENCES "ux_flow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ux_insights" ADD CONSTRAINT "ux_insights_comparison_step_pair_id_fkey" FOREIGN KEY ("comparison_step_pair_id") REFERENCES "ux_comparison_step_pairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- RLS: API는 service_role 권장 (기존 guidelines와 동일 패턴)
ALTER TABLE "ux_research_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_lenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_screens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_capture_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_flows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_flow_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_flow_comparisons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_comparison_step_pairs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_analysis_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ux_insights" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ux_research_projects_service_role_all" ON "ux_research_projects";
CREATE POLICY "ux_research_projects_service_role_all" ON "ux_research_projects" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_products_service_role_all" ON "ux_products";
CREATE POLICY "ux_products_service_role_all" ON "ux_products" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_lenses_service_role_all" ON "ux_lenses";
CREATE POLICY "ux_lenses_service_role_all" ON "ux_lenses" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_screens_service_role_all" ON "ux_screens";
CREATE POLICY "ux_screens_service_role_all" ON "ux_screens" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_capture_jobs_service_role_all" ON "ux_capture_jobs";
CREATE POLICY "ux_capture_jobs_service_role_all" ON "ux_capture_jobs" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_flows_service_role_all" ON "ux_flows";
CREATE POLICY "ux_flows_service_role_all" ON "ux_flows" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_flow_steps_service_role_all" ON "ux_flow_steps";
CREATE POLICY "ux_flow_steps_service_role_all" ON "ux_flow_steps" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_flow_comparisons_service_role_all" ON "ux_flow_comparisons";
CREATE POLICY "ux_flow_comparisons_service_role_all" ON "ux_flow_comparisons" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_comparison_step_pairs_service_role_all" ON "ux_comparison_step_pairs";
CREATE POLICY "ux_comparison_step_pairs_service_role_all" ON "ux_comparison_step_pairs" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_analysis_runs_service_role_all" ON "ux_analysis_runs";
CREATE POLICY "ux_analysis_runs_service_role_all" ON "ux_analysis_runs" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "ux_insights_service_role_all" ON "ux_insights";
CREATE POLICY "ux_insights_service_role_all" ON "ux_insights" FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
