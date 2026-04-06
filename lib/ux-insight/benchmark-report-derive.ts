/**
 * 벤치마크 리포트 UI용 파생 데이터 (API 확장 없이 휴리스틱).
 */
import type { UxBenchmarkMultiV1 } from "@/lib/ux-insight/benchmark-analysis-multi-v1";
import { BENCHMARK_RADAR_LABELS } from "@/lib/ux-insight/benchmark-analysis-v1";

export const BENCHMARK_DATA_PROVENANCE =
  "AI 화면 분석 기반 · 경쟁사 비교 기반 · 추정";

export const BENCHMARK_DIMENSION_HINTS: Record<string, string> = {
  usability:
    "클릭·입력·탐색이 과업에 맞게 빠르고 오류가 적은 정도입니다. 높을수록 사용하기 쉽습니다.",
  visual_hierarchy:
    "중요 정보가 눈에 먼저 들어오고 시각적 혼란이 적은 정도입니다.",
  trust_transparency:
    "가격·약관·후기 등 신뢰를 주는 정보와 투명한 표현입니다.",
  task_efficiency:
    "목표 달성까지 단계·인지 부담이 적은 정도입니다.",
  consistency:
    "패턴·용어·버튼 위치 등 화면 간 일관성입니다.",
  content_clarity:
    "문구·라벨이 명확하고 이해 비용이 낮은 정도입니다.",
};

export type GapStatusKind = "strength" | "parity" | "improve";

export const GAP_STATUS_LABEL: Record<GapStatusKind, string> = {
  strength: "강점",
  parity: "보완 필요",
  improve: "개선 필요",
};

export type DimensionGapRow = {
  key: string;
  label: string;
  selfScore: number;
  competitorAvg: number;
  gap: number;
  status: GapStatusKind;
  statusLabel: string;
  interpretation: string;
  priorityLevel: "높음" | "중간" | "낮음";
};

export function gapToStatus(gap: number): GapStatusKind {
  if (gap >= 0.35) return "strength";
  if (gap >= -0.45) return "parity";
  return "improve";
}

function priorityFromGap(gap: number): "높음" | "중간" | "낮음" {
  if (gap <= -1) return "높음";
  if (gap <= -0.45) return "중간";
  return "낮음";
}

export function deriveDimensionGaps(
  report: UxBenchmarkMultiV1,
  selfIndex = 0
): DimensionGapRow[] {
  const keys = Object.keys(BENCHMARK_RADAR_LABELS) as (keyof typeof BENCHMARK_RADAR_LABELS)[];
  const n = report.ux_variants.length;
  if (n < 2 || selfIndex < 0 || selfIndex >= n) return [];

  return keys.map((k) => {
    const label = BENCHMARK_RADAR_LABELS[k];
    const selfScore = report.ux_variants[selfIndex]!.ux_dimension_scores[k];
    const others = report.ux_variants
      .filter((_, i) => i !== selfIndex)
      .map((v) => v.ux_dimension_scores[k]);
    const competitorAvg =
      others.reduce((s, x) => s + x, 0) / Math.max(1, others.length);
    const gap = Math.round((selfScore - competitorAvg) * 10) / 10;
    const status = gapToStatus(gap);
    const interp =
      gap >= 0.35
        ? `${label} 영역에서 경쟁사 평균보다 앞서 있습니다.`
        : gap >= -0.45
          ? `${label}은(는) 경쟁사와 비슷하거나 소폭 열위입니다. 차별 포인트를 점검하세요.`
          : `${label}에서 경쟁사 대비 체감 격차가 큽니다. 우선 개선 후보입니다.`;

    return {
      key: k,
      label,
      selfScore,
      competitorAvg: Math.round(competitorAvg * 10) / 10,
      gap,
      status,
      statusLabel: GAP_STATUS_LABEL[status],
      interpretation: interp,
      priorityLevel: priorityFromGap(gap),
    };
  });
}

export function largestGapKey(rows: DimensionGapRow[]): string | null {
  let worst: DimensionGapRow | null = null;
  for (const r of rows) {
    if (!worst || r.gap < worst.gap) worst = r;
  }
  return worst?.key ?? null;
}

export type ImprovementTask = {
  rank: number;
  title: string;
  cause: string;
  effect: string;
  difficulty: "상" | "중" | "하";
  scope: string;
  relatedFeatures: string;
  kpiHint: string;
  dimensionKey?: string;
};

