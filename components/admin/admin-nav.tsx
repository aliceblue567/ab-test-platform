"use client";

import { Suspense, type ComponentType } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LogIn, Shield, LogOut } from "lucide-react";
import {
  resolveActiveSidebarSection,
  SIDEBAR_SECTION_LABEL,
} from "@/lib/platform-sidebar";
import { getAdminSidebarItems } from "@/components/admin/admin-sidebar-config";
import { SidebarNavLink } from "@/components/platform/sidebar-nav-link";

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
      <p className="px-3 pb-1 text-[10px] leading-snug text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}

function AdminNavLinks() {
  const pathname = usePathname() ?? "";
  const section = resolveActiveSidebarSection(pathname, "admin");
  const { items } = getAdminSidebarItems(section);
  const title = SIDEBAR_SECTION_LABEL[section];

  return (
    <>
      <p className="px-3 pb-2 text-xs font-semibold tracking-tight text-foreground/75 pt-2">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <SidebarNavLink
            key={`${item.href}-${item.label}`}
            href={item.href}
            label={item.label}
            icon={item.icon}
            clearQueryForActive={item.clearQueryForActive}
          />
        ))}
        {section === "settings" && (
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/admin/login" })}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            로그아웃
          </button>
        )}
      </div>
    </>
  );
}

export function AdminNav() {
  const { status } = useSession();

  return (
    <nav className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <Suspense
          fallback={
            <p className="px-3 text-sm text-muted-foreground">메뉴 로딩…</p>
          }
        >
          <AdminNavLinks />
        </Suspense>
      </div>

      {status !== "authenticated" && (
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
      )}
    </nav>
  );
}
