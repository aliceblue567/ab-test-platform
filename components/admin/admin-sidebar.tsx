"use client";

import { AdminNav } from "./admin-nav";

export function AdminSidebar() {
  return (
    <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-56 flex-col border-r border-border bg-card">
      <div className="flex min-h-0 flex-1 flex-col">
        <AdminNav />
      </div>
    </aside>
  );
}