export function deriveImprovementTasks(
  report: UxBenchmarkMultiV1,
  gaps: DimensionGapRow[],
  selfIndex = 0
): ImprovementTask[] {
  const sorted = [...gaps]
    .filter((g) => g.status !== "strength")
    .sort((a, b) => a.gap - b.gap);
  const feats = report.ux_feature_matrix;
  const selfRow = feats?.ux_rows.find(
    (r) => r.ux_label === report.ux_variants[selfIndex]?.ux_label
  );

  const tasks: ImprovementTask[] = [];
  let rank = 1;

  for (const g of sorted.slice(0, 4)) {
    const related =
      feats && selfRow
        ? feats.ux_features
            .filter((name, fi) => {
              if (selfRow.ux_present[fi]) return false;
              return nameIncludesDimensionHint(name, g.key);
            })
            .slice(0, 4)
            .join(", ") || "—"
        : "—";

    tasks.push({
      rank: rank++,
      title: `${g.label} 역량 강화`,
      cause: `자사 ${g.selfScore} vs 경쟁 평균 ${g.competitorAvg} (Gap ${g.gap >= 0 ? "+" : ""}${g.gap})`,
      effect: `${g.label} 관련 과업 시간·이탈을 줄이고 완료율을 높일 수 있습니다.`,
      difficulty: g.gap <= -1.2 ? "상" : g.gap <= -0.6 ? "중" : "하",
      scope: "해당 화면·유사 유형 전반",
      relatedFeatures: related,
      kpiHint: `${g.label} 설문·클릭 깊이·전환 퍼널`,
      dimensionKey: g.key,
    });
  }

  if (feats && selfRow && tasks.length < 5) {
    const missing = feats.ux_features.filter((_, fi) => !selfRow.ux_present[fi]);
    const presentCount = (fi: number) =>
      feats.ux_rows.filter((r) => r.ux_present[fi]).length;
    for (const name of missing) {
      const fi = feats.ux_features.indexOf(name);
      if (fi < 0) continue;
      const cnt = presentCount(fi);
      if (cnt < report.ux_variants.length - 1) continue;
      if (tasks.some((t) => t.title.includes(name.slice(0, 8)))) continue;
      tasks.push({
        rank: rank++,
        title: `「${name}」도입·보강`,
        cause: "경쟁사 대부분에 존재하나 자사 화면에서 확인되지 않았습니다.",
        effect: "탐색·신뢰·전환 중 해당 기능이 담당하는 가치를 보완합니다.",
        difficulty: inferDifficultyFromFeatureName(name),
        scope: "관련 진입·목록·상세",
        relatedFeatures: name,
        kpiHint: "클릭률, 예약·신청 전환, 체류 시간",
      });
      if (tasks.length >= 6) break;
    }
  }

  return tasks.slice(0, 6).map((t, i) => ({ ...t, rank: i + 1 }));
}

function nameIncludesDimensionHint(name: string, dimKey: string): boolean {
  const n = name.toLowerCase();
  const map: Record<string, RegExp> = {
    usability: /필터|검색|탐색|정렬|메뉴|네비|입력|폼/i,
    visual_hierarchy: /위계|강조|배너|히어로|카드|레이아웃/i,
    trust_transparency: /후기|평점|인증|보증|약관|가격|투명/i,
    task_efficiency: /원클릭|단계|예약|결제|바로|단축/i,
    consistency: /공통|패턴|gnb|푸터|용어/i,
    content_clarity: /설명|안내|라벨|문구|도움말/i,
  };
  return map[dimKey]?.test(name) ?? false;
}

function inferDifficultyFromFeatureName(name: string): "상" | "중" | "하" {
  const t = name.toLowerCase();
  if (/ai|개인화|추천|머신|학습|통합.?플랫폼/i.test(t)) return "상";
  if (/필터|정렬|탭|배지|문구|배너|툴팁/i.test(t)) return "하";
  return "중";
}

export type FeatureBadgeKind =
  | "필수"
  | "차별화"
  | "Nice to Have"
  | "경쟁 우위"
  | "빠른 적용 가능";

export type EnrichedFeatureRow = {
  feature: string;
  present: boolean[];
  category: "개인화" | "탐색" | "신뢰" | "전환" | "기타";
  importance: "높음" | "중간" | "낮음";
  userImpact: "높음" | "중간" | "낮음";
  hasCompetitiveEdge: boolean;
  adoptionNeed: "매우 높음" | "높음" | "중간" | "낮음";
  difficulty: "상" | "중" | "하";
  expectedEffect: string;
  badges: FeatureBadgeKind[];
};

