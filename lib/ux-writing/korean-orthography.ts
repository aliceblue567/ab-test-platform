export type KoreanOrthographyMatch = {
  ruleId: string;
  original: string;
  replacement: string;
  evidence: string;
};

type ExactCorrection = KoreanOrthographyMatch & {
  pattern: RegExp;
};

/**
 * 사용자 승인(2026-09-04)을 받은 명백한 표기만 로컬에서 확정한다.
 * 의미나 문맥에 따라 달라지는 표현은 이 목록에 추가하지 않는다.
 */
const EXACT_CORRECTIONS: ExactCorrection[] = [
  {
    ruleId: "KOR-ORTH-MORPH-004",
    original: "눈꼽",
    replacement: "눈곱",
    pattern: /눈꼽/g,
    evidence: "국립국어원 2025 한국어-외국어 병렬 말뭉치 구축 지침의 규범 표기 예",
  },
  {
    ruleId: "KOR-ORTH-MISC-001",
    original: "몇일",
    replacement: "며칠",
    pattern: /몇일(?=$|[\s,.!?…])/g,
    evidence: "국립국어원 현행 한글 맞춤법·공식 사전 표기",
  },
  {
    ruleId: "KOR-ORTH-MISC-002",
    original: "몇 일",
    replacement: "며칠",
    pattern: /몇 일(?=$|[\s,.!?…])/g,
    evidence: "국립국어원 2025 한국어-외국어 병렬 말뭉치 구축 지침의 규범 표기 예",
  },
  {
    ruleId: "KOR-ORTH-MORPH-001",
    original: "할께요",
    replacement: "할게요",
    pattern: /할께요/g,
    evidence: "국립국어원 현행 한글 맞춤법·공식 사전 표기",
  },
  {
    ruleId: "KOR-ORTH-MORPH-002",
    original: "오랫만",
    replacement: "오랜만",
    pattern: /오랫만/g,
    evidence: "국립국어원 현행 한글 맞춤법·공식 사전 표기",
  },
  {
    ruleId: "KOR-ORTH-MORPH-003",
    original: "웬지",
    replacement: "왠지",
    pattern: /웬지/g,
    evidence: "국립국어원 현행 한글 맞춤법·공식 사전 표기",
  },
  {
    ruleId: "KOR-ORTH-MORPH-005",
    original: "머릿말",
    replacement: "머리말",
    pattern: /머릿말/g,
    evidence: "국립국어원 2025 한국어-외국어 병렬 말뭉치 구축 지침의 규범 표기 예",
  },
  {
    ruleId: "KOR-ORTH-MORPH-006",
    original: "진척율",
    replacement: "진척률",
    pattern: /진척율/g,
    evidence: "국립국어원 2025 한국어-외국어 병렬 말뭉치 구축 지침의 규범 표기 예",
  },
];

export function checkKoreanOrthography(text: string): {
  correctedText: string;
  matches: KoreanOrthographyMatch[];
} {
  let correctedText = text;
  const matches: KoreanOrthographyMatch[] = [];

  for (const correction of EXACT_CORRECTIONS) {
    correction.pattern.lastIndex = 0;
    if (!correction.pattern.test(correctedText)) continue;

    matches.push({
      ruleId: correction.ruleId,
      original: correction.original,
      replacement: correction.replacement,
      evidence: correction.evidence,
    });
    correction.pattern.lastIndex = 0;
    correctedText = correctedText.replace(
      correction.pattern,
      correction.replacement
    );
  }

  return { correctedText, matches };
}

export function formatKoreanOrthographyMatches(
  matches: KoreanOrthographyMatch[]
): string {
  return matches
    .map(
      (match) =>
        `${match.ruleId} ${match.original} → ${match.replacement} (${match.evidence})`
    )
    .join(", ");
}
