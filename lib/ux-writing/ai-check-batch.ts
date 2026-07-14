/**
 * Claude API 호출은 이 모듈(서버 전용)에서만 수행합니다.
 * 여러 텍스트를 한 번의 API 호출로 검수한다 — 노드마다 개별 호출하면 가이드라인
 * 블록(고정 텍스트)이 매번 다시 과금되므로, 배치 호출로 묶어 토큰 낭비를 줄인다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { GuidelineRow } from "@/lib/ux-writing/guidelines";
import {
  formatGuidelinesForSystemPrompt,
  sanitizePromptText,
} from "@/lib/ux-writing/guidelines";
import {
  UxWritingCheckFailed,
  mapAiError,
} from "@/lib/ux-writing/ai-errors";

export type BatchCheckItem = { id: string; text: string };

export type BatchCheckResult = {
  id: string;
  suggestion: string;
  reason: string;
  violated_rule: string;
};

const MAX_TEXT = 2_000;
const MAX_SUGGEST = 4_000;
const MAX_REASON = 2_000;
const MAX_VIOLATED = 1_000;

export const MAX_BATCH_ITEMS = 80;
export const MAX_BATCH_TOTAL_CHARS = 40_000;

const resultSchema = z.object({
  id: z.string(),
  suggestion: z.string().max(MAX_SUGGEST),
  reason: z.string().max(MAX_REASON),
  violated_rule: z.string().max(MAX_VIOLATED),
});

const outputSchema = z.object({
  results: z.array(resultSchema).max(MAX_BATCH_ITEMS),
});

const outputJsonSchema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "입력 항목의 id를 그대로 반환" },
          suggestion: {
            type: "string",
            description: "가이드에 맞게 다듬은 제안 문구",
          },
          reason: {
            type: "string",
            description: "왜 이렇게 바꾸었는지 설명하는 간결한 한국어 이유",
          },
          violated_rule: {
            type: "string",
            description:
              "위반으로 판단한 규칙 이름. 없으면 빈 문자열 또는 규칙 요약",
          },
        },
        required: ["id", "suggestion", "reason", "violated_rule"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
} as const;

const AI_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.UX_WRITING_AI_TIMEOUT_MS) || 90_000, 10_000),
  180_000
);
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("UX_WRITING_TIMEOUT"));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function runUxWritingCheckBatch(
  items: BatchCheckItem[],
  guidelines: GuidelineRow[]
): Promise<{ results: BatchCheckResult[]; missingIds: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new UxWritingCheckFailed(
      "서버 설정 오류입니다. 관리자에게 문의하세요.",
      "unknown",
      500
    );
  }

  const client = new Anthropic({ apiKey });

  const guideBlock = formatGuidelinesForSystemPrompt(guidelines);
  const systemPrompt = `당신은 UX 라이팅 검수 전문가입니다. 아래 회사 가이드라인을 반드시 준수하여, 여러 개의 UI 텍스트를 각각 독립적으로 검토합니다.

## 회사 UX 라이팅 가이드라인
${guideBlock}

## 출력 규칙
JSON 객체 하나만 반환합니다. "results" 배열에는 입력으로 받은 모든 항목에 대해 정확히 하나씩, 같은 개수만큼의 결과가 있어야 합니다. 각 항목은:
- "id": 입력 항목의 id를 그대로 반환
- "suggestion": 가이드에 맞게 다듬은 제안 문구 (위반이 없으면 원문과 동일하게)
- "reason": 왜 이렇게 바꾸었는지 간결한 한국어 이유 (위반이 없으면 빈 문자열)
- "violated_rule": 위반으로 판단한 규칙 이름 (없으면 빈 문자열)
각 텍스트는 서로 독립적으로 판단하세요 — 다른 항목과 비교하지 마세요.`;

  const itemsBlock = items
    .map((it) => `[${it.id}] """${sanitizePromptText(it.text, MAX_TEXT).replace(/"""/g, '"')}"""`)
    .join("\n");

  const prompt = `## 검토 대상 항목 (${items.length}개)
${itemsBlock}`;

  try {
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 16_000,
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: outputJsonSchema,
        },
      },
      messages: [{ role: "user", content: prompt }],
    });

    const completion = await withTimeout(stream.finalMessage(), AI_TIMEOUT_MS);

    const textBlock = completion.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const raw = textBlock?.text;
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

    const parsedResult = outputSchema.safeParse(parsed);
    if (!parsedResult.success) {
      throw new UxWritingCheckFailed(
        "AI 응답 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        "validation",
        502
      );
    }

    // 존재하지 않는 id를 반환한 결과는 버리고, 누락된 id는 별도로 알려준다.
    const requestedIds = new Set(items.map((it) => it.id));
    const results = parsedResult.data.results.filter((r) => requestedIds.has(r.id));
    const returnedIds = new Set(results.map((r) => r.id));
    const missingIds = items
      .map((it) => it.id)
      .filter((id) => !returnedIds.has(id));

    return { results, missingIds };
  } catch (err) {
    if (err instanceof UxWritingCheckFailed) throw err;
    throw mapAiError(err);
  }
}
