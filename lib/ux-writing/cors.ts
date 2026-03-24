/**
 * UX Writing API용 CORS. 허용 오리진은 UX_WRITING_CORS_ORIGINS(쉼표 구분)로 설정.
 * 개발 시 localhost 기본값 포함.
 *
 * - Origin 없음(curl 등): UX_WRITING_BLOCK_NO_ORIGIN=true 이면 거부
 * - Origin "null"(일부 샌드박스·Figma): UX_WRITING_ALLOW_NULL_ORIGIN=false 이면 거부
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

function corsHeadersForOrigin(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    Vary: "Origin",
  };
}

/**
 * Origin 헤더가 있으면 허용 목록(또는 null 오리진 정책)에 맞아야 함.
 */
export function resolveUxWritingCors(request: Request): UxWritingCorsResult {
  const origin = request.headers.get("origin");

  if (!origin) {
    if (process.env.UX_WRITING_BLOCK_NO_ORIGIN === "true") {
      return { ok: false };
    }
    return { ok: true, headers: {} };
  }

  if (origin === "null") {
    if (process.env.UX_WRITING_ALLOW_NULL_ORIGIN === "false") {
      return { ok: false };
    }
    return { ok: true, headers: corsHeadersForOrigin("null") };
  }

  const allowed = getAllowedUxWritingOrigins();
  if (!allowed.includes(origin)) {
    return { ok: false };
  }

  return {
    ok: true,
    headers: corsHeadersForOrigin(origin),
  };
}
