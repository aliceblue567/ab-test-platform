"use client";

import { usePathname } from "next/navigation";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceBaseProvider } from "@/components/workspace/workspace-base-context";

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
        <WorkspaceSidebar />
        <main className="pl-56">{children}</main>
      </div>
    </WorkspaceBaseProvider>
  );
}
