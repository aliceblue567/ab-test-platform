import { createHash, randomBytes, timingSafeEqual } from "crypto";

const KEY_PREFIX = "uxw_";

/** 표시용(목록에서 키 일부만 구분) */
export function buildKeyPrefixFromPlain(plain: string): string {
  const slice = plain.slice(0, 18);
  return slice.length < plain.length ? `${slice}…` : slice;
}

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

/**
 * 피그마 플러그인 등에 붙일 원문 키를 생성합니다.
 * 형식: uxw_ + base64url(32 bytes)
 */
export function generateApiKeyPlain(): string {
  return KEY_PREFIX + randomBytes(32).toString("base64url");
}

export function timingSafeCompareEnv(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}
