"use client";

import Link from "next/link";
import { AdminNav } from "./admin-nav";

export function AdminSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">A/B Test</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4 px-3">
        <AdminNav />
      </div>
    </aside>
  );
}
