import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

/** JWT에 role이 없으면 기존 사용자는 admin으로 간주 */
export function sessionRole(session: Session | null): UserRole {
  const r = (session?.user as { role?: UserRole } | undefined)?.role;
  if (r === "admin" || r === "member" || r === "viewer") return r;
  return "admin";
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}

export function isAdminSession(session: Session | null): boolean {
  return isAdminRole(sessionRole(session));
}

/** 실험·리소스는 member/viewer는 본인 것만 */
export function isWorkspaceMemberRole(role: UserRole): boolean {
  return role === "member" || role === "viewer";
}
