import type { Session } from "next-auth";

/**
 * 플랫폼 글로벌 네비·브레드크럼용 경로 (실제 라우트는 유지, 여기서만 조합).
 */
export type PlatformMode = "admin" | "workspace";

export const PLATFORM_TOP_NAV_HEIGHT_PX = 56;
export const PLATFORM_TOP_NAV_CLASS = "h-14";

export function getPlatformLinks(mode: PlatformMode) {
  const admin = mode === "admin";
  const base = admin ? "/admin" : "/workspace";
  return {
    dashboard: admin ? "/admin/dashboard" : "/workspace/dashboard",
    experiments: `${base}/experiments`,
    planner: `${base}/planner`,
    reportBase: `${base}/report`,
    analysis: "/insight",
    writingGuide: `${base}/guidelines`,
    writingCheck: "/",
    apiKeys: admin ? "/admin/api-keys" : null,
    /** 관리자: 팀 뷰 진입 / 팀원: 워크스페이스 허브 */
    team: admin ? "/workspace/experiments" : "/workspace/dashboard",
    settings: admin ? "/admin/settings" : "/workspace/settings",
  } as const;
}

export function resolvePlatformModeFromRole(
  role: string | undefined
): PlatformMode {
  if (role === "member" || role === "viewer") return "workspace";
  return "admin";
}

/**
 * 로그인 전 홈·인사이트·워크스페이스 URL에서는 팀 기본 경로를 쓴다.
 * (문구 검수 `/` 방문자가 상단 메뉴에서 관리자 대시보드로 잘못 이동하는 것을 막음)
 */
export function resolvePlatformModeForNav(
  session: Session | null,
  pathname: string
): PlatformMode {
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "member" || role === "viewer") return "workspace";
  if (session?.user) return "admin";

  const p = pathname;
  if (
    p === "/" ||
    p.startsWith("/workspace") ||
    p.startsWith("/insight")
  ) {
    return "workspace";
  }
  return "admin";
}
