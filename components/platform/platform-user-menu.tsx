"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPlatformLinks,
  resolvePlatformModeFromRole,
} from "@/lib/platform-routes";

type Area = "admin" | "workspace" | "insight" | "home";

export function PlatformUserMenu({ area }: { area: Area }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const mode =
    area === "workspace"
      ? "workspace"
      : area === "admin"
        ? "admin"
        : resolvePlatformModeFromRole(role);
  const links = getPlatformLinks(mode);

  if (status === "loading") {
    return (
      <div className="h-8 w-20 shrink-0 animate-pulse rounded bg-muted sm:w-24" />
    );
  }

  if (status !== "authenticated" || !session?.user) {
    if (area === "home") {
      return (
        <div className="relative shrink-0" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent sm:text-sm"
          >
            로그인
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
          {open && (
            <div className="absolute right-0 z-[60] mt-1 min-w-[11rem] rounded-md border border-border bg-card py-1 shadow-md">
              <Link
                href="/admin/login"
                className="block px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                관리자 로그인
              </Link>
              <Link
                href="/workspace/login"
                className="block px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                팀 워크스페이스 로그인
              </Link>
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  const email = session.user.email ?? session.user.name ?? "계정";
  const settingsHref = links.settings;
  const signOutUrl =
    mode === "workspace" ? "/workspace/login" : "/admin/login";

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex max-w-[10rem] items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-left text-xs font-medium hover:bg-accent sm:max-w-[14rem] sm:text-sm"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-foreground">{email}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-[60] mt-1 min-w-[12rem] rounded-md border border-border bg-card py-1 shadow-md"
          role="menu"
        >
          <Link
            href={settingsHref}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Settings className="h-4 w-4" />
            설정
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: signOutUrl });
            }}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
