/**
 * 로그인 요청이 Auth callback과 동일하게 파싱되는지 진단
 * 실제 값은 노출하지 않음
 */
import { NextResponse } from "next/server";

const norm = (s: string) => s.trim().replace(/\r?\n/g, "");

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, unknown> = {};

    if (contentType.includes("application/json")) {
      body = (await req.json()) as Record<string, unknown>;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(await req.text());
      body = Object.fromEntries(params) as Record<string, unknown>;
    }

    const creds = body as Record<string, unknown>;
    const inputEmail = norm(String(creds?.email ?? creds?.Email ?? "")).toLowerCase();
    const inputPassword = norm(String(creds?.password ?? creds?.Password ?? ""));

    const envEmail = norm(process.env.AUTH_ADMIN_EMAIL ?? "").toLowerCase();
    const envPassword = norm(process.env.AUTH_ADMIN_PASSWORD ?? "");

    const emailMatch = inputEmail === envEmail;
    const passwordMatch = inputPassword === envPassword;

    return NextResponse.json({
      receivedKeys: Object.keys(body),
      contentType,
      inputEmailLen: inputEmail.length,
      inputPasswordLen: inputPassword.length,
      envEmailLen: envEmail.length,
      envPasswordLen: envPassword.length,
      envEmailSet: !!envEmail,
      envPasswordSet: !!envPassword,
      emailMatch,
      passwordMatch,
      bothMatch: emailMatch && passwordMatch,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 400 }
    );
  }
}
