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

/** UI 태그 — 적용 아이디어 카드/필터용 */
export type ApplyIdeaTag =
  | "탐색"
  | "신뢰"
  | "개인화"
  | "전환"
  | "혜택"
  | "후기"
  | "필터"
  | "추천"
  | "CTA"
  | "정보 구조";

export type IdeaPriorityBand = "Critical" | "High" | "Medium" | "Low";

export type CompetitorApplyBeforeAfter = {
  beforeSummary: string;
  afterSummary: string;
  changePoints: string[];
  whyImportant: string;
};

export type CompetitorApplyIdea = {
  id: string;
  gapKey: string;
  /** 축 한글 라벨 (예: 사용성) */
  dimensionLabel: string;
  gapRank: number;
  /** 대표 경쟁 라벨 (표시용) */
  competitorLabelSample: string;
  competitorStrength: string;
  ourCurrentState: string;
  problem: string;
  applicationIdea: string;
  expectedEffects: string[];
  difficulty: "상" | "중" | "하";
  estimatedResource: string;
  relatedScreen: string;
  relatedKpis: string[];
  priority: IdeaPriorityBand;
  tags: ApplyIdeaTag[];
  beforeAfter: CompetitorApplyBeforeAfter;
  quickWin: boolean;
  highKpiImpact: boolean;
  devRisk: boolean;
};

function gapToIdeaPriority(gap: number): IdeaPriorityBand {
  if (gap <= -1.35) return "Critical";
  if (gap <= -0.85) return "High";
  if (gap <= -0.45) return "Medium";
  return "Low";
}

function resourceFromDifficulty(d: "상" | "중" | "하"): string {
  if (d === "하") return "0.5~1 Sprint";
  if (d === "중") return "1~2 Sprint";
  return "2~4 Sprint";
}

function pickMatchingSwotLine(
  lines: string[],
  dimKey: string
): string | null {
  const re =
    dimKey === "usability"
      ? /탐색|검색|필터|속도|편의|사용|입력|클릭/i
      : dimKey === "visual_hierarchy"
        ? /레이아웃|위계|강조|시각|카드|배치/i
        : dimKey === "trust_transparency"
          ? /신뢰|후기|평점|투명|가격|인증/i
          : dimKey === "task_efficiency"
            ? /효율|단계|빠르|원클릭|단순/i
            : dimKey === "consistency"
              ? /일관|패턴|통일/i
              : /명확|문구|라벨|이해|설명/i;
  const hit = lines.find((l) => re.test(l));
  return hit ?? lines[0] ?? null;
}

function dimDifficultyFromGap(gap: number): "상" | "중" | "하" {
  if (gap <= -1.2) return "상";
  if (gap <= -0.55) return "중";
  return "하";
}

function relatedScreenForDim(dimKey: string): string {
  const m: Record<string, string> = {
    usability: "검색·목록·핵심 과업 화면",
    visual_hierarchy: "홈·목록·상세 (정보 위계)",
    trust_transparency: "상품 카드·상세·리뷰·결제 주변",
    task_efficiency: "예약·신청·결제 플로우",
    consistency: "GNB·공통 패턴이 있는 주요 화면",
    content_clarity: "폼·안내·가격·조건 설명 구간",
  };
  return m[dimKey] ?? "이번에 비교한 핵심 화면";
}

function kpisForDim(dimKey: string): string[] {
  const m: Record<string, string[]> = {
    usability: ["과업 완료율", "클릭 깊이", "검색 이탈률"],
    visual_hierarchy: ["스크롤 도달률", "주요 CTA CTR"],
    trust_transparency: ["상세 진입률", "장바구니·예약 전환", "이탈률"],
    task_efficiency: ["전환율", "단계 이탈률", "소요 시간"],
    consistency: ["재방문", "지원 문의율", "오류 재시도"],
    content_clarity: ["폼 완료율", "도움말 열람", "이탈률"],
  };
  return m[dimKey] ?? ["핵심 전환", "이탈률", "만족도"];
}

function ideaTemplateForDim(dimKey: string, label: string): string {
  const t: Record<string, string> = {
    usability:
      "검색·목록 상단에 sticky quick filter(또는 자주 쓰는 조건 chip)을 두고, 현재 적용 조건을 항상 노출해 재진입 없이 수정 가능하게 합니다.",
    visual_hierarchy:
      "1·2차 정보만 카드·헤더에 묶어 스캔 가능한 덩어리로 재배치하고, 보조 정보는 접기/Tap으로 분리합니다.",
    trust_transparency:
      "목록·카드 단계에서 가격·후기 요약·혜택·재고/좌석 같은 신뢰 신호를 1차로 노출해 상세 진입 전 비교가 되게 합니다.",
    task_efficiency:
      "선택값을 하단 sticky summary나 인라인에 고정해 뒤로가기·재입력을 줄이고, 다음 단계 추천을 명시합니다.",
    consistency:
      "동일 과업의 CTA·용어·필터 위치를 패턴화하고, 레이블·아이콘을 가이드에 맞춰 통일합니다.",
    content_clarity:
      "필수 조건은 짧은 문장+예시로 제시하고, 장문 정책은 섹션 단위 아코디언으로 나눕니다.",
  };
  return (
    t[dimKey] ??
    `${label} 관점에서 경쟁사 대비 밀도가 높은 정보·피드백을 동등 수준으로 맞춥니다.`
  );
}

