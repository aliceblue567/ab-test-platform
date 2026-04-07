"use client";

import { Suspense } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  resolveActiveSidebarSection,
  SIDEBAR_SECTION_LABEL,
} from "@/lib/platform-sidebar";
import { getWorkspaceSidebarItems } from "@/components/admin/admin-sidebar-config";
import { SidebarNavLink } from "@/components/platform/sidebar-nav-link";

function WorkspaceNavLinks() {
  const pathname = usePathname() ?? "";
  const section = resolveActiveSidebarSection(pathname, "workspace");
  const { items } = getWorkspaceSidebarItems(section);
  const title = SIDEBAR_SECTION_LABEL[section];

  if (items.length === 0) {
    return (
      <p className="px-3 pt-2 text-sm text-muted-foreground">
        이 영역 메뉴가 없습니다. 상단에서 다른 메뉴를 선택해 주세요.
      </p>
    );
  }

  return (
    <>
      <p className="px-3 pb-2 pt-2 text-xs font-semibold tracking-tight text-foreground/75">
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
            onClick={() => void signOut({ callbackUrl: "/workspace/login" })}
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

export function WorkspaceNav() {
  return (
    <nav className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <p className="px-3 py-4 text-sm text-muted-foreground">메뉴 로딩…</p>
        }
      >
        <WorkspaceNavLinks />
      </Suspense>
    </nav>
  );
}
