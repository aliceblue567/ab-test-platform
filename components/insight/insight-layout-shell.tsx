"use client";

import { InsightSidebar } from "@/components/insight/insight-sidebar";
import { PlatformTopNav } from "@/components/platform/platform-top-nav";
import { PlatformBreadcrumb } from "@/components/platform/platform-breadcrumb";

export function InsightLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PlatformTopNav area="insight" />
      <div className="flex pt-14">
        <InsightSidebar />
        <main className="ml-56 min-h-[calc(100vh-3.5rem)] min-w-0 flex-1">
          <PlatformBreadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}
