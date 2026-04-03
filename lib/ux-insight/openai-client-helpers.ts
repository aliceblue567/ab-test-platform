import {
  APIError,
  AuthenticationError,
  RateLimitError,
} from "openai";

/** 환경 변수에 붙은 공백·따옴표 제거 */
export function getTrimmedOpenAiApiKey(): string | null {
  const raw = process.env.OPENAI_API_KEY;
  if (raw == null || raw === "") return null;
  return raw.trim().replace(/^["']+|["']+$/g, "");
}

/** 클라이언트에 내려도 되는 짧은 안전 메시지 (키 노출 금지) */
export function mapOpenAiErrorToUserMessage(err: unknown): string {
  if (err instanceof AuthenticationError) {
    return "OpenAI API 키가 올바르지 않거나 만료되었습니다. 배포 환경의 OPENAI_API_KEY를 확인하세요. platform.openai.com/api-keys 에서 새 키를 발급하고, 값 앞뒤 공백·따옴표 없이 저장한 뒤 재배포합니다.";
  }
  if (err instanceof RateLimitError) {
    return "OpenAI 요청 한도에 도달했습니다. 잠시 후 다시 시도하세요.";
  }
  if (err instanceof APIError) {
    if (err.status === 402) {
      return "OpenAI 결제·크레딧을 확인하세요.";
    }
    if (err.status === 403) {
      return "OpenAI API 접근이 거부되었습니다. 키 권한·조직 설정을 확인하세요.";
    }
    const m = err.message ?? "";
    return redactOpenAiSecrets(m).slice(0, 280);
  }
  if (err instanceof Error) {
    return redactOpenAiSecrets(err.message).slice(0, 280);
  }
  return "분석 중 오류가 발생했습니다.";
}

function redactOpenAiSecrets(s: string): string {
  return s
    .replace(/\bsk-[a-zA-Z0-9_-]{10,}\b/g, "sk-…")
    .replace(/\bsk-proj-[a-zA-Z0-9_-]{10,}\b/g, "sk-proj-…");
}
