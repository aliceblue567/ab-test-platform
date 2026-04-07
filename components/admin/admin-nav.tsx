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
  Users,
  Shield,
} from "lucide-react";

const experimentItems = [
  { href: "/admin/experiments", label: "실험 목록", icon: LayoutList },
  { href: "/admin/planner", label: "플래너", icon: FlaskConical },
] as const;

const writingItems = [
  { href: "/admin/guidelines", label: "UX 가이드", icon: BookOpen },
  { href: "/admin/api-keys", label: "API 키", icon: KeyRound },
] as const;

function sectionTitleClass(isFirst: boolean) {
  return cn(
    "px-3 pb-2 text-xs font-semibold tracking-tight text-foreground/75",
    isFirst ? "pt-2" : "pt-5"
  );
}

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

function SubtleLink({
  href,
  label,
  hint,
  icon: Icon,
}: {
  href: string;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </Link>
      <p className="px-3 pb-1 text-[10px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const insightActive =
    pathname === "/insight" || pathname.startsWith("/insight/");
  const workspaceActive =
    pathname === "/workspace" || pathname.startsWith("/workspace/");

  return (
    <nav className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <p className={sectionTitleClass(true)}>실험</p>
        <div className="flex flex-col gap-1">
          {experimentItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <p className={sectionTitleClass(false)}>UX 라이팅</p>
        <div className="flex flex-col gap-1">
          {writingItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <p className={sectionTitleClass(false)}>인사이트 랩</p>
        <div className="flex flex-col gap-1">
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
        </div>

        <p className={sectionTitleClass(false)}>팀 워크스페이스</p>
        <div className="flex flex-col gap-1">
          <Link
            href="/workspace/experiments"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              workspaceActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Users className="h-5 w-5 shrink-0" />
            팀 실험 · 저장함
          </Link>
          <p className="px-3 text-[10px] leading-snug text-muted-foreground">
            초대 팀원 계정(관리자와 메뉴는 같고 데이터 범위만 다름)
          </p>
        </div>
      </div>

      <div className="shrink-0 space-y-1 border-t border-border bg-card px-3 py-3">
        <p className="px-3 pb-1 text-xs font-semibold text-foreground/75">
          로그인
        </p>
        <SubtleLink
          href="/admin/login"
          label="관리자"
          hint="전체 실험 · API 키 · 조직 설정"
          icon={Shield}
        />
        <SubtleLink
          href="/workspace/login"
          label="팀 워크스페이스"
          hint="초대받은 이메일·비밀번호"
          icon={LogIn}
        />
      </div>
    </nav>
  );
}
