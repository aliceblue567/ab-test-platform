/**
 * 프로세스 메모리 기반 슬라이딩 윈도우 레이트 리밋.
 * 서버리스/다중 인스턴스에서는 인스턴스별 한도 — 전역 한도는 Redis/Upstash 권장.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function defaultWindowMs(): number {
  const w = Number(process.env.UX_WRITING_RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(w) && w > 0 ? w : 60_000;
}

function defaultMaxHits(): number {
  const m = Number(process.env.UX_WRITING_RATE_LIMIT_MAX);
  return Number.isFinite(m) && m > 0 ? m : 60;
}

function ipMaxHits(): number {
  const m = Number(process.env.UX_WRITING_IP_RATE_LIMIT_MAX);
  return Number.isFinite(m) && m > 0 ? m : 40;
}

export function consumeRateLimit(
  key: string,
  options?: { windowMs?: number; max?: number }
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const win = options?.windowMs ?? defaultWindowMs();
  const max = options?.max ?? defaultMaxHits();

  let b = store.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + win };
    store.set(key, b);
  }

  if (b.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  b.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** IP 기반(인증 전) — 무차별 대입·남용 완화 */
export function consumeIpRateLimit(ipKey: string): {
  allowed: boolean;
  retryAfterSec: number;
} {
  return consumeRateLimit(`ip:${ipKey}`, {
    windowMs: defaultWindowMs(),
    max: ipMaxHits(),
  });
}
