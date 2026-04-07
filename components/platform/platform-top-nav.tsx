"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  getPlatformLinks,
  resolvePlatformModeForNav,
  PLATFORM_TOP_NAV_CLASS,
  type PlatformMode,
} from "@/lib/platform-routes";
import { PlatformUserMenu } from "@/components/platform/platform-user-menu";

type TopNavArea = "admin" | "workspace" | "insight" | "home";

function useLinkMode(area: TopNavArea, pathname: string): PlatformMode {
  const { data: session } = useSession();
  if (area === "workspace") return "workspace";
  if (area === "admin") return "admin";
  return resolvePlatformModeForNav(session ?? null, pathname);
}

function navActive(
  key: string,
  pathname: string,
  links: ReturnType<typeof getPlatformLinks>,
  mode: PlatformMode
): boolean {
  if (key === "dashboard") {
    return pathname === links.dashboard;
  }
  if (key === "experiments") {
    return (
      pathname === links.experiments ||
      pathname.startsWith(`${links.experiments}/`) ||
      pathname === links.planner ||
      pathname.startsWith(`${links.planner}/`) ||
      pathname.startsWith(`${links.reportBase}/`)
    );
  }
  if (key === "analysis") {
    return (
      pathname === "/insight" ||
      pathname.startsWith("/insight/") ||
      pathname.startsWith("/workspace/insight-saved")
    );
  }
  if (key === "writing") {
    if (pathname === links.writingCheck || pathname === links.writingGuide)
      return true;
    if (links.apiKeys && pathname.startsWith(links.apiKeys)) return true;
    if (pathname.startsWith("/admin/writing/")) return true;
    if (pathname.startsWith("/workspace/writing/")) return true;
    return false;
  }
  if (key === "team") {
    if (pathname.startsWith("/workspace/login")) return false;
    if (mode === "workspace") {
      return pathname === links.team;
    }
    return (
      pathname.startsWith("/workspace/") &&
      !pathname.startsWith("/workspace/login")
    );
  }
  if (key === "settings") {
    return (
      pathname === links.settings ||
      pathname.startsWith(`${links.settings}/`)
    );
  }
  return false;
}

const TAB_DEF = [
  { key: "dashboard", label: "대시보드" },
  { key: "experiments", label: "실험" },
  { key: "analysis", label: "인사이트" },
  { key: "writing", label: "UX 라이팅" },
  { key: "team", label: "팀" },
  { key: "settings", label: "설정" },
] as const;

type TopTabKey = (typeof TAB_DEF)[number]["key"];

/** 팀원 워크스페이스는 이미 팀 뷰이므로 상단「팀」탭은 대시보드와 중복된다. */
const WORKSPACE_HIDDEN_TOP_KEYS = new Set<TopTabKey>(["team"]);

export function PlatformTopNav({ area }: { area: TopNavArea }) {
  const pathname = usePathname() ?? "";
  const mode = useLinkMode(area, pathname);
  const links = getPlatformLinks(mode);
  const tabs =
    area === "workspace"
      ? TAB_DEF.filter((tab) => !WORKSPACE_HIDDEN_TOP_KEYS.has(tab.key))
      : TAB_DEF;

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80",
        PLATFORM_TOP_NAV_CLASS
      )}
    >
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-1 px-3 sm:gap-2 sm:px-4">
        <Link
          href={links.dashboard}
          className="mr-2 flex shrink-0 flex-col justify-center leading-tight sm:mr-4"
        >
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            A/B Platform
          </span>
          <span className="hidden text-[10px] text-muted-foreground sm:block">
            내부 운영
          </span>
        </Link>
        <nav
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1"
          aria-label="플랫폼 메뉴"
        >
          {tabs.map((tab) => {
            const href =
              tab.key === "dashboard"
                ? links.dashboard
                : tab.key === "experiments"
                  ? links.experiments
                  : tab.key === "analysis"
                    ? links.analysis
                    : tab.key === "writing"
                      ? links.writingCheck
                      : tab.key === "team"
                        ? links.team
                        : links.settings;

            const active = navActive(tab.key, pathname, links, mode);

            return (
              <Link
                key={tab.key}
                href={href}
                className={cn(
                  "shrink-0 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto shrink-0 pl-2">
          <PlatformUserMenu area={area} />
        </div>
      </div>
    </header>
  );
}
