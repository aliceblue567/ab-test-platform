/**
 * 프록시 뒤에서 클라이언트 IP 추정 (레이트 리밋용, 엄격한 신뢰는 아님).
 */
export function getClientIp(request: Request): string {
  const h = request.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real?.trim()) return real.trim();
  return "unknown";
}
