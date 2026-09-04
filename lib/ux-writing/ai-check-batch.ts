/**
 * AI API 호출은 서버 전용 provider adapter를 통해 수행합니다.
 * 여러 텍스트를 한 번의 API 호출로 검수한다 — 노드마다 개별 호출하면 가이드라인
 * 블록(고정 텍스트)이 매번 다시 과금되므로, 배치 호출로 묶어 토큰 낭비를 줄인다.
 */
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
import { requestJsonCompletion } from "@/lib/ux-writing/ai-provider";
import {
  checkKoreanOrthography,
  formatKoreanOrthographyMatches,
} from "@/lib/ux-writing/korean-orthography";

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
const GROUNDING_GUARDRAIL = `입력에 없는 오류 원인, 재시도 가능 시점, 문의 경로, 설정 변경 등 사실이나 행동을 추정해 추가하지 마세요.
실제로 제공 가능한 해결 방법을 판단할 문맥이 부족하면 suggestion을 원문과 동일하게 유지하고, reason에 필요한 문맥을 설명하세요.
특히 근거 없이 "인터넷 연결을 확인", "잠시 후 다시 시도", "고객센터에 문의" 같은 문구를 만들면 안 됩니다.`;

const KOREAN_ORTHOGRAPHY_GUARDRAIL = `국립국어원의 현행 한글 맞춤법을 외부 언어 기준으로 사용하되, 하나투어가 승인한 서비스명·상품명·용어·UI 표기를 우선하세요.
공식 근거와 단일 교정안이 확인되지 않거나 복수 표기가 허용되거나 의미에 따라 띄어쓰기가 달라지면 오류로 단정하지 마세요.
조항 번호나 예외를 추측해서 만들지 마세요.`;

export async function runUxWritingCheckBatch(
  items: BatchCheckItem[],
  guidelines: GuidelineRow[]
): Promise<{ results: BatchCheckResult[]; missingIds: string[] }> {
  const guideBlock = formatGuidelinesForSystemPrompt(guidelines);
  const localById = new Map(
    items.map((item) => [
      item.id,
      checkKoreanOrthography(sanitizePromptText(item.text, MAX_TEXT)),
    ])
  );
  const systemPrompt = `당신은 UX 라이팅 검수 전문가입니다. 아래 회사 가이드라인을 반드시 준수하여, 여러 개의 UI 텍스트를 각각 독립적으로 검토합니다.

## 회사 UX 라이팅 가이드라인
${guideBlock}

## 사실성 및 문맥 안전장치
${GROUNDING_GUARDRAIL}

## 한국어 맞춤법 판정 경계
${KOREAN_ORTHOGRAPHY_GUARDRAIL}

## 출력 규칙
JSON 객체 하나만 반환합니다. "results" 배열에는 입력으로 받은 모든 항목에 대해 정확히 하나씩, 같은 개수만큼의 결과가 있어야 합니다. 각 항목은:
- "id": 입력 항목의 id를 그대로 반환
- "suggestion": 가이드에 맞게 다듬은 제안 문구 (위반이 없으면 원문과 동일하게)
- "reason": 왜 이렇게 바꾸었는지 간결한 한국어 이유 (위반이 없으면 빈 문자열)
- "violated_rule": 위반으로 판단한 규칙 이름 (없으면 빈 문자열)
각 텍스트는 서로 독립적으로 판단하세요 — 다른 항목과 비교하지 마세요.`;

  const itemsBlock = items
    .map((it) => {
      const local = localById.get(it.id)!;
      const evidence = formatKoreanOrthographyMatches(local.matches);
      return `[${it.id}] """${local.correctedText.replace(/"""/g, '"')}"""${
        evidence ? `\n확정 맞춤법 교정(최종 제안에서 유지): ${evidence}` : ""
      }`;
    })
    .join("\n");

  const prompt = `## 검토 대상 항목 (${items.length}개)
${itemsBlock}`;

  try {
    const raw = await requestJsonCompletion({
      systemPrompt,
      userPrompt: prompt,
      maxTokens: 8192,
      jsonSchema: outputJsonSchema,
      timeoutMs: AI_TIMEOUT_MS,
    });

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
    const results = parsedResult.data.results
      .filter((r) => requestedIds.has(r.id))
      .map((result) => {
        const local = localById.get(result.id);
        if (!local || local.matches.length === 0) return result;

        const localEvidence = formatKoreanOrthographyMatches(local.matches);
        const localRuleIds = local.matches.map((match) => match.ruleId);
        return {
          ...result,
          suggestion: checkKoreanOrthography(result.suggestion).correctedText,
          reason: `맞춤법 교정: ${localEvidence}. ${result.reason}`.trim(),
          violated_rule: [result.violated_rule, ...localRuleIds]
            .filter(Boolean)
            .filter((value, index, values) => values.indexOf(value) === index)
            .join(", "),
        };
      });
    const returnedIds = new Set(results.map((r) => r.id));
    const missingIds = items
      .map((it) => it.id)
      .filter((id) => !returnedIds.has(id));

    return { results, missingIds };
  } catch (err) {
    const localResults = items.flatMap<BatchCheckResult>((item) => {
      const local = localById.get(item.id);
      if (!local || local.matches.length === 0) return [];
      return [
        {
          id: item.id,
          suggestion: local.correctedText,
          reason: `맞춤법 교정: ${formatKoreanOrthographyMatches(local.matches)}. AI 검수는 일시적으로 사용할 수 없어 확정된 로컬 규칙만 적용했습니다.`,
          violated_rule: local.matches.map((match) => match.ruleId).join(", "),
        },
      ];
    });
    if (localResults.length > 0) {
      const returnedIds = new Set(localResults.map((result) => result.id));
      return {
        results: localResults,
        missingIds: items
          .map((item) => item.id)
          .filter((id) => !returnedIds.has(id)),
      };
    }
    if (err instanceof UxWritingCheckFailed) throw err;
    throw mapAiError(err);
  }
}
