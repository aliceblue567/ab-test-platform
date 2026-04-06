/** 외부 API로 보내기 전 자유 텍스트에서 흔한 PII·잡음 패턴을 제거(완전 보장 아님). */
const EMAIL = /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gi;
const PHONE_LOOSE =
  /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g;

export function sanitizePersonaTextForApi(input: string): string {
  return input
    .replace(EMAIL, "[redacted]")
    .replace(PHONE_LOOSE, "[redacted]")
    .trim();
}
