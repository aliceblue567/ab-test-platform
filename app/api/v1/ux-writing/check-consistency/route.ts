import { NextResponse } from "next/server";
import { z } from "zod";
import { runConsistencyCheck } from "@/lib/ux-writing/ai-consistency-check";
import { verifyUxCheckApiKey } from "@/lib/ux-writing/verify-api-key";
import { resolveUxWritingCors } from "@/lib/ux-writing/cors";
import { getClientIp } from "@/lib/ux-writing/request-ip";
import {
  consumeIpRateLimit,
  consumeRateLimit,
} from "@/lib/ux-writing/rate-limit";
import { UxWritingCheckFailed } from "@/lib/ux-writing/ai-errors";
import {
  assertUxWritingQuotaAvailable,
  recordUxWritingCheckSuccess,
  UsageCapExceededError,
} from "@/lib/ux-writing/usage-cap";
import { toApiErrorMessage } from "@/lib/api-error";

const MAX_ITEMS = 300;
const MAX_TOTAL_CHARS = 60_000;

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        text: z.string().min(1).max(2000),
      })
    )
    .min(2, "비교할 텍스트가 2개 이상 필요합니다.")
    .max(MAX_ITEMS, `한 번에 최대 ${MAX_ITEMS}개까지 검사할 수 있습니다.`),
});

export async function OPTIONS(request: Request) {
  const cors = resolveUxWritingCors(request);
  if (!cors.ok) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: cors.headers,
  });
}

export async function POST(request: Request) {
  const cors = resolveUxWritingCors(request);
  if (!cors.ok) {
    return NextResponse.json(
      {
        error: "Forbidden",
        message:
          "허용되지 않은 출처(Origin)입니다. UX_WRITING_CORS_ORIGINS 설정을 확인하세요.",
      },
      { status: 403 }
    );
  }

  const ip = getClientIp(request);
  const ipLimit = consumeIpRateLimit(ip);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: `요청이 너무 많습니다. ${ipLimit.retryAfterSec}초 후 다시 시도해 주세요.`,
      },
      {
        status: 429,
        headers: {
          ...cors.headers,
          "Retry-After": String(ipLimit.retryAfterSec),
        },
      }
    );
  }

  const auth = await verifyUxCheckApiKey(request.headers.get("x-api-key"));
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized", message: auth.message },
      { status: 401, headers: cors.headers }
    );
  }

  const keyLimit = consumeRateLimit(`k:${auth.keyId}`);
  if (!keyLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: `이 API 키의 호출 한도를 초과했습니다. ${keyLimit.retryAfterSec}초 후 다시 시도해 주세요.`,
      },
      {
        status: 429,
        headers: {
          ...cors.headers,
          "Retry-After": String(keyLimit.retryAfterSec),
        },
      }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "JSON 본문이 올바르지 않습니다." },
      { status: 400, headers: cors.headers }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400, headers: cors.headers }
    );
  }

  const totalChars = parsed.data.items.reduce(
    (sum, it) => sum + it.text.length,
    0
  );
  if (totalChars > MAX_TOTAL_CHARS) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: `텍스트 총 길이가 너무 깁니다 (최대 ${MAX_TOTAL_CHARS}자). 범위를 줄여서 다시 시도해 주세요.`,
      },
      { status: 400, headers: cors.headers }
    );
  }

  try {
    await assertUxWritingQuotaAvailable();
    const issues = await runConsistencyCheck(parsed.data.items);
    await recordUxWritingCheckSuccess();
    return NextResponse.json({ issues }, { headers: cors.headers });
  } catch (e) {
    if (e instanceof UsageCapExceededError) {
      return NextResponse.json(
        { error: "Forbidden", message: e.message },
        { status: 403, headers: cors.headers }
      );
    }
    if (e instanceof UxWritingCheckFailed) {
      return NextResponse.json(
        { error: "Bad Gateway", message: e.message },
        { status: e.statusCode, headers: cors.headers }
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        message: toApiErrorMessage(e),
      },
      { status: 500, headers: cors.headers }
    );
  }
}
