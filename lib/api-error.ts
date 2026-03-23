/**
 * Supabase PostgrestError 등은 Error를 상속하지 않아
 * `e instanceof Error ? e.message : "Internal error"` 로는 메시지가 사라집니다.
 */
export function toApiErrorMessage(e: unknown): string {
  if (e instanceof Error && typeof e.message === "string" && e.message) {
    return e.message;
  }
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    const code = o.code;
    const details = o.details;
    const hint = o.hint;
    const parts: string[] = [];
    if (typeof code === "string" && code) parts.push(code);
    if (typeof msg === "string" && msg) parts.push(msg);
    if (typeof details === "string" && details) parts.push(details);
    if (typeof hint === "string" && hint) parts.push(hint);
    if (parts.length > 0) return parts.join(" — ");
  }
  if (typeof e === "string" && e.trim()) return e.trim();
  return "알 수 없는 오류가 발생했습니다.";
}
