import type { UserRole } from "@prisma/client";

const FIVE_HOURS = 5 * 60 * 60;

/** 관리자·일반 내부 계정 JWT·쿠키 최대 수명(초). */
export function getAdminSessionMaxAgeSeconds(): number {
  const raw = process.env.AUTH_SESSION_MAX_AGE_SECONDS;
  if (raw == null || raw === "") return 30 * 24 * 60 * 60;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 300) return 30 * 24 * 60 * 60;
  return Math.min(Math.floor(n), 365 * 24 * 60 * 60);
}

/** 팀 워크스페이스(member·viewer) 세션 — 기본 5시간. */
export function getWorkspaceSessionMaxAgeSeconds(): number {
  const raw = process.env.AUTH_WORKSPACE_SESSION_MAX_AGE_SECONDS;
  if (raw == null || raw === "") return FIVE_HOURS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 300) return FIVE_HOURS;
  return Math.min(Math.floor(n), 365 * 24 * 60 * 60);
}

export function getSessionMaxAgeForRole(role: UserRole | undefined | null): number {
  if (role === "member" || role === "viewer") {
    return getWorkspaceSessionMaxAgeSeconds();
  }
  return getAdminSessionMaxAgeSeconds();
}

/**
 * @deprecated 호환용 — 관리자와 동일한 기본(30일)을 가리킵니다.
 * 역할별로는 getSessionMaxAgeForRole 을 사용하세요.
 */
export function getSessionMaxAgeSeconds(): number {
  return getAdminSessionMaxAgeSeconds();
}
