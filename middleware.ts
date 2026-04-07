import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { NextResponse } from "next/server";
import {
  verifyAdminGateToken,
  isAdminPasswordConfigured,
  getGateSecret,
  getGateCookieName,
} from "@/lib/admin-gate";
import {
  getInternalGatePrefix,
  isTeamOnlyRootPath,
} from "@/lib/internal-routes";

/** 게이트·로그인 등 세션 없이 접근 가능한 경로 */
const AUTH_PUBLIC_PATHS = [
  "/admin/login",
  "/admin/signup",
  "/admin/auth-error",
  "/admin/gate",
  "/workspace/login",
] as const;

function matchesPublic(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 1) ADMIN_PASSWORD 설정 시: admin_gate 쿠키(서명) 필요 — /admin/gate 제외
 * 2) NextAuth: 로그인·게이트·에러 페이지 제외하고 세션 필요
 *
 * /admin (A/B·UX 라이팅) 과 /insight (UX 인사이트 랩) 은 별도 제품이지만 동일 보안 정책을 적용한다.
 * 루트 `/` 는 팀용(홈·UX 검수). 외부 참가자용은 `/test/:experimentKey` 만 공유한다 (matcher 비적용).
 */
const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const gatedPrefix = getInternalGatePrefix(pathname);
  const teamOnly = Boolean(gatedPrefix) || isTeamOnlyRootPath(pathname);

  if (teamOnly) {
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

    const authPublic = matchesPublic(pathname, AUTH_PUBLIC_PATHS);
    if (!authPublic && !req.auth) {
      const goWorkspace =
        pathname === "/workspace" ||
        pathname.startsWith("/workspace/") ||
        pathname === "/insight" ||
        pathname.startsWith("/insight/");
      const login = new URL(
        goWorkspace ? "/workspace/login" : "/admin/login",
        req.nextUrl.origin
      );
      login.searchParams.set(
        "callbackUrl",
        `${pathname}${req.nextUrl.search}`
      );
      return NextResponse.redirect(login);
    }

    const role = (req.auth?.user as { role?: string } | undefined)?.role;
    if (
      req.auth &&
      (role === "member" || role === "viewer") &&
      pathname.startsWith("/admin") &&
      !matchesPublic(pathname, AUTH_PUBLIC_PATHS)
    ) {
      return NextResponse.redirect(
        new URL("/workspace/dashboard", req.nextUrl.origin)
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  // `/insight` 단독 경로도 반드시 포함 (일부 matcher에서 `:path*`만으로 루트가 빠질 수 있음)
  // `/test/:path*` 는 의도적으로 제외 — 외부 A/B 참가자 전용 공개 URL
  matcher: [
    "/",
    "/admin/:path*",
    "/insight",
    "/insight/:path*",
    "/workspace",
    "/workspace/:path*",
  ],
};
