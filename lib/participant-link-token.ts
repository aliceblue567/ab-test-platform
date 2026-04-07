import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/** 서명에 사용. 없으면 AUTH_SECRET (프로덕션에서 반드시 설정). */
function getSigningSecret(): string {
  const s =
    process.env.PARTICIPANT_LINK_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development"
      ? "dev-secret-replace-in-production"
      : "");
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("PARTICIPANT_LINK_SECRET or AUTH_SECRET is required");
  }
  return s || "dev-secret-replace-in-production";
}

/** 전 실험에 참가 토큰 강제 (환경 변수). */
export function isParticipantLinkGloballyRequired(): boolean {
  return process.env.PARTICIPANT_LINK_REQUIRED === "true";
}

/** 발급 토큰 유효 시간(초). 기본 7일. */
export function getParticipantLinkTtlSeconds(): number {
  const raw = process.env.PARTICIPANT_LINK_TTL_SECONDS;
  if (raw == null || raw === "") return 7 * 24 * 60 * 60;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 60) return 7 * 24 * 60 * 60;
  return Math.min(Math.floor(n), 365 * 24 * 60 * 60);
}

export function signParticipantLinkToken(
  experimentKey: string,
  ttlSeconds?: number
): { token: string; expiresAt: number } {
  const ttl = ttlSeconds ?? getParticipantLinkTtlSeconds();
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const n = randomBytes(8).toString("hex");
  const payload = JSON.stringify({ k: experimentKey, exp, n });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");
  return { token: `${payloadB64}.${sig}`, expiresAt: exp * 1000 };
}

export function verifyParticipantLinkToken(
  token: string,
  experimentKey: string
): { ok: true } | { ok: false; reason: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return { ok: false, reason: "malformed" };
  const expected = createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(sig, "base64url");
  } catch {
    return { ok: false, reason: "bad_sig" };
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { ok: false, reason: "bad_sig" };
  }
  let payload: { k: string; exp: number; n: string };
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as { k: string; exp: number; n: string };
  } catch {
    return { ok: false, reason: "bad_payload" };
  }
  if (payload.k !== experimentKey) return { ok: false, reason: "key_mismatch" };
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export function buildParticipantTestUrl(
  origin: string,
  experimentKey: string,
  token: string
): string {
  const base = origin.replace(/\/$/, "");
  const key = encodeURIComponent(experimentKey);
  const p = encodeURIComponent(token);
  return `${base}/test/${key}?p=${p}`;
}

export function requestOriginFromRequest(req: Request): string {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host") ?? url.host;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (url.protocol === "https:" ? "https" : "http");
  return `${proto}://${host}`;
}
