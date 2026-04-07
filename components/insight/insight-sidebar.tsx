"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ImageIcon,
  GitCompareArrows,
  LayoutList,
  Sparkles,
} from "lucide-react";
import {
  getPlatformLinks,
  resolvePlatformModeFromRole,
} from "@/lib/platform-routes";

const navItems = [
  { href: "/insight", label: "개요", icon: Sparkles, exact: true },
  { href: "/insight/screens", label: "화면 분석", icon: ImageIcon },
  { href: "/insight/flows", label: "플로우", icon: LayoutList },
  { href: "/insight/benchmark", label: "벤치마킹", icon: GitCompareArrows },
];

export function InsightSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const mode = resolvePlatformModeFromRole(role);
  const links = getPlatformLinks(mode);
  const platformHome = links.dashboard;

  return (
    <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-56 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold text-foreground/80">인사이트</p>
        <p className="text-[11px] text-muted-foreground">UX 인사이트 랩</p>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-auto px-3 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto border-t border-border pt-4">
          <Link
            href={platformHome}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            플랫폼 홈
          </Link>
        </div>
      </div>
    </aside>
  );
}
