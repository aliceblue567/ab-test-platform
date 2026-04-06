/**
 * 플로우 분석 JSON에서 리포트 UI용 파생 데이터(위계·우선순위·태그).
 * 신규 API 필드 없이 휴리스틱으로 채웁니다.
 */
import type { UxAuditLayers } from "@/lib/ux-insight/layered-audit-v1";
import type { UxFlowAnalysisV1 } from "@/lib/ux-insight/flow-analysis-v1";
import { friction5ToTier } from "@/lib/ux-insight/flow-friction-visual";

export type StepHealthStatus = "ok" | "watch" | "problem";
export type ChurnRisk = "low" | "medium" | "high";
export type PriorityLevel = "critical" | "high" | "medium" | "low";

export function frictionToPriority(score: number): PriorityLevel {
  const s = Math.min(5, Math.max(1, Math.round(Number(score)) || 1));
  if (s >= 5) return "critical";
  if (s >= 4) return "high";
  if (s >= 3) return "medium";
  return "low";
}

export function priorityLabelKo(p: PriorityLevel): string {
  switch (p) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}

/** 전환·이슈 텍스트에서 문제 유형 태그 추정 */
export function inferProblemTag(text: string): string {
  const t = text.toLowerCase();
  if (/검색|목록|탐색|browse|search|filter/.test(t)) return "탐색";
  if (/입력|폼|필드|textarea|선택|드롭다운/.test(t)) return "입력";
  if (/인지|이해|혼란|복잡|인지부하/.test(t)) return "인지";
  if (/피드백|로딩|오류|알림|에러|스켈레톤/.test(t)) return "피드백";
  if (/이동|뒤로|경로|내비|단계|breadcrumb|이전/.test(t)) return "내비게이션";
  return "인지";
}

export function connectorStrokeForFriction(friction: number): string {
  const tier = friction5ToTier(friction);
  if (tier === "red") return "#dc2626";
  if (tier === "yellow") return "#ca8a04";
  return "#16a34a";
}

export type DerivedStepJourney = {
  stepIndex: number;
  label: string;
  keyAction: string;
  status: StepHealthStatus;
  statusLabelKo: string;
  churnRisk: ChurnRisk;
  churnLabelKo: string;
  problemRateLabel: string;
  maxFriction: number;
  hoverDetail: string;
};

const STATUS_KO: Record<StepHealthStatus, string> = {
  ok: "정상",
  watch: "주의",
  problem: "문제",
};

const CHURN_KO: Record<ChurnRisk, string> = {
  low: "낮음",
  medium: "중간",
  high: "높음",
};

export function deriveStepJourney(flow: UxFlowAnalysisV1): DerivedStepJourney[] {
  const transitionIn = new Map<
    number,
    UxFlowAnalysisV1["ux_transitions"][0]
  >();
  const transitionOut = new Map<
    number,
    UxFlowAnalysisV1["ux_transitions"][0]
  >();
  for (const tr of flow.ux_transitions) {
    transitionOut.set(tr.ux_from_step, tr);
    transitionIn.set(tr.ux_to_step, tr);
  }

  return flow.ux_steps.map((s) => {
    const i = s.ux_step_index;
    const inc = transitionIn.get(i);
    const out = transitionOut.get(i);
    const scores = [inc?.ux_friction_score, out?.ux_friction_score].filter(
      (x): x is number => typeof x === "number"
    );
    const maxF = scores.length > 0 ? Math.max(...scores) : 1;

    let status: StepHealthStatus = "ok";
    let churn: ChurnRisk = "low";
    if (maxF >= 4) {
      status = "problem";
      churn = "high";
    } else if (maxF >= 3) {
      status = "watch";
      churn = "medium";
    }

    const problemRateLabel = maxF >= 4 ? "높음" : maxF >= 3 ? "중간" : "낮음";

    const parts: string[] = [];
    parts.push(`핵심 행동: ${s.ux_one_line_summary}`);
    if (inc) {
      parts.push(
        `이전 화면(${inc.ux_from_step}) → 현재: 마찰 ${inc.ux_friction_score}/5\n${inc.ux_friction_summary}`
      );
    }
    if (out) {
      parts.push(
        `현재 → 다음(${out.ux_to_step}): 마찰 ${out.ux_friction_score}/5\n${out.ux_friction_summary}`
      );
    }

    return {
      stepIndex: i,
      label: s.ux_step_label,
      keyAction: s.ux_one_line_summary,
      status,
      statusLabelKo: STATUS_KO[status],
      churnRisk: churn,
      churnLabelKo: CHURN_KO[churn],
      problemRateLabel,
      maxFriction: maxF,
      hoverDetail: parts.join("\n\n"),
    };
  });
}

