"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FlaskConical,
  LayoutList,
  BookOpen,
  KeyRound,
  LogIn,
  Sparkles,
} from "lucide-react";

const experimentItems = [
  { href: "/admin/experiments", label: "실험 목록", icon: LayoutList },
  { href: "/admin/planner", label: "플래너", icon: FlaskConical },
] as const;

const writingItems = [
  { href: "/admin/guidelines", label: "UX 가이드", icon: BookOpen },
  { href: "/admin/api-keys", label: "API 키", icon: KeyRound },
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
    pathname === href || (href !== "/admin" && pathname.startsWith(href));

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

export function AdminNav() {
  const pathname = usePathname();
  const insightActive = pathname === "/insight" || pathname.startsWith("/insight/");

  return (
    <nav className="flex flex-1 flex-col gap-1">
      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        A/B 테스트
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
        별도 제품
      </p>
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
        UX 인사이트 랩
      </Link>
      <p className="px-3 pt-1 text-[11px] leading-snug text-muted-foreground">
        URL <code className="rounded bg-muted px-0.5">/insight</code> · DB{" "}
        <code className="rounded bg-muted px-0.5">ux_*</code> · API{" "}
        <code className="rounded bg-muted px-0.5">/api/ux-insight</code>
      </p>

      <div className="mt-auto border-t border-border pt-4">
        <Link
          href="/admin/login"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogIn className="h-5 w-5 shrink-0" />
          로그인
        </Link>
      </div>
    </nav>
  );
}