function effectsForDim(dimKey: string): string[] {
  const m: Record<string, string[]> = {
    usability: [
      "탐색·수정 시간 감소",
      "필터/조건 재진입 감소",
      "검색 이탈률 감소",
    ],
    visual_hierarchy: [
      "핵심 정보 인지 속도 향상",
      "불필요한 스크롤 감소",
      "주요 행동 전환 유도",
    ],
    trust_transparency: [
      "조기 신뢰 형성",
      "상세 클릭 품질·전환 개선",
      "비교·선택 부담 완화",
    ],
    task_efficiency: [
      "단계 이탈 감소",
      "과업 소요 시간 단축",
      "전환·완료율 개선",
    ],
    consistency: [
      "학습 비용 감소",
      "실수·문의 감소",
      "브랜드 신뢰 체감 개선",
    ],
    content_clarity: [
      "이해 비용 감소",
      "폼 오류·중단 감소",
      "정책 문의 감소",
    ],
  };
  return m[dimKey] ?? ["핵심 지표 개선 기대"];
}

function beforeAfterForDim(
  dimKey: string,
  label: string
): CompetitorApplyBeforeAfter {
  const m: Record<string, CompetitorApplyBeforeAfter> = {
    usability: {
      beforeSummary:
        "필터·정렬은 별도 레이어로 들어가야 하고, 현재 선택 조건이 화면에 지속 표시되지 않아 수정 시 흐름이 끊깁니다.",
      afterSummary:
        "목록 상단에 sticky filter bar와 선택 조건 chip을 두어, 스크롤 중에도 조건을 보고 즉시 수정할 수 있습니다.",
      changePoints: [
        "필터 접근 속도 향상",
        "조건 변경 비용 감소",
        "탐색 맥락 유지",
      ],
      whyImportant:
        "탐색 중 조건 변경이 잦을수록 노출·수정 비용이 이탈로 직결됩니다.",
    },
    trust_transparency: {
      beforeSummary:
        "상품 카드에는 가격 중심만 보이고 후기·혜택·잔여 수량 등은 상세 진입 후에야 확인됩니다.",
      afterSummary:
        "카드에 가격·후기 요약·혜택·잔여·예약 수 등 핵심 신뢰 신호를 함께 노출해 목록에서 비교가 가능합니다.",
      changePoints: [
        "신뢰 요소 조기 노출",
        "목록 단계 비교 효율 증가",
        "불필요한 상세 왕복 감소",
      ],
      whyImportant:
        "신뢰 정보가 늦게 보일수록 사용자는 경쟁 목록으로 이동하기 쉽습니다.",
    },
    task_efficiency: {
      beforeSummary:
        "선택값이 화면마다 흩어져 있고 이전 단계로 돌아가야 수정이 가능한 구조입니다.",
      afterSummary:
        "선택 요약을 sticky 영역에 고정하고 각 단계에서 인라인 수정·검증을 허용합니다.",
      changePoints: [
        "뒤로가기·재입력 감소",
        "단계 간 맥락 유지",
        "완료까지 인지 부담 감소",
      ],
      whyImportant:
        "과업이 길수록 중간 수정 비용이 완료율을 좌우합니다.",
    },
    visual_hierarchy: {
      beforeSummary:
        "정보 밀도는 비슷하지만 시선이 분산되어 주요 행동(CTA)까지 도달하는 데 스크롤·탐색이 많습니다.",
      afterSummary:
        "히어로·카드·보조 정보의 위계를 재정렬하고 CTA 섹션을 고정 요약과 맞춥니다.",
      changePoints: [
        "주목 순서 명확화",
        "스캔 경로 단축",
        "행동 유도 일관성",
      ],
      whyImportant:
        "위계가 약하면 같은 기능이라도 ‘찾기 어렵다’는 인상으로 이어집니다.",
    },
    consistency: {
      beforeSummary:
        "같은 의미의 버튼·필터 위치가 화면마다 달라 다음 화면 예측이 어렵습니다.",
      afterSummary:
        "공통 네비·필터·CTA 패턴을 DS에 맞춰 정렬하고 레이블을 통일합니다.",
      changePoints: [
        "학습 비용 감소",
        "실수·되돌리기 감소",
        "브랜드 일관성 강화",
      ],
      whyImportant:
        "일관성은 체감 속도와 신뢰에 동시에 영향을 줍니다.",
    },
    content_clarity: {
      beforeSummary:
        "조건·요금·취소 규칙이 한 덩어리로 길게 노출되어 스캔이 어렵습니다.",
      afterSummary:
        "핵심 조건을 요약 카드로 먼저 보여주고 세부는 단계·아코디언으로 분리합니다.",
      changePoints: [
        "이해 비용 감소",
        "문의·이탈 감소",
        "의사결정 속도 향상",
      ],
      whyImportant:
        "복잡한 문구는 이탈과 CS 비용을 동시에 키웁니다.",
    },
  };
  return (
    m[dimKey] ?? {
      beforeSummary: `「${label}」 영역에서 정보·피드백 밀도가 경쟁 대비 낮게 느껴집니다.`,
      afterSummary:
        "경쟁사에서 관찰된 밀도·패턴을 참고해 동등 수준의 정보 설계를 적용합니다.",
      changePoints: [
        "정보량·접근성 균형",
        "과업 맥락 유지",
        "다음 행동 명확화",
      ],
      whyImportant:
        "동일 과업에서 격차가 나면 사용자는 경쟁 서비스로 쉽게 전환합니다.",
    }
  );
}

