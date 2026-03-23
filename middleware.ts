import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/auth-error"] as const;

/**
 * /admin 하위는 NextAuth 세션이 있을 때만 접근 (로그인·에러 페이지 제외).
 * API 키·Supabase Auth 이중화 대신 기존 Credentials 로그인으로 통일합니다.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (pathname.startsWith("/admin") && !isPublic && !req.auth) {
    const login = new URL("/admin/login", req.nextUrl.origin);
    login.searchParams.set(
      "callbackUrl",
      `${pathname}${req.nextUrl.search}`
    );
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
