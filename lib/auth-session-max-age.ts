/** JWT·로그인 쿠키 최대 수명(초). 짧게 하면 브라우저 닫지 않아도 만료마다 재로그인에 가깝게 동작. */
export function getSessionMaxAgeSeconds(): number {
  const raw = process.env.AUTH_SESSION_MAX_AGE_SECONDS;
  if (raw == null || raw === "") return 30 * 24 * 60 * 60;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 300) return 30 * 24 * 60 * 60;
  return Math.min(Math.floor(n), 365 * 24 * 60 * 60);
}
