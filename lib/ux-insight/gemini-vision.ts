/**
 * UX 인사이트 랩 전용 — Gemini 멀티모달(JSON 출력).
 * 키는 GEMINI_API_KEY (기존 UX 라이팅과 동일).
 */
import { GoogleGenAI } from "@google/genai";
import {
  getTrimmedGeminiApiKey,
  mapGeminiErrorToUserMessage,
} from "@/lib/ux-insight/gemini-client-helpers";

const DEFAULT_VISION_MODEL =
  process.env.GEMINI_VISION_MODEL?.trim() ||
  process.env.GEMINI_MODEL?.trim() ||
  "gemini-2.5-flash";

const TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.GEMINI_VISION_TIMEOUT_MS) || 120_000, 20_000),
  180_000
);
const RETRY_PER_MODEL = Math.min(
  Math.max(Number(process.env.GEMINI_VISION_RETRY_PER_MODEL) || 2, 1),
  4
);
const RETRY_DELAY_MS = Math.min(
  Math.max(Number(process.env.GEMINI_VISION_RETRY_DELAY_MS) || 1200, 300),
  5000
);

function getModelCandidates() {
  const raw =
    process.env.GEMINI_VISION_FALLBACK_MODELS ??
    "gemini-2.0-flash,gemini-1.5-flash";
  const fallbacks = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set([DEFAULT_VISION_MODEL, ...fallbacks]));
}

function isRetriableOverloadError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();
  return (
    low.includes("503") ||
    low.includes("unavailable") ||
    low.includes("high demand") ||
    low.includes("resource exhausted") ||
    low.includes("quota") ||
    low.includes("rate limit")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("GEMINI_VISION_TIMEOUT")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export type GeminiImagePart = { mimeType: string; dataBase64: string };

/**
 * systemInstruction + 사용자 텍스트 + 이미지(들) → JSON 텍스트
 */
export async function generateUxInsightJson(params: {
  systemInstruction: string;
  userText: string;
  images: GeminiImagePart[];
  temperature?: number;
  maxOutputTokens?: number;
  /** 있으면 Gemini가 이 JSON Schema에 맞춰 출력(스키마 불일치 감소) */
  responseJsonSchema?: unknown;
}): Promise<string> {
  const apiKey = getTrimmedGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  const models = getModelCandidates();

  const parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }> = [{ text: params.userText }];

  for (const img of params.images) {
    const mime =
      img.mimeType && img.mimeType !== "application/octet-stream"
        ? img.mimeType
        : "image/png";
    parts.push({
      inlineData: { mimeType: mime, data: img.dataBase64 },
    });
  }

  const config: {
    systemInstruction: string;
    responseMimeType: string;
    temperature: number;
    maxOutputTokens: number;
    responseJsonSchema?: unknown;
  } = {
    systemInstruction: params.systemInstruction,
    responseMimeType: "application/json",
    temperature: params.temperature ?? 0.3,
    maxOutputTokens: params.maxOutputTokens ?? 8192,
  };
  if (params.responseJsonSchema !== undefined) {
    config.responseJsonSchema = params.responseJsonSchema;
  }

  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 1; attempt <= RETRY_PER_MODEL; attempt++) {
      try {
        const completion = await withTimeout(
          client.models.generateContent({
            model,
            contents: [{ role: "user", parts }],
            config,
          }),
          TIMEOUT_MS
        );
        const raw = completion.text;
        if (!raw?.trim()) {
          throw new Error("Gemini 응답이 비어 있습니다.");
        }
        return raw;
      } catch (e) {
        lastErr = e;
        if (e instanceof Error && e.message === "GEMINI_VISION_TIMEOUT") {
          throw new Error(
            "Gemini 응답 시간이 초과되었습니다. 이미지 수·해상도를 줄이거나 잠시 후 다시 시도하세요."
          );
        }
        const retriable = isRetriableOverloadError(e);
        const lastTryOnModel = attempt >= RETRY_PER_MODEL;
        if (!retriable) {
          console.error("[gemini-vision]", e);
          throw new Error(mapGeminiErrorToUserMessage(e));
        }
        if (!lastTryOnModel) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }
  }

  console.error("[gemini-vision] exhausted retries", lastErr);
  throw new Error(
    "Gemini 모델 사용량이 높습니다. 잠시 후 다시 시도하거나 이미지 수를 줄여 다시 분석해 주세요."
  );
}
