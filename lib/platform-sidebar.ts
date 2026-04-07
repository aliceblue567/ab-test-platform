import type { LucideIcon } from "lucide-react";
import type { PlatformMode } from "@/lib/platform-routes";
import { getPlatformLinks } from "@/lib/platform-routes";

/** 상단 탭(1뎁스)과 동일한 키 */
export type SidebarSectionKey =
  | "dashboard"
  | "experiments"
  | "analysis"
  | "writing"
  | "team"
  | "settings";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 외부 링크 등 */
  external?: boolean;
  /** 실험 목록 루트: URL에 필터 쿼리가 없을 때만 활성 */
  clearQueryForActive?: boolean;
  /** 하위 경로에서는 비활성 (예: /insight 랩 루트, /admin/settings 조직 설정) */
  exactPath?: boolean;
  /** 쿼리에 이 키가 있으면 비활성 (같은 path의 형제 메뉴용, 예: 벤치마킹 vs ?lens=) */
  inactiveWhenSearchHasKey?: string | string[];
};

/**
 * 현재 경로가 속한 1뎁스(상단 탭). 사이드바는 이에 맞춰 2뎁스만 표시.
 */
export function resolveActiveSidebarSection(
  pathname: string,
  mode: PlatformMode
): SidebarSectionKey {
  const L = getPlatformLinks(mode);
  const p = pathname;

  if (mode === "workspace") {
    if (p === L.settings || p.startsWith(`${L.settings}/`)) return "settings";
    if (
      p === "/insight" ||
      p.startsWith("/insight/") ||
      p.startsWith("/workspace/insight-saved")
    ) {
      return "analysis";
    }
    if (
      p === L.writingCheck ||
      p === L.writingGuide ||
      p.startsWith(`${L.writingGuide}/`) ||
      p.startsWith("/workspace/writing/")
    ) {
      return "writing";
    }
    if (
      p === L.experiments ||
      p.startsWith(`${L.experiments}/`) ||
      p === L.planner ||
      p.startsWith(`${L.planner}/`) ||
      p.startsWith(`${L.reportBase}/`)
    ) {
      return "experiments";
    }
    if (p === L.dashboard || p === "/workspace") return "dashboard";
    return "dashboard";
  }

  // admin (및 관리자로 본 /insight 등)
  if (p === "/admin/settings" || p.startsWith("/admin/settings/"))
    return "settings";
  if (p === "/admin/audit" || p.startsWith("/admin/audit/")) return "settings";

  if (
    p === "/insight" ||
    p.startsWith("/insight/") ||
    p.startsWith("/workspace/insight-saved")
  ) {
    return "analysis";
  }

  if (
    p === L.writingCheck ||
    p === L.writingGuide ||
    p.startsWith(`${L.writingGuide}/`)
  ) {
    return "writing";
  }
  if (L.apiKeys && (p === L.apiKeys || p.startsWith(`${L.apiKeys}/`))) {
    return "writing";
  }
  if (p.startsWith("/admin/writing/")) return "writing";
  if (p.startsWith("/workspace/writing/")) return "writing";

  if (p === L.experiments || p.startsWith(`${L.experiments}/`)) {
    return "experiments";
  }
  if (p === L.planner || p.startsWith(`${L.planner}/`)) return "experiments";
  if (p.startsWith(L.reportBase)) return "experiments";

  if (p.startsWith("/admin/team")) return "team";

  if (p.startsWith("/workspace/") && !p.startsWith("/workspace/login")) {
    return "team";
  }

  if (p === L.dashboard) return "dashboard";
  if (p.startsWith("/admin")) return "dashboard";

  return "dashboard";
}

export const SIDEBAR_SECTION_LABEL: Record<SidebarSectionKey, string> = {
  dashboard: "대시보드",
  experiments: "실험",
  analysis: "인사이트",
  writing: "UX 라이팅",
  team: "팀",
  settings: "설정",
};
