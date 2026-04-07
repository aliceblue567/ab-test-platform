"use client";

import { PlatformTopNav } from "./platform-top-nav";
import { PlatformBreadcrumb } from "./platform-breadcrumb";

/** 루트 `/` 문구 검수 등 — 상단 플랫폼 크롬만 얹음 */
export function TeamHomeShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlatformTopNav area="home" />
      <div className="pt-14">
        <PlatformBreadcrumb />
        {children}
      </div>
    </>
  );
}
