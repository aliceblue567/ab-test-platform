/**
 * 인증 환경 변수 로딩 여부 확인 (디버깅용)
 * 실제 값은 노출하지 않음
 */
import { NextResponse } from "next/server";

export async function GET() {
  const emailSet = !!process.env.AUTH_ADMIN_EMAIL?.trim();
  const passwordSet = !!process.env.AUTH_ADMIN_PASSWORD?.trim();
  const secretSet = !!process.env.AUTH_SECRET?.trim();
  return NextResponse.json({
    configured: emailSet && passwordSet && secretSet,
    emailSet,
    passwordSet,
    secretSet,
  });
}
