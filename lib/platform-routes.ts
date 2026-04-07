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
