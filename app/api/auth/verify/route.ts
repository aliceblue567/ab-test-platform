/**
 * 로그인 불일치 원인 확인 (디버깅용)
 * AUTH_DEBUG=true 일 때만 동작, 실제 값은 노출하지 않음
 */
import { NextResponse } from "next/server";

const norm = (s: string) => s.trim().replace(/\r?\n/g, "");

export async function POST(req: Request) {
  if (process.env.AUTH_DEBUG !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  try {
    const { email, password } = await req.json();
    const envEmail = norm(process.env.AUTH_ADMIN_EMAIL ?? "").toLowerCase();
    const envPassword = norm(process.env.AUTH_ADMIN_PASSWORD ?? "");
    const inputEmail = norm(String(email ?? "")).toLowerCase();
    const inputPassword = norm(String(password ?? ""));

    const emailMatch = inputEmail === envEmail;
    const passwordMatch = inputPassword === envPassword;

    return NextResponse.json({
      emailMatch,
      passwordMatch,
      bothMatch: emailMatch && passwordMatch,
    });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
