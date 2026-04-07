"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getPlatformLinks,
  resolvePlatformModeFromRole,
} from "@/lib/platform-routes";

type Crumb = { label: string; href: string };

function buildCrumbs(pathname: string, mode: "admin" | "workspace"): Crumb[] {
  const L = getPlatformLinks(mode);
  const root: Crumb = { label: "대시보드", href: L.dashboard };
  const p = pathname;

  if (p === L.dashboard) return [root];

  if (p === "/") {
    return [
      root,
      { label: "UX 라이팅", href: L.writingGuide },
      { label: "문구 검수", href: "/" },
    ];
  }

  if (p === L.experiments) {
    return [root, { label: "실험", href: L.experiments }, { label: "실험 목록", href: L.experiments }];
  }

  if (p === L.planner) {
    return [
      root,
      { label: "실험", href: L.experiments },
      { label: "새 실험 만들기", href: L.planner },
    ];
  }

  if (p.startsWith(`${L.planner}/`)) {
    return [
      root,
      { label: "실험", href: L.experiments },
      { label: "실험 편집", href: p },
    ];
  }

  if (p.includes("/report/")) {
    return [
      root,
      { label: "실험", href: L.experiments },
      { label: "리포트", href: p },
    ];
  }

  if (p === L.writingGuide || p.startsWith(`${L.writingGuide}/`)) {
    return [
      root,
      { label: "UX 라이팅", href: L.writingGuide },
      { label: "UX 가이드", href: L.writingGuide },
    ];
  }

  if (L.apiKeys && (p === L.apiKeys || p.startsWith(`${L.apiKeys}/`))) {
    return [
      root,
      { label: "UX 라이팅", href: L.writingGuide },
      { label: "API 키", href: L.apiKeys },
    ];
  }

  if (p === L.settings || p.startsWith(`${L.settings}/`)) {
    return [root, { label: "설정", href: L.settings }];
  }

  if (p.startsWith("/insight")) {
    const lab = { label: "UX 인사이트 랩", href: "/insight" } as const;
    if (p === "/insight" || p === "/insight/") {
      return [root, lab];
    }
    if (p.startsWith("/insight/screens")) {
      return [root, lab, { label: "화면 분석", href: p }];
    }
    if (p.startsWith("/insight/flows")) {
      return [root, lab, { label: "플로우", href: p }];
    }
    if (p.startsWith("/insight/benchmark")) {
      return [root, lab, { label: "벤치마킹", href: p }];
    }
    return [root, lab, { label: "인사이트", href: p }];
  }

  if (p.startsWith("/workspace")) {
    if (p.startsWith("/workspace/login")) return [];
    if (p === "/workspace/dashboard" || p === "/workspace") {
      return [root];
    }
    if (p === "/workspace/experiments") {
      return [
        root,
        { label: "실험", href: L.experiments },
        { label: "실험 목록", href: L.experiments },
      ];
    }
    if (p.startsWith("/workspace/insight-saved")) {
      return [
        root,
        { label: "인사이트", href: "/insight" },
        { label: "인사이트 저장함", href: p },
      ];
    }
  }

  if (p.startsWith("/admin")) {
    if (
      p.startsWith("/admin/login") ||
      p.startsWith("/admin/signup") ||
      p.startsWith("/admin/auth-error") ||
      p.startsWith("/admin/gate")
    ) {
      return [];
    }
  }

  return [root, { label: "현재 화면", href: p }];
}

export function PlatformBreadcrumb() {
  const pathname = usePathname() ?? "";
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const mode = resolvePlatformModeFromRole(role);

  if (status === "loading") return null;

  const crumbs = buildCrumbs(pathname, mode);

  if (crumbs.length < 2) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-border bg-muted/30 px-4 py-2 text-sm"
    >
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-muted-foreground">
        {crumbs.map((c, i) => (
          <li key={`${c.href}-${i}`} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-muted-foreground/60" aria-hidden>
                /
              </span>
            )}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : (
              <Link
                href={c.href}
                className="transition-colors hover:text-foreground"
              >
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