export function userImpactFromDimensions(
  d: UxFlowAnalysisV1["ux_transitions"][0]["ux_psychological_dimensions"]
): string {
  const eg = d.ux_expectation_gap;
  const cs = d.ux_cognitive_spike;
  const ef = d.ux_emotional_friction;
  const high = Math.max(eg, cs, ef);
  if (high >= 4) {
    return "기대와 경험 괴리·인지 부담이 커 목표 완수가 지연되거나 이탈 위험이 큽니다.";
  }
  if (high >= 3) {
    return "일부 구간에서 추가 확인·재시도가 필요해 과업 시간이 늘어날 수 있습니다.";
  }
  return "전반적으로 과업 진행에 큰 방해는 적을 가능성이 높습니다.";
}

export type FlowTopIssue = {
  rank: number;
  title: string;
  affectedSteps: string;
  priority: PriorityLevel;
  oneLine: string;
  representativeFix: string;
  transitionIndex: number;
};

export function buildTop3Issues(flow: UxFlowAnalysisV1): FlowTopIssue[] {
  const improvements = flow.ux_audit_layers?.ux_audit_layer_flow?.ux_improvement_flow ?? [];

  const indexed = flow.ux_transitions.map((t, idx) => ({ t, idx }));
  indexed.sort((a, b) => b.t.ux_friction_score - a.t.ux_friction_score);

  return indexed.slice(0, 3).map((x, i) => {
    const t = x.t;
    const imp = improvements[i] ?? improvements[0];
    const title = t.ux_friction_summary.replace(/\s+/g, " ").trim().slice(0, 140);
    const firstSentence =
      t.ux_friction_summary.split(/(?<=[.!?])\s+/)[0]?.trim() ??
      t.ux_friction_summary.slice(0, 100);
    return {
      rank: i + 1,
      title,
      affectedSteps: `${t.ux_from_step + 1}→${t.ux_to_step + 1}단계 화면`,
      priority: frictionToPriority(t.ux_friction_score),
      oneLine: firstSentence,
      representativeFix:
        imp?.ux_improvement_flow_action ??
        (t.ux_theory_note?.split("\n")[0]?.trim() || "전환 힌트·정보 구조를 재검토하세요."),
      transitionIndex: x.idx,
    };
  });
}

export type ImprovementBoardRow = {
  rank: number;
  title: string;
  effect: string;
  difficulty: string;
  scope: string;
  steps: string;
  priority: PriorityLevel;
};

export function inferDifficultyHint(text: string, frictionHint: number): string {
  if (frictionHint >= 4 && /통합|구조|아키텍처|전면/.test(text)) return "상";
  if (/sticky|copy|문구|레이블|색|버튼/.test(text.toLowerCase())) return "하";
  return "중";
}

/** 전환과 Layer2 개선·이슈를 최대한 매칭합니다. */
export function improvementForTransition(
  flow: UxFlowAnalysisV1,
  t: UxFlowAnalysisV1["ux_transitions"][0],
  transitionIndex: number
): { action: string; impact: string; matchedIssueWhy?: string } {
  const layer = flow.ux_audit_layers?.ux_audit_layer_flow;
  const improvements = layer?.ux_improvement_flow ?? [];
  const issues = layer?.ux_issue_flow ?? [];
  const pairHint = `${t.ux_from_step}-${t.ux_to_step}`;
  const pairHuman = `${t.ux_from_step + 1}→${t.ux_to_step + 1}`;

  const pickIssue = (imp: (typeof improvements)[0], i: number) =>
    imp.ux_issue_flow_related_id
      ? issues.find((x) => x.ux_issue_flow_id === imp.ux_issue_flow_related_id)
      : issues[i];

  for (let i = 0; i < improvements.length; i++) {
    const imp = improvements[i]!;
    const rel = pickIssue(imp, i);
    const hint = (rel?.ux_issue_flow_transition_hint ?? "").trim();
    if (
      hint &&
      (hint.includes(pairHint) ||
        hint.includes(pairHuman) ||
        hint.includes(`${t.ux_from_step + 1}-${t.ux_to_step + 1}`))
    ) {
      return {
        action: imp.ux_improvement_flow_action,
        impact: imp.ux_improvement_flow_impact,
        matchedIssueWhy: rel?.ux_issue_flow_why,
      };
    }
  }

  for (const rel of issues) {
    const hint = (rel.ux_issue_flow_transition_hint ?? "").trim();
    if (
      hint &&
      (hint.includes(pairHint) ||
        hint.includes(pairHuman) ||
        hint.includes(`${t.ux_from_step + 1}-${t.ux_to_step + 1}`))
    ) {
      const imp = improvements.find(
        (im) => im.ux_issue_flow_related_id === rel.ux_issue_flow_id
      );
      if (imp) {
        return {
          action: imp.ux_improvement_flow_action,
          impact: imp.ux_improvement_flow_impact,
          matchedIssueWhy: rel.ux_issue_flow_why,
        };
      }
    }
  }

  const sortedIdx = [...flow.ux_transitions]
    .map((tr, i) => ({ tr, i }))
    .sort((a, b) => b.tr.ux_friction_score - a.tr.ux_friction_score);
  const rank = sortedIdx.findIndex((x) => x.i === transitionIndex);
  if (rank >= 0 && improvements[rank]) {
    const imp = improvements[rank]!;
    const rel = pickIssue(imp, rank);
    return {
      action: imp.ux_improvement_flow_action,
      impact: imp.ux_improvement_flow_impact,
      matchedIssueWhy: rel?.ux_issue_flow_why,
    };
  }

  if (improvements[transitionIndex]) {
    const imp = improvements[transitionIndex]!;
    const rel = pickIssue(imp, transitionIndex);
    return {
      action: imp.ux_improvement_flow_action,
      impact: imp.ux_improvement_flow_impact,
      matchedIssueWhy: rel?.ux_issue_flow_why,
    };
  }

  return {
    action: `[AI 추론] 전환 ${t.ux_from_step + 1}→${t.ux_to_step + 1} 마찰 완화`,
    impact: "재시도·이탈 감소, 다음 단계 진입 동기 개선 기대",
  };
}

