import OpenAI from "openai";
import { z } from "zod";
import type { GuidelineRow } from "@/lib/ux-writing/guidelines";
import {
  formatGuidelinesForSystemPrompt,
  sanitizePromptText,
} from "@/lib/ux-writing/guidelines";
import {
  UxWritingCheckFailed,
  mapOpenAIError,
} from "@/lib/ux-writing/openai-errors";

export type UxCheckResult = {
  original: string;
  suggestion: string;
  reason: string;
  violated_rule: string;
};

const RESULT_SCHEMA_HINT = `응답은 반드시 하나의 JSON 객체만 포함해야 하며, 키는 정확히 다음 네 개입니다:
- "original": 사용자가 입력한 원문과 동일한 문자열
- "suggestion": 가이드에 맞게 다듬은 제안 문구
- "reason": 왜 이렇게 바꾸었는지 간결한 이유 (한국어)
- "violated_rule": 위반으로 판단한 규칙 이름(없으면 빈 문자열 "") 또는 규칙 요약`;

const MAX_USER = 12_000;
const MAX_SUGGEST = 50_000;
const MAX_REASON = 20_000;
const MAX_VIOLATED = 8_000;

const modelOutputSchema = z.object({
  suggestion: z.string().max(MAX_SUGGEST),
  reason: z.string().max(MAX_REASON),
  violated_rule: z.string().max(MAX_VIOLATED),
});

const OPENAI_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.UX_WRITING_OPENAI_TIMEOUT_MS) || 90_000, 10_000),
  180_000
);

export async function runUxWritingCheck(
  userText: string,
  guidelines: GuidelineRow[]
): Promise<UxCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new UxWritingCheckFailed(
      "서버 설정 오류입니다. 관리자에게 문의하세요.",
      "unknown",
      500
    );
  }

  const client = new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: 0,
  });

  const safeUser = sanitizePromptText(userText, MAX_USER);
  const guideBlock = formatGuidelinesForSystemPrompt(guidelines);

  const system = `당신은 UX 라이팅 검수 전문가입니다. 아래 회사 가이드라인을 반드시 준수하여 사용자의 문구를 검토합니다.

## 회사 UX 라이팅 가이드라인
${guideBlock}

## 출력 규칙
${RESULT_SCHEMA_HINT}
가이드 위반이 없으면 suggestion은 original과 같게 두고, violated_rule은 빈 문자열로 두어도 됩니다.`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `다음 UI/UX 문구를 검토해 주세요:\n\n"""${safeUser.replace(/"""/g, '"')}\n"""`,
        },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new UxWritingCheckFailed(
        "AI 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.",
        "validation",
        502
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new UxWritingCheckFailed(
        "AI 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.",
        "validation",
        502
      );
    }

    const parsedResult = modelOutputSchema.safeParse(parsed);
    if (!parsedResult.success) {
      throw new UxWritingCheckFailed(
        "AI 응답 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        "validation",
        502
      );
    }

    const { suggestion, reason, violated_rule } = parsedResult.data;

    return {
      original: userText,
      suggestion,
      reason,
      violated_rule,
    };
  } catch (err) {
    if (err instanceof UxWritingCheckFailed) throw err;
    throw mapOpenAIError(err);
  }
}
