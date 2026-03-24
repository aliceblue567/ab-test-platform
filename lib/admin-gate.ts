/**
 * /admin 1차 보호: ADMIN_PASSWORD 검증 후 서명 쿠키(admin_gate).
 * 서명 키는 AUTH_SECRET 사용(Edge 미들웨어·Route Handler 공통).
 */
const COOKIE_NAME = "admin_gate";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

const encoder = new TextEncoder();

function uint8ToBase64Url(u8: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Edge·Node 공통 */
export async function signAdminGateToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `v1:${exp}`;
  const key = await importHmacKey(secret);
  const data = encoder.encode(payload);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const payloadB64 = uint8ToBase64Url(data);
  const sigB64 = uint8ToBase64Url(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

export async function verifyAdminGateToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  let payload: string;
  try {
    payload = new TextDecoder().decode(base64UrlToBytes(payloadB64));
  } catch {
    return false;
  }
  const m = /^v1:(\d+)$/.exec(payload);
  if (!m) return false;
  const exp = parseInt(m[1], 10);
  if (exp <= Math.floor(Date.now() / 1000)) return false;

  const key = await importHmacKey(secret);
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlToBytes(sigB64);
  } catch {
    return false;
  }
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    new Uint8Array(sigBytes),
    encoder.encode(payload)
  );
  return ok;
}

export function isAdminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

export function getGateCookieName(): typeof COOKIE_NAME {
  return COOKIE_NAME;
}

export function getGateSecret(): string | undefined {
  const s = process.env.AUTH_SECRET?.trim();
  return s || undefined;
}