export function deriveCauseForTransition(
  t: UxFlowAnalysisV1["ux_transitions"][0],
  matchedIssueWhy?: string | null
): string {
  const w = matchedIssueWhy?.trim();
  if (w) return w;
  const note = t.ux_theory_note;
  if (note?.trim()) {
    const first = note
      .split(/\n/)
      .map((l) => l.replace(/^[\s•\-*\d.]+/, "").trim())
      .find((l) => l.length > 0);
    if (first) return first;
  }
  const sentences = t.ux_friction_summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length > 1) {
    return sentences.slice(1).join(" ").slice(0, 320);
  }
  return "정보 구조·피드백 타이밍이 마찰에 기여했을 가능성이 있습니다.";
}

export function buildImprovementBoard(
  flow: UxFlowAnalysisV1
): ImprovementBoardRow[] {
  const fromLayer =
    flow.ux_audit_layers?.ux_audit_layer_flow?.ux_improvement_flow ?? [];

  if (fromLayer.length > 0) {
    const issues = flow.ux_audit_layers?.ux_audit_layer_flow?.ux_issue_flow ?? [];
    return fromLayer.map((imp, i) => {
      const rel = imp.ux_issue_flow_related_id
        ? issues.find((x) => x.ux_issue_flow_id === imp.ux_issue_flow_related_id)
        : issues[i];
      const hintFriction =
        flow.ux_transitions.find(
          (tr) =>
            rel?.ux_issue_flow_transition_hint?.includes(
              `${tr.ux_from_step}-${tr.ux_to_step}`
            )
        )?.ux_friction_score ?? 3;

      return {
        rank: i + 1,
        title: imp.ux_improvement_flow_action,
        effect: imp.ux_improvement_flow_impact,
        difficulty: inferDifficultyHint(
          imp.ux_improvement_flow_action,
          hintFriction
        ),
        scope:
          imp.ux_improvement_flow_nav_note?.trim() ||
          "플로우 내 관련 화면·전환",
        steps: rel?.ux_issue_flow_transition_hint?.trim() || "—",
        priority: frictionToPriority(hintFriction),
      };
    });
  }

  const top = [...flow.ux_transitions].sort(
    (a, b) => b.ux_friction_score - a.ux_friction_score
  );
  return top.slice(0, 6).map((t, i) => ({
    rank: i + 1,
    title: `[AI 추론] 전환 ${t.ux_from_step + 1}→${t.ux_to_step + 1} 마찰 완화`,
    effect: "재시도·이탈 감소, 다음 단계 진입 동기 개선 기대",
    difficulty: t.ux_friction_score >= 4 ? "상" : t.ux_friction_score >= 3 ? "중" : "하",
    scope: "해당 전환 직전·직후 화면",
    steps: `${t.ux_from_step + 1}→${t.ux_to_step + 1}단계`,
    priority: frictionToPriority(t.ux_friction_score),
  }));
}

export function expectedImpactSummary(flow: UxFlowAnalysisV1): string[] {
  const lines: string[] = [];
  const sm = flow.ux_flow_metrics.ux_seamlessness_index;
  lines.push(
    `현재 매끄러움 지수 ${sm}/100 — 주요 마찰 구간을 줄이면 5~15p 범위에서 개선 여지가 있을 수 있습니다(AI 추론).`
  );
  const total = flow.ux_transitions.reduce(
    (s, t) => s + t.ux_friction_score,
    0
  );
  const maxTotal = flow.ux_transitions.length * 5;
  lines.push(
    `전환 마찰 합계 ${total}/${maxTotal} — 상위 2개 구간만 완화해도 체감 완료율·재방문에 긍정적 영향이 예상됩니다.`
  );
  const exec = flow.ux_flow_metrics.ux_executive_summary;
  if (exec) {
    lines.push(exec.split(/\n/)[0]?.trim().slice(0, 200) ?? exec.slice(0, 200));
  }
  return lines;
}

/** 레이어에 명시된 근거 없음 → UI 기본 태그 */
export function dataProvenanceLabel(_layers?: UxAuditLayers | null): string {
  return "AI 추론 기반";
}
