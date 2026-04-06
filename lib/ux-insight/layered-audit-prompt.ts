/** Gemini 사용자 프롬프트에 붙이는 3계층 감사 지시 */

export function buildLayeredAuditJsonBlock(
  context: "screen" | "flow",
  options?: { flowStepCount?: number }
): string {
  const layer2note =
    context === "screen"
      ? "플로우 레이어는 **이 화면 하나만** 볼 때 예상되는 이전/다음 단계 맥락 수준으로 짧게 작성해도 됩니다."
      : "플로우 레이어는 **첨부한 화면 순서 전체**의 전환·연속성·인지부하에 집중합니다.";
  const layer3note =
    context === "screen"
      ? "서비스/전체 레이어는 이 화면이 속한 제품 목표 대비 톤·일관·전환 가치를 한두 문장 요약 수준으로 작성해도 됩니다."
      : "서비스/전체 레이어는 이 플로우가 **비즈니스·사용자 목표**에 얼마나 기여하는지 평가합니다.";

  const stepIdxRule =
    context === "flow" && options?.flowStepCount != null && options.flowStepCount > 0
      ? `- **Layer 1 (ux_audit_layer_screen)** 의 각 **ux_issue_screen** · **ux_improvement_screen** 항목에 **ux_step_index** 를 **필수**로 넣으세요. 값은 첨부 화면 순서와 동일한 0부터 시작하는 정수이며, 범위는 **0 ~ ${
          options.flowStepCount - 1
        }** 입니다. 여러 단계에 걸친 이슈면 가장 핵심인 한 단계를 선택합니다.`
      : context === "screen"
        ? "- **단일 화면** 분석일 때 Layer 1의 모든 **ux_issue_screen** · **ux_improvement_screen** 항목 **ux_step_index** 는 **0** 으로 통일합니다."
        : "";

  return `
## 3계층 UX 감사 (추가 필수)
루트에 **ux_audit_layers** 객체를 반드시 포함하세요 (기존 필드와 병행).

구조:
{
  "ux_layered_audit_version": "1.0.0",
  "ux_audit_layer_screen": {
    "ux_issue_screen": [
      { "ux_issue_screen_summary", "ux_issue_screen_why"(이론·인지 근거), "ux_step_index"(0부터 시작하는 화면 순번), 선택: ux_issue_screen_theory_note, ux_issue_screen_severity(high|medium|low), ux_issue_screen_id }
    ],
    "ux_improvement_screen": [
      { "ux_improvement_screen_action"(즉시 실행 가능), "ux_improvement_screen_impact"(기대 효과), "ux_step_index"(문제 카드와 동일 단계 권장), 선택: ux_improvement_screen_wireframe_note, ux_improvement_screen_id, ux_issue_screen_related_id }
    ]
  },
  "ux_audit_layer_flow": {
    "ux_issue_flow": [
      { "ux_issue_flow_summary", "ux_issue_flow_why", 선택: ux_issue_flow_theory_note, ux_issue_flow_severity, ux_issue_flow_transition_hint, ux_issue_flow_id }
    ],
    "ux_improvement_flow": [
      { "ux_improvement_flow_action", "ux_improvement_flow_impact", 선택: ux_improvement_flow_nav_note, ux_improvement_flow_id, ux_issue_flow_related_id }
    ]
  },
  "ux_audit_layer_system": {
    "ux_issue_total": [
      { "ux_issue_total_summary", "ux_issue_total_why", 선택: ux_issue_total_theory_note, ux_issue_total_severity, ux_issue_total_id }
    ],
    "ux_improvement_total": [
      { "ux_improvement_total_action", "ux_improvement_total_impact", 선택: ux_improvement_total_strategy_note, ux_improvement_total_id, ux_issue_total_related_id }
    ]
  }
}

규칙:
- **문제(ux_issue_*)**와 **개선(ux_improvement_*)**를 같은 레이어 안에서 명확히 구분.
- Why에는 ux_theories 근거 ID를 괄호로 인용 가능 (예: NH-04).
- 개선안은 구체적이고 실행 가능하게; Impact는 사용자·비즈니스 관점 한 줄 이상.
${stepIdxRule ? `\n${stepIdxRule}` : ""}
- ${layer2note}
- ${layer3note}`;
}
