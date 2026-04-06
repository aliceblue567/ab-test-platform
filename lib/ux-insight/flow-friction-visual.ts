/**
 * 플로우 전환 마찰은 스키마상 1~5. UI/신호등은 1~10 체감 스케일로 매핑합니다.
 */
export type FrictionTier = "green" | "yellow" | "red";

/** 1~5 → 2,4,6,8,10 (1~3 녹 / 4~6 황 / 7~10 적 구간과 정렬) */
export function friction5ToDisplay10(score: number): number {
  const s = Math.min(5, Math.max(1, Math.round(Number(score)) || 3));
  return Math.min(10, Math.max(1, s * 2));
}

export function frictionDisplay10ToTier(score10: number): FrictionTier {
  const s = Math.min(10, Math.max(1, Math.round(score10)));
  if (s <= 3) return "green";
  if (s <= 6) return "yellow";
  return "red";
}

export function friction5ToTier(score5: number): FrictionTier {
  return frictionDisplay10ToTier(friction5ToDisplay10(score5));
}

/** 카드 좌측 보더 + 배지 톤 */
export function tierBorderClass(tier: FrictionTier): string {
  switch (tier) {
    case "green":
      return "border-l-emerald-600";
    case "yellow":
      return "border-l-amber-500";
    case "red":
      return "border-l-destructive";
  }
}

export function tierPinClasses(tier: FrictionTier): string {
  switch (tier) {
    case "green":
      return "bg-emerald-500 ring-2 ring-emerald-200 shadow-md";
    case "yellow":
      return "bg-amber-500 ring-2 ring-amber-200 shadow-md";
    case "red":
      return "bg-red-600 ring-2 ring-red-200 shadow-md";
  }
}

export function tierBadgeClass(tier: FrictionTier): string {
  switch (tier) {
    case "green":
      return "bg-emerald-600 text-white";
    case "yellow":
      return "bg-amber-500 text-black";
    case "red":
      return "bg-red-600 text-white";
  }
}

export function tierLabelKo(tier: FrictionTier): string {
  switch (tier) {
    case "green":
      return "유지·강화";
    case "yellow":
      return "주의·모니터링";
    case "red":
      return "즉시 수정";
  }
}
