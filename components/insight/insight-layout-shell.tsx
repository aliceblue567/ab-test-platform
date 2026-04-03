"use client";

import { InsightSidebar } from "@/components/insight/insight-sidebar";

export function InsightLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <InsightSidebar />
      <main className="pl-56">{children}</main>
    </div>
  );
}
