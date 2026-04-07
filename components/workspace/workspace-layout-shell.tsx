"use client";

import { usePathname } from "next/navigation";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceBaseProvider } from "@/components/workspace/workspace-base-context";
import { PlatformTopNav } from "@/components/platform/platform-top-nav";
import { PlatformBreadcrumb } from "@/components/platform/platform-breadcrumb";

export function WorkspaceLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const loginOnly =
    pathname === "/workspace/login" ||
    pathname?.startsWith("/workspace/login/");

  if (loginOnly) {
    return (
      <WorkspaceBaseProvider basePath="/workspace">
        <div className="min-h-screen bg-background text-foreground">
          {children}
        </div>
      </WorkspaceBaseProvider>
    );
  }

  return (
    <WorkspaceBaseProvider basePath="/workspace">
      <div className="min-h-screen bg-background text-foreground">
        <PlatformTopNav area="workspace" />
        <div className="flex pt-14">
          <WorkspaceSidebar />
          <main className="ml-56 min-h-[calc(100vh-3.5rem)] min-w-0 flex-1">
            <PlatformBreadcrumb />
            {children}
          </main>
        </div>
      </div>
    </WorkspaceBaseProvider>
  );
}
