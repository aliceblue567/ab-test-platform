/**
 * 웹 앱(메인 페이지) 전용 문구 검수 — 클라이언트에 API 키를 요구하지 않음.
 * 외부 연동·자동화는 /api/v1/ux-writing/check + x-api-key 사용.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchGuidelines } from "@/lib/ux-writing/guidelines";
import { runUxWritingCheck } from "@/lib/ux-writing/openai-check";
import { UxWritingCheckFailed } from "@/lib/ux-writing/openai-errors";
import {
  assertUxWritingQuotaAvailable,
  recordUxWritingCheckSuccess,
  UsageCapExceededError,
} from "@/lib/ux-writing/usage-cap";
import { toApiErrorMessage } from "@/lib/api-error";

const bodySchema = z.object({
  text: z.string().min(1, "text is required").max(12_000),
});

export async function POST(request: Request) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return NextResponse.json(
      {
        error: "Forbidden",
        message:
          "이 엔드포인트는 브라우저에서 이 사이트를 연 상태에서만 사용할 수 있습니다. 외부 연동은 /api/v1/ux-writing/check 와 API 키를 사용하세요.",
      },
      { status: 403 }
    );
  }

  /* IP 레이트 리밋 없음: 서버리스 인스턴스마다 메모리가 분리되어 오탐 429가 잦고,
   * 동일 메시지가 OpenAI 429와 겹침. 남용 완화는 Sec-Fetch-Site + OpenAI 쿼터·(선택) WAF에 의존. */

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "JSON 본문이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await assertUxWritingQuotaAvailable();
    const guidelines = await fetchGuidelines();
    const result = await runUxWritingCheck(parsed.data.text, guidelines);
    await recordUxWritingCheckSuccess();
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UsageCapExceededError) {
      return NextResponse.json(
        { error: "Forbidden", message: e.message },
        { status: 403 }
      );
    }
    if (e instanceof UxWritingCheckFailed) {
      return NextResponse.json(
        { error: "Bad Gateway", message: e.message },
        { status: e.statusCode }
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        message: toApiErrorMessage(e),
      },
      { status: 500 }
    );
  }
}
