/**
 * Figma / 디자인 툴용 구조화 복사 텍스트 (문제점 · 이론 · 수정 지시 · 기대 효과).
 */

export type FigmaGuideBundle = {
  ux_figma_section_problem: string;
  ux_figma_section_theory: string;
  ux_figma_section_instruction: string;
  ux_figma_section_impact: string;
};

function block(title: string, body: string): string {
  const t = body.trim();
  if (!t) return `【${title}】\n(없음)`;
  return `【${title}】\n${t}`;
}

/** Figma 코멘트/콜아웃에 붙이기 좋은 한 블록 (위치·요약·가이드) */
export function buildFigmaCalloutComment(params: {
  ux_position_pct: string;
  ux_issue_summary: string;
  ux_improvement_guide: string;
  ux_qa_note?: string;
}): string {
  return [
    `📍 위치: ${params.ux_position_pct} (화면 좌상단 기준 %, 참고용)`,
    "",
    `🔍 이슈: ${params.ux_issue_summary.trim()}`,
    "",
    `✏️ 개선 가이드:\n${params.ux_improvement_guide.trim()}`,
    params.ux_qa_note
      ? `\n\n✅ QA 참고:\n${params.ux_qa_note.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatFigmaGuidePlainText(parts: FigmaGuideBundle): string {
  return [
    block("문제점 (Problem)", parts.ux_figma_section_problem),
    "",
    block("적용 이론 / 근거 (Theory)", parts.ux_figma_section_theory),
    "",
    block("수정 지시사항 (Instruction)", parts.ux_figma_section_instruction),
    "",
    block("기대 효과 (Impact)", parts.ux_figma_section_impact),
  ].join("\n");
}

/** Layer 1 — screen improvement + optional paired issue */
export function buildFigmaGuideScreen(params: {
  improvementAction: string;
  improvementImpact: string;
  improvementWireframe?: string;
  issueSummary?: string;
  issueWhy?: string;
  issueTheory?: string;
}): string {
  const problem = [params.issueSummary, params.issueWhy]
    .filter(Boolean)
    .join("\n");
  const theory = params.issueTheory?.trim() ?? "";
  const instruction = [
    params.improvementAction,
    params.improvementWireframe
      ? `[와이어프레임 메모]\n${params.improvementWireframe}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return formatFigmaGuidePlainText({
    ux_figma_section_problem: problem || "— 연결된 문제 카드가 없습니다. 레포트의 문제점을 참고해 주세요.",
    ux_figma_section_theory: theory || "— 이론 메모를 보강해 주세요.",
    ux_figma_section_instruction: instruction,
    ux_figma_section_impact: params.improvementImpact,
  });
}

export function buildFigmaGuideFlow(params: {
  improvementAction: string;
  improvementImpact: string;
  navNote?: string;
  issueSummary?: string;
  issueWhy?: string;
  issueTheory?: string;
}): string {
  const problem = [params.issueSummary, params.issueWhy]
    .filter(Boolean)
    .join("\n");
  const instruction = [params.improvementAction, params.navNote]
    .filter(Boolean)
    .join("\n\n");
  return formatFigmaGuidePlainText({
    ux_figma_section_problem: problem || "—",
    ux_figma_section_theory: params.issueTheory?.trim() ?? "—",
    ux_figma_section_instruction: instruction,
    ux_figma_section_impact: params.improvementImpact,
  });
}

export function buildFigmaGuideTotal(params: {
  improvementAction: string;
  improvementImpact: string;
  strategyNote?: string;
  issueSummary?: string;
  issueWhy?: string;
  issueTheory?: string;
}): string {
  const problem = [params.issueSummary, params.issueWhy]
    .filter(Boolean)
    .join("\n");
  const instruction = [params.improvementAction, params.strategyNote]
    .filter(Boolean)
    .join("\n\n");
  return formatFigmaGuidePlainText({
    ux_figma_section_problem: problem || "—",
    ux_figma_section_theory: params.issueTheory?.trim() ?? "—",
    ux_figma_section_instruction: instruction,
    ux_figma_section_impact: params.improvementImpact,
  });
}
