import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import {
  getGateCookieName,
  getGateSecret,
  signAdminGateToken,
} from "@/lib/admin-gate";

function comparePassword(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST { "password": "..." } — ADMIN_PASSWORD 와 일치 시 admin_gate 쿠키 설정
 */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  const secret = getGateSecret();

  if (!expected) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "ADMIN_PASSWORD가 설정되어 있지 않습니다. 서버 환경 변수를 확인하세요.",
      },
      { status: 503 }
    );
  }

  if (!secret) {
    return NextResponse.json(
      {
        error: "not_configured",
        message:
          "AUTH_SECRET이 필요합니다. 관리자 게이트 쿠키 서명에 사용됩니다.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "JSON 본문이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  if (!comparePassword(password, expected)) {
    return NextResponse.json(
      { error: "unauthorized", message: "비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const token = await signAdminGateToken(secret);
  const cookieStore = await cookies();
  cookieStore.set(getGateCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
