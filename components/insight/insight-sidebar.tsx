"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ImageIcon,
  GitCompareArrows,
  LayoutList,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/insight", label: "개요", icon: Sparkles, exact: true },
  { href: "/insight/screens", label: "화면 분석", icon: ImageIcon },
  { href: "/insight/flows", label: "플로우", icon: LayoutList },
  { href: "/insight/benchmark", label: "벤치마킹", icon: GitCompareArrows },
];

export function InsightSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-border bg-card">
      <div className="flex h-16 flex-col justify-center border-b border-border px-4">
        <Link href="/insight" className="text-lg font-semibold">
          UX 인사이트
        </Link>
        <p className="text-xs text-muted-foreground">AI 화면·플로우·비교</p>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-auto px-3 py-4">
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
            href="/admin/experiments"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            A/B·라이팅 콘솔
          </Link>
        </div>
      </div>
    </aside>
  );
}