function tagsForDim(dimKey: string): ApplyIdeaTag[] {
  const map: Record<string, ApplyIdeaTag[]> = {
    usability: ["탐색", "필터", "정보 구조"],
    visual_hierarchy: ["정보 구조", "CTA"],
    trust_transparency: ["신뢰", "후기", "혜택"],
    task_efficiency: ["전환", "CTA"],
    consistency: ["정보 구조", "CTA"],
    content_clarity: ["정보 구조", "CTA"],
  };
  return map[dimKey] ?? ["정보 구조"];
}

function mergeTagsFromText(text: string, base: ApplyIdeaTag[]): ApplyIdeaTag[] {
  const set = new Set(base);
  const rules: [RegExp, ApplyIdeaTag][] = [
    [/추천|개인화|맞춤/i, "개인화"],
    [/추천/i, "추천"],
    [/혜택|쿠폰|할인/i, "혜택"],
    [/후기|평점/i, "후기"],
    [/필터|정렬|검색/i, "필터"],
    [/sticky|퀵|quick/i, "탐색"],
    [/cta|행동|버튼/i, "CTA"],
    [/전환|예약|결제/i, "전환"],
    [/신뢰|투명/i, "신뢰"],
  ];
  for (const [re, tag] of rules) {
    if (re.test(text)) set.add(tag);
  }
  return [...set].slice(0, 6);
}

/**
 * Gap이 큰 순(자사 열위)으로 타사 강점을 자사 적용 아이디어로 풀어 씁니다.
 */
export function deriveCompetitorApplyIdeas(
  report: UxBenchmarkMultiV1,
  gaps: DimensionGapRow[],
  selfIndex = 0
): CompetitorApplyIdea[] {
  const n = report.ux_variants.length;
  if (n < 2) return [];

  const self = report.ux_variants[selfIndex]!;
  const competitors = report.ux_variants.filter((_, i) => i !== selfIndex);
  const compStrengthPool = competitors.flatMap((v) => v.ux_swot.strengths);
  const sampleLabel =
    competitors[0]?.ux_label ?? "경쟁사";
  const compNames = competitors.map((v) => v.ux_label).join(", ");

  const behind = [...gaps]
    .filter((g) => g.gap < -0.05)
    .sort((a, b) => a.gap - b.gap);
  const slice = behind.slice(0, 8);

  return slice.map((g, i) => {
    const strengthLine = pickMatchingSwotLine(compStrengthPool, g.key);
    const weakPick = pickMatchingSwotLine(self.ux_swot.weaknesses, g.key);
    const difficulty = dimDifficultyFromGap(g.gap);
    const priority = gapToIdeaPriority(g.gap);
    const idea = ideaTemplateForDim(g.key, g.label);
    const tags = mergeTagsFromText(idea + (strengthLine ?? ""), tagsForDim(g.key));

    const competitorStrength = strengthLine
      ? `${sampleLabel} 등 경쟁 화면(${compNames})에서 「${g.label}」가 ${g.competitorAvg.toFixed(1)}점으로 자사(${g.selfScore.toFixed(1)})보다 높게 평가되었습니다. 관찰된 강점: ${strengthLine}`
      : `${compNames}은(는) 「${g.label}」 영역에서 평균 ${g.competitorAvg.toFixed(1)}점으로, 자사(${g.selfScore.toFixed(1)}) 대비 체감 우위가 있습니다. 화면에서 정보·상호작용 밀도가 더 높게 추정됩니다.`;

    const ourCurrentState = weakPick
      ? `자사 관점: ${weakPick}`
      : `${g.label} 측면에서 추가 확인·단계가 필요한 구조로 보이며, 경쟁 대비 정보 전달 효율이 낮게 나타났습니다.`;

    return {
      id: `apply-${g.key}-${i}`,
      gapKey: g.key,
      dimensionLabel: g.label,
      gapRank: i + 1,
      competitorLabelSample: sampleLabel,
      competitorStrength,
      ourCurrentState,
      problem: g.interpretation,
      applicationIdea: idea,
      expectedEffects: effectsForDim(g.key),
      difficulty,
      estimatedResource: resourceFromDifficulty(difficulty),
      relatedScreen: relatedScreenForDim(g.key),
      relatedKpis: kpisForDim(g.key),
      priority,
      tags,
      beforeAfter: beforeAfterForDim(g.key, g.label),
      quickWin: difficulty === "하",
      highKpiImpact: priority === "Critical" || priority === "High",
      devRisk: difficulty === "상",
    };
  });
}

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
