/**
 * 인증 환경 변수 + DB 연결 확인 (디버깅용)
 * 실제 값은 노출하지 않음
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const emailSet = !!process.env.AUTH_ADMIN_EMAIL?.trim();
  const passwordSet = !!process.env.AUTH_ADMIN_PASSWORD?.trim();
  const secretSet = !!process.env.AUTH_SECRET?.trim();
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    // DB 연결 실패
  }
  return NextResponse.json({
    configured: emailSet && passwordSet && secretSet,
    emailSet,
    passwordSet,
    secretSet,
    dbConnected,
  });
}
