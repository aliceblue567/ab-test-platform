import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  verifyAdminGateToken,
  isAdminPasswordConfigured,
  getGateSecret,
  getGateCookieName,
} from "@/lib/admin-gate";

/** NextAuth 없이 접근 가능한 /admin 경로 */
const NEXTAUTH_PUBLIC = [
  "/admin/login",
  "/admin/auth-error",
  "/admin/gate",
] as const;

function matchesPublic(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 1) ADMIN_PASSWORD 설정 시: admin_gate 쿠키(서명) 필요 — /admin/gate 제외
 * 2) NextAuth: 로그인·게이트·에러 페이지 제외하고 세션 필요
 */
export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const gateSecret = getGateSecret();
    const adminPwSet = isAdminPasswordConfigured();

    if (adminPwSet && !gateSecret) {
      if (!matchesPublic(pathname, ["/admin/gate"])) {
        return NextResponse.redirect(
          new URL("/admin/gate?error=config", req.nextUrl.origin)
        );
      }
    }

    const gateConfigured = adminPwSet && Boolean(gateSecret);

    if (gateConfigured) {
      const gateExempt = matchesPublic(pathname, ["/admin/gate"]);
      if (!gateExempt) {
        const token = req.cookies.get(getGateCookieName())?.value;
        const ok = await verifyAdminGateToken(token, gateSecret!);
        if (!ok) {
          const gate = new URL("/admin/gate", req.nextUrl.origin);
          gate.searchParams.set(
            "callbackUrl",
            `${pathname}${req.nextUrl.search}`
          );
          return NextResponse.redirect(gate);
        }
      }
    }

    const nextAuthPublic = matchesPublic(pathname, NEXTAUTH_PUBLIC);
    if (!nextAuthPublic && !req.auth) {
      const login = new URL("/admin/login", req.nextUrl.origin);
      login.searchParams.set(
        "callbackUrl",
        `${pathname}${req.nextUrl.search}`
      );
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
