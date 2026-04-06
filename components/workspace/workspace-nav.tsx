"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  LayoutList,
  BookOpen,
  Sparkles,
  FolderOpen,
  ExternalLink,
} from "lucide-react";

const experimentItems = [
  { href: "/workspace/experiments", label: "실험 목록", icon: LayoutList },
  { href: "/workspace/planner", label: "플래너", icon: FlaskConical },
] as const;

const writingItems = [
  { href: "/workspace/guidelines", label: "UX 가이드", icon: BookOpen },
] as const;

const insightItems = [
  {
    href: "/workspace/insight-saved",
    label: "인사이트 저장함",
    icon: FolderOpen,
  },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/workspace" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

export function WorkspaceNav() {
  const pathname = usePathname();
  const insightActive = pathname === "/insight" || pathname?.startsWith("/insight/");

  return (
    <nav className="flex flex-1 flex-col gap-1">
      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        내 작업 · A/B 테스트
      </p>
      {experimentItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
      <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        UX 라이팅
      </p>
      {writingItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
      <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        인사이트
      </p>
      {insightItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
      <Link
        href="/insight"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          insightActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Sparkles className="h-5 w-5 shrink-0" />
        인사이트 Lab
        <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
      </Link>
    </nav>
  );
}
