/**
 * AI가 ux_issue_detail / ux_evidence 에 넣은 근거 ID 파싱 (NH-01, LUX-FITTS, TP-05 등)
 */
const ID_PATTERN =
  /\b(NH-\d{2}|LUX-[A-Z-]+|BE-[A-Z0-9-]+|TP-\d{2}|UXT-\d{2})\b/g;

export function extractTheoryRefs(...texts: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    let m: RegExpExecArray | null;
    const re = new RegExp(ID_PATTERN.source, "g");
    while ((m = re.exec(t)) !== null) {
      seen.add(m[1]);
    }
  }
  return [...seen];
}
