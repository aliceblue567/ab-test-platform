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
}): Promise<string> {
  const apiKey = getTrimmedGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey });
  const model = DEFAULT_VISION_MODEL;

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

  try {
    const completion = await withTimeout(
      client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: "application/json",
          temperature: params.temperature ?? 0.3,
          maxOutputTokens: params.maxOutputTokens ?? 8192,
        },
      }),
      TIMEOUT_MS
    );

    const raw = completion.text;
    if (!raw?.trim()) {
      throw new Error("Gemini 응답이 비어 있습니다.");
    }
    return raw;
  } catch (e) {
    if (e instanceof Error && e.message === "GEMINI_VISION_TIMEOUT") {
      throw new Error(
        "Gemini 응답 시간이 초과되었습니다. 이미지 수·해상도를 줄이거나 잠시 후 다시 시도하세요."
      );
    }
    console.error("[gemini-vision]", e);
    throw new Error(mapGeminiErrorToUserMessage(e));
  }
}
