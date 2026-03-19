/**
 * 로그인 불일치 원인 확인 (디버깅용)
 * 실제 값은 노출하지 않음
 */
import { NextResponse } from "next/server";

const norm = (s: string) => s.trim().replace(/\r?\n/g, "");

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const envEmail = norm(process.env.AUTH_ADMIN_EMAIL ?? "").toLowerCase();
    const envPassword = norm(process.env.AUTH_ADMIN_PASSWORD ?? "");
    const inputEmail = norm(String(email ?? "")).toLowerCase();
    const inputPassword = norm(String(password ?? ""));

    const emailMatch = inputEmail === envEmail;
    const passwordMatch = inputPassword === envPassword;

    return NextResponse.json({
      ok: true,
      emailMatch,
      passwordMatch,
      bothMatch: emailMatch && passwordMatch,
    });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
