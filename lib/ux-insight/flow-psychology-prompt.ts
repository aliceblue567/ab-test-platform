/**
 * 멀티 스텝 플로우 전용 — 고도화 UX 심리 프레임워크 (시스템 프롬프트 보조 블록).
 * Gemini Vision 호출 시 buildUxTheoriesSystemPrompt 뒤에 덧붙입니다.
 */
export function buildFlowPsychologyFrameworkPrompt(): string {
  return `## 멀티 스텝 플로우 분석 프레임워크 (필수 적용)

다음 렌즈로 **화면 순서 전체**를 해석하세요. 전환(Transition)별 요약·점수·심리 차원에 반영합니다.

1. **Contextual continuity (맥락 연속성)**  
   이전 단계 대비 용어·레이블·시각적 위계·네비게이션이 일관되는지. 단절되면 마찰 근거로 명시.

2. **Cognitive load transition (인지부하 전이)**  
   단계 이동 시 사용자가 기억·처리해야 할 정보량이 급증하거나 줄어드는지. 급증은 ux_cognitive_spike에 반영.

3. **Behavioral principles (행동·체험 원칙)**  
   - **Peak–End Rule**: 플로우 중 가장 불쾌한 ‘피크’ 구간과 마지막 화면 체감이 전체 평가를 어떻게 왜곡할 수 있는지 한 줄로 전환 메모에 녹여 넣을 수 있음.  
   - **Zeigarnik effect (미완성 과제)**: 다음 단계로 자연스럽게 끌고 가는가, 아니면 불안·중단을 유발하는가.  
   - **Knowledge in the World**: 화면 밖 설명 없이 인터페이스만으로 과업이 이해되는가 (직관·가독성).

4. **Friction point**: 위 원칙을 근거로 ux_friction_summary에서 **구체적 UI/카피/상태**를 지목하고, ux_theory_note에 Peak-End/Zeigarnik 등 키워드와 이론 ID를 병행해 적을 수 있습니다.

5. **출력 규칙**  
   - JSON 스키마 외 루트 키를 추가하지 마세요.  
   - 선택 필드 ux_flow_hotspots: 단계별로 문제가 두드러지는 영역이 있으면 **화면 좌상단 기준 퍼센트(0~100)** 로 x_pct, y_pct와 짧은 ux_note를 제공하세요. 없으 생략 가능.`;
}
