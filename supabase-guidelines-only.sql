-- ============================================================
-- UX 라이팅 guidelines 테이블만 생성 (Supabase SQL Editor에 붙여넣기)
--
-- 1) Supabase 대시보드 → SQL Editor → New query
-- 2) 아래 전체 실행(Run)
-- 3) Vercel의 NEXT_PUBLIC_SUPABASE_URL이 이 프로젝트와 같은지 확인
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

CREATE UNIQUE INDEX IF NOT EXISTS "guidelines_rule_name_key" ON "guidelines"("rule_name");

ALTER TABLE "guidelines" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "guidelines" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guidelines_service_role_all" ON "guidelines";
CREATE POLICY "guidelines_service_role_all" ON "guidelines"
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 샘플 3건 (테이블이 비어 있을 때만)
INSERT INTO "guidelines" ("category", "rule_name", "description", "example_bad", "example_good")
SELECT * FROM (VALUES
    ('명확성', '동사로 행동 표현', '버튼·링크는 사용자가 할 일을 동사로 짧게 씁니다.', '다음', '계속하기'),
    ('톤', '죄책감 유발 금지', '오류 메시지에서 사용자를 비난하지 않습니다.', '잘못 입력하셨습니다.', '형식을 확인해 주세요.'),
    ('간결성', '불필요한 수식어 제거', '핵심 정보만 남기고 중복을 줄입니다.', '지금 바로 무료로 가입해 보세요', '무료로 가입')
) AS v(category, rule_name, description, example_bad, example_good)
WHERE NOT EXISTS (SELECT 1 FROM "guidelines" LIMIT 1);
