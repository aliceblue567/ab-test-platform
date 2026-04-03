/** OpenAI chat 응답에서 JSON 객체 추출 */
export function extractJsonObjectFromModelText(text: string): Record<string, unknown> {
  let s = text.trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(s.slice(start, end + 1)) as Record<string, unknown>;
  }
  throw new Error("No JSON object found in model output");
}
