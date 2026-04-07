"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  /** 목록 루트: 쿼리가 없을 때만 활성 (필터 링크와 구분) */
  clearQueryForActive,
  /** 경로 정확 일치만 활성 — /insight 가 /insight/benchmark 와 겹치지 않게 */
  exactPath,
  inactiveWhenSearchHasKey,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  clearQueryForActive?: boolean;
  exactPath?: boolean;
  inactiveWhenSearchHasKey?: string | string[];
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [pathPart, queryPart] = href.split("?");
  const path = pathPart || href;

  let isActive = false;
  if (clearQueryForActive) {
    isActive = pathname === path && searchParams.toString() === "";
  } else if (exactPath) {
    isActive = pathname === path || pathname === `${path}/`;
  } else if (queryPart !== undefined) {
    const want = new URLSearchParams(queryPart);
    isActive =
      pathname === path &&
      [...want].every(([k, v]) => searchParams.get(k) === v);
  } else if (path === "/") {
    isActive = pathname === "/";
  } else {
    let base =
      pathname === path ||
      (path.length > 1 && pathname.startsWith(`${path}/`));
    if (base && inactiveWhenSearchHasKey) {
      const keys = Array.isArray(inactiveWhenSearchHasKey)
        ? inactiveWhenSearchHasKey
        : [inactiveWhenSearchHasKey];
      if (keys.some((k) => searchParams.has(k))) {
        base = false;
      }
    }
    isActive = base;
  }

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
