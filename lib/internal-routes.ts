/**
 * 인증·게이트 정책을 동일하게 적용하는 내부 도구 경로.
 * A/B 실험·UX 라이팅(/admin)과 UX 인사이트(/insight)는 URL·레이아웃·API를 분리한다.
 */
export const INTERNAL_GATE_PREFIXES = ["/admin", "/insight"] as const;

export type InternalGatePrefix = (typeof INTERNAL_GATE_PREFIXES)[number];

export function getInternalGatePrefix(pathname: string): InternalGatePrefix | null {
  for (const prefix of INTERNAL_GATE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return prefix;
    }
  }
  return null;
}
