"use client";

import Link from "next/link";
import { WorkspaceNav } from "./workspace-nav";

export function WorkspaceSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/workspace/experiments" className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold leading-tight">팀 워크스페이스</span>
          <span className="text-xs font-normal text-muted-foreground">
            내 실험 · 가이드 · 인사이트
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4 px-3">
        <WorkspaceNav />
      </div>
    </aside>
  );
}
