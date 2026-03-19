/**
 * userKey / sessionKey 생성 및 영속화
 * - userKey: 쿠키 기반, 동일 사용자가 항상 동일 variant
 * - sessionKey: sessionStorage 기반, 탭/세션 단위
 */

const USER_KEY_COOKIE = "ab_user_key";
const SESSION_KEY_STORAGE = "ab_session_key";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년

function generateKey(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * 쿠키에서 userKey 읽기 (클라이언트 전용)
 */
export function getUserKeyFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${USER_KEY_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * userKey를 쿠키에 저장
 */
export function setUserKeyCookie(userKey: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${USER_KEY_COOKIE}=${encodeURIComponent(userKey)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * userKey 조회 또는 생성 후 반환
 */
export function getOrCreateUserKey(): string {
  let userKey = getUserKeyFromCookie();
  if (!userKey) {
    userKey = generateKey("u");
    setUserKeyCookie(userKey);
  }
  return userKey;
}

/**
 * sessionKey 조회 또는 생성 (sessionStorage, 탭 단위)
 */
export function getOrCreateSessionKey(): string {
  if (typeof sessionStorage === "undefined") return generateKey("s");
  let sessionKey = sessionStorage.getItem(SESSION_KEY_STORAGE);
  if (!sessionKey) {
    sessionKey = generateKey("s");
    sessionStorage.setItem(SESSION_KEY_STORAGE, sessionKey);
  }
  return sessionKey;
}
