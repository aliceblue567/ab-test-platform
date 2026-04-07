"use client";

import Link from "next/link";
import { AdminNav } from "./admin-nav";

export function AdminSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-border bg-card">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <Link href="/admin/experiments" className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold leading-tight">내부 콘솔</span>
          <span className="text-xs font-normal text-muted-foreground">
            실험 · UX 라이팅 · 인사이트 · 팀
          </span>
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <AdminNav />
      </div>
    </aside>
  );
}
