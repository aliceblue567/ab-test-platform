"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { WorkspaceBaseProvider } from "@/components/workspace/workspace-base-context";

/**
 * /admin/gate 는 사이드바 없이 전체 화면(팀 공유용 1차 비밀번호).
 */
export function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const gateOnly = pathname === "/admin/gate" || pathname?.startsWith("/admin/gate/");

  if (gateOnly) {
    return (
      <WorkspaceBaseProvider basePath="/admin">
        <div className="min-h-screen bg-background text-foreground">{children}</div>
      </WorkspaceBaseProvider>
    );
  }

  return (
    <WorkspaceBaseProvider basePath="/admin">
      <div className="min-h-screen bg-background text-foreground">
        <AdminSidebar />
        <main className="pl-56">{children}</main>
      </div>
    </WorkspaceBaseProvider>
  );
}
