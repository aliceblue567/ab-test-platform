"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { WorkspaceBaseProvider } from "@/components/workspace/workspace-base-context";
import { PlatformTopNav } from "@/components/platform/platform-top-nav";
import { PlatformBreadcrumb } from "@/components/platform/platform-breadcrumb";

function adminNoChrome(pathname: string | null) {
  if (!pathname) return false;
  if (pathname === "/admin/gate" || pathname.startsWith("/admin/gate/"))
    return true;
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/") ||
    pathname === "/admin/signup" ||
    pathname.startsWith("/admin/signup/") ||
    pathname === "/admin/auth-error" ||
    pathname.startsWith("/admin/auth-error/")
  ) {
    return true;
  }
  return false;
}

/**
 * /admin/gate·로그인 등은 상단/사이드 크롬 없음.
 */
export function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const noChrome = adminNoChrome(pathname);

  if (noChrome) {
    return (
      <WorkspaceBaseProvider basePath="/admin">
        <div className="min-h-screen bg-background text-foreground">{children}</div>
      </WorkspaceBaseProvider>
    );
  }

  return (
    <WorkspaceBaseProvider basePath="/admin">
      <div className="min-h-screen bg-background text-foreground">
        <PlatformTopNav area="admin" />
        <div className="flex pt-14">
          <AdminSidebar />
          <main className="ml-56 min-h-[calc(100vh-3.5rem)] min-w-0 flex-1">
            <PlatformBreadcrumb />
            {children}
          </main>
        </div>
      </div>
    </WorkspaceBaseProvider>
  );
}
