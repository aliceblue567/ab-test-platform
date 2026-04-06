import type { UxFlowAnalysisV1 } from "@/lib/ux-insight/flow-analysis-v1";

/** 마스터 스펙: 프로젝트 단위 스냅샷(플로 결과 + 파생 지표). DB 저장 전 클라이언트 집계용. */
export type UxProjectInsightEnvelopeV1 = {
  project_id: string;
  ux_flow_schema_version: string;
  flow: UxFlowAnalysisV1;
  total_friction_score: number;
  flow_summary: string;
};

export function computeTotalFrictionScore(flow: UxFlowAnalysisV1): number {
  return flow.ux_transitions.reduce((s, t) => s + t.ux_friction_score, 0);
}

export function buildUxProjectInsightEnvelope(
  projectId: string,
  flow: UxFlowAnalysisV1
): UxProjectInsightEnvelopeV1 {
  return {
    project_id: projectId,
    ux_flow_schema_version: flow.ux_flow_schema_version,
    flow,
    total_friction_score: computeTotalFrictionScore(flow),
    flow_summary: flow.ux_flow_metrics.ux_executive_summary,
  };
}
