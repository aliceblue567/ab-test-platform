/**
 * Claude API 호출은 이 모듈(서버 전용)에서만 수행합니다.
 * 여러 화면에서 수집된 텍스트를 한 번에 비교해 화면 간 표현 불일치(같은 기능,
 * 다른 표현)를 찾습니다. 개별 텍스트를 가이드라인과만 대조하는 ai-check.ts와는
 * 다른 검사입니다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { sanitizePromptText } from "@/lib/ux-writing/guidelines";
import { UxWritingCheckFailed, mapAiError } from "@/lib/ux-writing/ai-errors";

export type ConsistencyItem = { id: string; text: string };

export type ConsistencyIssue = {
  item_ids: string[];
  summary: string;
  suggested_term: string;
};

const MAX_TEXT = 500;
const MAX_SUMMARY = 2000;
const MAX_TERM = 500;
const MAX_ISSUES = 200;

const issueSchema = z.object({
  item_ids: z.array(z.string()).min(2),
  summary: z.string().max(MAX_SUMMARY),
  suggested_term: z.string().max(MAX_TERM),
});

const outputSchema = z.object({
  issues: z.array(issueSchema).max(MAX_ISSUES),
});

const outputJsonSchema = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item_ids: {
            type: "array",
            items: { type: "string" },
            description: "이 문제에 해당하는 항목들의 id 목록 (2개 이상)",
          },
          summary: {
            type: "string",
            description: "무엇이 왜 일관성 문제인지 한국어로 간결하게 설명",
          },
          suggested_term: {
            type: "string",
            description: "통일해서 사용할 것을 제안하는 표현",
          },
        },
        required: ["item_ids", "summary", "suggested_term"],
        additionalProperties: false,
      },
    },
  },
  required: ["issues"],
  additionalProperties: false,
} as const;

const AI_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.UX_WRITING_AI_TIMEOUT_MS) || 90_000, 10_000),
  180_000
);
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-4-8";

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

export async function runConsistencyCheck(
  items: ConsistencyItem[]
): Promise<ConsistencyIssue[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new UxWritingCheckFailed(
      "서버 설정 오류입니다. 관리자에게 문의하세요.",
      "unknown",
      500
    );
  }

  const client = new Anthropic({ apiKey });

  const listBlock = items
    .map((it) => `[${it.id}] ${sanitizePromptText(it.text, MAX_TEXT)}`)
    .join("\n");

  const prompt = `당신은 UX 라이팅 일관성 검수 전문가입니다. 아래는 하나의 제품(또는 화면 세트)에서 수집된 UI 텍스트 목록입니다. 각 줄은 "[id] 텍스트" 형식이며, 서로 다른 화면·위치에서 온 텍스트일 수 있습니다.

## 검사 목표
같은 기능이나 의미를 가리키는데 서로 다른 표현을 쓰고 있는 항목들을 찾아주세요.
예: 같은 "더 보기" 동작인데 어떤 곳은 "더보기", 다른 곳은 "전체보기"라고 쓰는 경우. 같은 안내인데 문체(해요체/합니다체)가 섞여 쓰이는 경우.
이미 표현이 동일한 항목은 언급하지 마세요. 최소 2개 이상의 항목이 실제로 같은 의미·기능을 가리킬 때만 이슈로 보고하세요. 확신이 없으면 보고하지 마세요. 우연히 비슷해 보이지만 실제로는 다른 기능인 텍스트를 묶지 마세요.

## 출력 규칙
JSON 객체 하나만 반환합니다. "issues" 배열의 각 항목은 다음을 포함합니다:
- item_ids: 문제가 되는 항목들의 id 목록 (반드시 위 목록에 있는 id만, 2개 이상)
- summary: 무엇이 왜 일관성 문제인지 설명하는 간결한 한국어 문장
- suggested_term: 통일해서 사용할 것을 제안하는 표현
일관성 문제가 없으면 issues를 빈 배열로 반환하세요.

## 텍스트 목록
${listBlock}`;

  try {
    const completion = await withTimeout(
      client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        output_config: {
          format: {
            type: "json_schema",
            schema: outputJsonSchema,
          },
        },
        messages: [{ role: "user", content: prompt }],
      }),
      AI_TIMEOUT_MS
    );

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

    const result = outputSchema.safeParse(parsed);
    if (!result.success) {
      throw new UxWritingCheckFailed(
        "AI 응답 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        "validation",
        502
      );
    }

    // 존재하지 않는 id를 참조하는 이슈(환각)는 걸러낸다.
    const validIds = new Set(items.map((it) => it.id));
    return result.data.issues.filter(
      (issue) =>
        issue.item_ids.length >= 2 &&
        issue.item_ids.every((id) => validIds.has(id))
    );
  } catch (err) {
    if (err instanceof UxWritingCheckFailed) throw err;
    throw mapAiError(err);
  }
}
