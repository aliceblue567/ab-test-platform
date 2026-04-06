import { z } from "zod";

import type { UxAuditLayers } from "@/lib/ux-insight/layered-audit-v1";

export const UX_FLOW_SCHEMA_VERSION = "1.0.0" as const;

/** LLM·클라이언트 입력 모두 흡수 */
const score1to5 = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return 3;
  const n = Number(v);
  if (Number.isNaN(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}, z.number().min(1).max(5));

function optStr() {
  return z.preprocess(
    (v) => (v === null || v === undefined ? undefined : v),
    z.string().optional()
  );
}

const psychDimsZ = z.object({
  ux_expectation_gap: score1to5,
  ux_cognitive_spike: score1to5,
  ux_emotional_friction: score1to5,
});

/** 이미지 위 주석 좌표(화면 비율 %, 좌상단 원점) */
export const uxFlowHotspotZ = z.object({
  ux_step_index: z.coerce.number().int().nonnegative(),
  /** 0~100 */
  x_pct: z.coerce.number().min(0).max(100),
  /** 0~100 */
  y_pct: z.coerce.number().min(0).max(100),
  ux_note: z.string().min(1),
  ux_related_transition_from: z.coerce.number().int().nonnegative().optional(),
  ux_related_transition_to: z.coerce.number().int().nonnegative().optional(),
});

export const uxFlowAnalysisV1Z = z.object({
  ux_flow_schema_version: z.literal(UX_FLOW_SCHEMA_VERSION),
  ux_analysis_run_id: optStr(),
  /** 프로젝트 단위 분석용 선택 ID (클라이언트/서버가 채움) */
  ux_project_id: optStr(),
  ux_flow_title: z.coerce.string().min(1),
  ux_steps: z.array(
    z.object({
      ux_step_index: z.coerce.number().int().nonnegative(),
      ux_step_label: z.coerce.string().min(1),
      ux_one_line_summary: z.coerce.string().min(1),
      /** 전문가 플로 UI: 단계 카드 편집 여부 */
      ux_is_expert_edited: z.boolean().optional(),
    })
  ),
  ux_transitions: z.array(
    z.object({
      ux_from_step: z.coerce.number().int().nonnegative(),
      ux_to_step: z.coerce.number().int().nonnegative(),
      ux_friction_summary: z.coerce.string().min(1),
      ux_friction_score: score1to5,
      ux_psychological_dimensions: psychDimsZ,
      ux_theory_note: optStr(),
      ux_is_expert_edited: z.boolean().optional(),
    })
  ),
  ux_flow_metrics: z.object({
    ux_seamlessness_index: z.coerce.number().min(0).max(100),
    ux_worst_transition_to_step: z.preprocess(
      (v) =>
        v === null || v === undefined || v === "" ? null : v,
      z.union([z.coerce.number().int().nonnegative(), z.null()])
    ),
    ux_executive_summary: z.coerce.string().min(1),
    ux_is_expert_edited: z.boolean().optional(),
  }),
  ux_flow_hotspots: z.array(uxFlowHotspotZ).optional(),
});

export type UxFlowAnalysisV1 = z.infer<typeof uxFlowAnalysisV1Z> & {
  ux_audit_layers?: UxAuditLayers;
};
export type UxFlowAnalysisCoreV1 = z.infer<typeof uxFlowAnalysisV1Z>;
export type UxFlowHotspotV1 = z.infer<typeof uxFlowHotspotZ>;

export function parseUxFlowAnalysisV1(
  raw: unknown
):
  | { ok: true; data: UxFlowAnalysisCoreV1 }
  | { ok: false; error: z.ZodError } {
  const r = uxFlowAnalysisV1Z.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error };
}
