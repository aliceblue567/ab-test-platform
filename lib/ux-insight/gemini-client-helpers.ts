/** Google AI Studio / Gemini API 키 (UX 라이팅과 동일 변수명) */
export function getTrimmedGeminiApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY;
  if (raw == null || raw === "") return null;
  return raw.trim().replace(/^["']+|["']+$/g, "");
}

function redactSecrets(s: string): string {
  return s
    .replace(/\bAIza[0-9A-Za-z_-]{10,}\b/g, "AIza…")
    .replace(/\bsk-[a-zA-Z0-9_-]{10,}\b/g, "sk-…");
}

export function mapGeminiErrorToUserMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();

  if (
    low.includes("api key not valid") ||
    low.includes("invalid api key") ||
    low.includes("api_key_invalid") ||
    low.includes("permission denied") ||
    /\b401\b/.test(msg) ||
    low.includes("unauthorized")
  ) {
    return "GEMINI_API_KEY가 올바르지 않거나 만료되었습니다. Google AI Studio(https://aistudio.google.com/apikey)에서 키를 확인하고, Vercel 환경 변수 GEMINI_API_KEY에 따옴표·공백 없이 저장한 뒤 재배포하세요.";
  }
  if (
    low.includes("429") ||
    low.includes("resource exhausted") ||
    low.includes("quota") ||
    low.includes("rate limit")
  ) {
    return "Gemini 요청 한도에 도달했습니다. 잠시 후 다시 시도하세요.";
  }
  if (
    low.includes("503") ||
    low.includes("unavailable") ||
    low.includes("high demand") ||
    low.includes("currently experiencing high demand")
  ) {
    return "Gemini 모델 사용량이 높아 일시적으로 응답할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (low.includes("safety") || low.includes("blocked")) {
    return "콘텐츠 정책으로 응답이 제한되었습니다. 다른 이미지로 시도해 보세요.";
  }

  return redactSecrets(msg).slice(0, 280);
}