function inferFeatureCategory(name: string): EnrichedFeatureRow["category"] {
  const t = name.toLowerCase();
  if (/개인화|추천|맞춤|ai/i.test(t)) return "개인화";
  if (/필터|검색|탐색|정렬|카테고리|지도/i.test(t)) return "탐색";
  if (/후기|평점|인증|보증|신뢰|알림/i.test(t)) return "신뢰";
  if (/예약|결제|장바구니|할인|쿠폰|전환|cta|혜택/i.test(t)) return "전환";
  return "기타";
}

export function enrichFeatureMatrix(
  report: UxBenchmarkMultiV1,
  selfIndex = 0
): EnrichedFeatureRow[] | null {
  const m = report.ux_feature_matrix;
  if (!m || m.ux_features.length === 0) return null;

  const vCount = report.ux_variants.length;
  return m.ux_features.map((feature, fi) => {
    const present = m.ux_rows.map((r) => !!r.ux_present[fi]);
    const selfHas = !!present[selfIndex];
    const othersHave = present.filter((_, i) => i !== selfIndex && present[i]).length;
    const othersTotal = Math.max(1, vCount - 1);
    const shareOthers = othersHave / othersTotal;

    let importance: EnrichedFeatureRow["importance"] = "중간";
    let adoptionNeed: EnrichedFeatureRow["adoptionNeed"] = "중간";
    if (!selfHas && shareOthers >= 0.67) {
      importance = "높음";
      adoptionNeed = shareOthers >= 0.9 ? "매우 높음" : "높음";
    } else if (!selfHas && shareOthers >= 0.34) {
      importance = "중간";
      adoptionNeed = "높음";
    } else if (selfHas && othersHave === 0) {
      importance = "중간";
      adoptionNeed = "낮음";
    } else {
      adoptionNeed = "낮음";
    }

    const userImpact: EnrichedFeatureRow["userImpact"] =
      importance === "높음" ? "높음" : importance === "중간" ? "중간" : "낮음";

    const hasCompetitiveEdge = selfHas && othersHave < othersTotal * 0.5;
    const difficulty = inferDifficultyFromFeatureName(feature);
    const category = inferFeatureCategory(feature);

    const badges: FeatureBadgeKind[] = [];
    if (!selfHas && shareOthers >= 0.67) badges.push("필수");
    if (hasCompetitiveEdge) badges.push("경쟁 우위");
    if (selfHas && othersHave === othersTotal) badges.push("차별화");
    if (difficulty === "하" && !selfHas && shareOthers >= 0.5)
      badges.push("빠른 적용 가능");
    if (
      !badges.includes("필수") &&
      !hasCompetitiveEdge &&
      category === "기타" &&
      shareOthers < 0.5
    ) {
      badges.push("Nice to Have");
    }

    const expectedEffect =
      category === "전환"
        ? "전환·신청 완료율 개선 기대"
        : category === "탐색"
          ? "탐색 시간 단축·상세 진입 증가 기대"
          : category === "신뢰"
            ? "신뢰도·재방문·비교 선택 유리 기대"
            : category === "개인화"
              ? "클릭률·체류·재탐색 개선 기대"
              : "UX 완성도·일관성 개선 기대";

    return {
      feature,
      present,
      category,
      importance,
      userImpact,
      hasCompetitiveEdge,
      adoptionNeed,
      difficulty,
      expectedEffect,
      badges: badges.length ? badges : ["Nice to Have"],
    };
  });
}

export type SwotStrategyBlock = {
  title: string;
  items: string[];
  toneClass: string;
};

export function deriveSwotStrategyBlocks(
  swot: UxBenchmarkMultiV1["ux_variants"][0]["ux_swot"]
): SwotStrategyBlock[] {
  const prefix = (s: string, p: string) =>
    s.toLowerCase().startsWith(p.toLowerCase()) ? s : `${p} ${s}`;

  return [
    {
      title: "Strength 활용",
      items: swot.strengths.map((x) => prefix(x, "·")),
      toneClass: "border-emerald-500/30 bg-emerald-500/[0.06]",
    },
    {
      title: "Weakness 개선",
      items: swot.weaknesses.map((x) => prefix(x, "·")),
      toneClass: "border-amber-500/35 bg-amber-500/[0.07]",
    },
    {
      title: "Opportunity 활용",
      items: swot.opportunities.map((x) => prefix(x, "·")),
      toneClass: "border-sky-500/30 bg-sky-500/[0.06]",
    },
    {
      title: "Threat 대응",
      items: swot.threats.map((x) => prefix(x, "·")),
      toneClass: "border-red-500/25 bg-red-500/[0.05]",
    },
  ];
}
