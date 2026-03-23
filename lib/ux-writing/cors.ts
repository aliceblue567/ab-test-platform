/**
 * UX Writing API용 CORS. 허용 오리진은 UX_WRITING_CORS_ORIGINS(쉼표 구분)로 설정.
 * 개발 시 localhost 기본값 포함.
 */
function parseAllowedOrigins(): string[] {
  const raw =
    process.env.UX_WRITING_CORS_ORIGINS ??
    "http://localhost:3000,https://www.figma.com,https://figma.com";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

let cached: string[] | null = null;

export function getAllowedUxWritingOrigins(): string[] {
  if (!cached) cached = parseAllowedOrigins();
  return cached;
}

export type UxWritingCorsResult =
  | { ok: true; headers: HeadersInit }
  | { ok: false };

/**
 * Origin 헤더가 있으면 허용 목록에 있어야 함(브라우저 크로스 오리진).
 * Origin 이 없으면( curl 등 ) CORS 헤더 없이 통과.
 */
export function resolveUxWritingCors(request: Request): UxWritingCorsResult {
  const origin = request.headers.get("origin");
  if (!origin) {
    return { ok: true, headers: {} };
  }

  const allowed = getAllowedUxWritingOrigins();
  if (!allowed.includes(origin)) {
    return { ok: false };
  }

  return {
    ok: true,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      Vary: "Origin",
    },
  };
}
