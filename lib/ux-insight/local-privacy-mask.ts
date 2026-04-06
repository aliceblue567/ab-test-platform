/**
 * [검토용 스텁] 브라우저에서 스크린샷 민감 영역 자동 블러.
 * 실제 제품화 시: OCR/휴리스틱·사용자 드로잉 마스크와 결합.
 */
export type PrivacyMaskRegion = {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  reason: "numeric_guess" | "user_draw";
};

/** 현재는 항상 빈 배열 — 추후 canvas 파이프라인에서 채움 */
export function suggestPrivacyMaskRegions(_imageDataUrl: string): PrivacyMaskRegion[] {
  return [];
}
