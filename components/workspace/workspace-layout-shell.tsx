"use client";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceBaseProvider } from "@/components/workspace/workspace-base-context";

export function WorkspaceLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceBaseProvider basePath="/workspace">
      <div className="min-h-screen bg-background text-foreground">
        <WorkspaceSidebar />
        <main className="pl-56">{children}</main>
      </div>
    </WorkspaceBaseProvider>
  );
}
