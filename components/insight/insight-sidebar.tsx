"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import {
  getPlatformLinks,
  resolvePlatformModeForNav,
} from "@/lib/platform-routes";
import { getInsightLabSidebarItems } from "@/components/admin/admin-sidebar-config";
import { SidebarNavLink } from "@/components/platform/sidebar-nav-link";

function InsightSidebarLinks() {
  const items = getInsightLabSidebarItems();

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-auto px-3 py-3">
      {items.map((item) => (
        <SidebarNavLink
          key={`${item.href}-${item.label}`}
          href={item.href}
          label={item.label}
          icon={item.icon}
          clearQueryForActive={item.clearQueryForActive}
          exactPath={item.exactPath}
          inactiveWhenSearchHasKey={item.inactiveWhenSearchHasKey}
        />
      ))}
    </div>
  );
}

export function InsightSidebar() {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const mode = resolvePlatformModeForNav(session ?? null, pathname);
  const links = getPlatformLinks(mode);
  const platformHome = links.dashboard;

  return (
    <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-56 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold text-foreground/80">인사이트</p>
        <p className="text-[11px] text-muted-foreground">UX 인사이트 랩</p>
      </div>
      <Suspense
        fallback={
          <p className="px-3 py-3 text-sm text-muted-foreground">메뉴 로딩…</p>
        }
      >
        <InsightSidebarLinks />
      </Suspense>
      <div className="mt-auto border-t border-border px-3 py-3">
        <Link
          href={platformHome}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          플랫폼 홈
        </Link>
      </div>
    </aside>
  );
}
