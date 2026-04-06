/**
 * 개선 포인트·이슈 맥락에서 개발/QA용 체크리스트 초안 (자동 생성).
 */

export function buildDevQaChecklistLines(params: {
  ux_suggestion: string;
  ux_issue_summary?: string;
  ux_priority?: string;
}): string[] {
  const lines: string[] = [];
  lines.push(
    "[플로우] 변경 후 핵심 사용자 목표까지 한 번 끝까지 동작하는지(회귀) 확인합니다."
  );
  lines.push(
    "[레이아웃] 모바일·데스크톱에서 요소 겹침, 잘림, 스크롤 트랩이 없는지 확인합니다."
  );
  lines.push(
    "[피드백] 로딩·성공·오류 상태가 300ms 이내에 시각적으로 구분되는지 확인합니다(스피너·토스트 등)."
  );
  lines.push(
    "[모달/시트] 새로 열리는 모달·바텀시트는 등장/퇴장 모션이 대략 200~400ms 범위에서 자연스러운지, 포커스 트랩·닫기 동작이 동작하는지 확인합니다."
  );
  if (params.ux_issue_summary?.trim()) {
    lines.push(
      `[재현] 다음 문제가 재발하지 않는지 확인합니다: ${params.ux_issue_summary.trim().slice(0, 160)}${params.ux_issue_summary.length > 160 ? "…" : ""}`
    );
  }
  if (params.ux_suggestion.trim()) {
    lines.push(
      `[구현 범위] 제안 반영 범위를 문서화합니다: ${params.ux_suggestion.trim().slice(0, 200)}${params.ux_suggestion.length > 200 ? "…" : ""}`
    );
  }
  if (params.ux_priority === "high") {
    lines.push(
      "[우선순위 높음] 스테이징·프로덕션 양쪽에서 스모크 테스트를 반복합니다."
    );
  }
  return lines;
}
