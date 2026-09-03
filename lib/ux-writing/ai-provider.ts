/**
 * UX Writing AI provider adapter (server only).
 *
 * Provider resolution:
 * 1. UX_WRITING_AI_PROVIDER when explicitly set
 * 2. Groq when GROQ_API_KEY exists
 * 3. Anthropic for backward compatibility
 */
import Anthropic from "@anthropic-ai/sdk";
import { UxWritingCheckFailed } from "@/lib/ux-writing/ai-errors";

export type JsonSchema = Record<string, unknown>;

type JsonCompletionOptions = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  jsonSchema: JsonSchema;
  timeoutMs: number;
};

type AiProvider = "groq" | "anthropic";

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

function resolveProvider(): AiProvider {
  const configured = process.env.UX_WRITING_AI_PROVIDER?.trim().toLowerCase();
  if (configured) {
    if (configured === "groq" || configured === "anthropic") return configured;
    throw new UxWritingCheckFailed(
      "지원하지 않는 AI 제공자 설정입니다. 관리자에게 문의하세요.",
      "unknown",
      500
    );
  }
  return process.env.GROQ_API_KEY ? "groq" : "anthropic";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("UX_WRITING_TIMEOUT")), timeoutMs);
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

async function callGroq(options: JsonCompletionOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new UxWritingCheckFailed(
      "Groq API 설정이 없습니다. 관리자에게 문의하세요.",
      "unknown",
      500
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL,
        temperature: 0,
        max_completion_tokens: options.maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ux_writing_result",
            strict: true,
            schema: options.jsonSchema,
          },
        },
        reasoning_effort: "low",
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`Groq API error: ${response.status}`) as Error & {
        status: number;
      };
      error.status = response.status;
      throw error;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) {
      throw new UxWritingCheckFailed(
        "AI 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.",
        "validation",
        502
      );
    }
    return raw;
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(options: JsonCompletionOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new UxWritingCheckFailed(
      "Anthropic API 설정이 없습니다. 관리자에게 문의하세요.",
      "unknown",
      500
    );
  }

  const client = new Anthropic({ apiKey });
  const completion = await withTimeout(
    client.messages.create({
      model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: options.maxTokens,
      system: [
        {
          type: "text",
          text: options.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: options.jsonSchema },
      },
      messages: [{ role: "user", content: options.userPrompt }],
    }),
    options.timeoutMs
  );

  const textBlock = completion.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  if (!textBlock?.text) {
    throw new UxWritingCheckFailed(
      "AI 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.",
      "validation",
      502
    );
  }
  return textBlock.text;
}

export async function requestJsonCompletion(
  options: JsonCompletionOptions
): Promise<string> {
  return resolveProvider() === "groq" ? callGroq(options) : callAnthropic(options);
}
