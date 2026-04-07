/**
 * 인증·게이트 정책을 동일하게 적용하는 내부 도구 경로.
 * A/B 실험·UX 라이팅(/admin)과 UX 인사이트(/insight)는 URL·레이아웃·API를 분리한다.
 *
 * 참가자용 공개 A/B 랜딩은 `/test/:experimentKey` (+ 선택적 `?p=` 서명 토큰) 이다.
 * matcher에 포함하지 않아 1차 게이트·로그인 없음. 2차 보호는 실험 설정 또는
 * `PARTICIPANT_LINK_REQUIRED` 환경 변수로 강제한다.
 */
export const INTERNAL_GATE_PREFIXES = ["/admin", "/insight", "/workspace"] as const;

/** 루트 홈(UX 라이팅 검수 등) — 팀 전용. `/test/*` 와 구분한다. */
export function isTeamOnlyRootPath(pathname: string): boolean {
  return pathname === "/";
}

export type InternalGatePrefix = (typeof INTERNAL_GATE_PREFIXES)[number];

export function getInternalGatePrefix(pathname: string): InternalGatePrefix | null {
  for (const prefix of INTERNAL_GATE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return prefix;
    }
  }
  return null;
}
