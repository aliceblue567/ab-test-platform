-- 로그인 오류: "The column users.password_hash does not exist"
-- Supabase → SQL Editor 에서 한 번 실행하세요. (여러 번 실행해도 안전)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

-- 팀 member 역할 (이미 코드/마이그레이션에 포함된 경우)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'member';
