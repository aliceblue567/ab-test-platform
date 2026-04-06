import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  verifyAdminGateToken,
  isAdminPasswordConfigured,
  getGateSecret,
  getGateCookieName,
} from "@/lib/admin-gate";
import { getInternalGatePrefix } from "@/lib/internal-routes";

/** NextAuth 없이 접근 가능한 /admin 경로 */
const NEXTAUTH_PUBLIC = [
  "/admin/login",
  "/admin/signup",
  "/admin/auth-error",
  "/admin/gate",
] as const;

function matchesPublic(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 1) ADMIN_PASSWORD 설정 시: admin_gate 쿠키(서명) 필요 — /admin/gate 제외
 * 2) NextAuth: 로그인·게이트·에러 페이지 제외하고 세션 필요
 *
 * /admin (A/B·UX 라이팅) 과 /insight (UX 인사이트 랩) 은 별도 제품이지만 동일 보안 정책을 적용한다.
 */
export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const gatedPrefix = getInternalGatePrefix(pathname);

  if (gatedPrefix) {
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
  // `/insight` 단독 경로도 반드시 포함 (일부 matcher에서 `:path*`만으로 루트가 빠질 수 있음)
  matcher: ["/admin/:path*", "/insight", "/insight/:path*"],
};
