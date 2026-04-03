import { z } from "zod";

export const UX_FLOW_SCHEMA_VERSION = "1.0.0" as const;

const score1to5 = z.number().min(1).max(5);

export const uxFlowAnalysisV1Z = z
  .object({
    ux_flow_schema_version: z.literal(UX_FLOW_SCHEMA_VERSION),
    ux_analysis_run_id: z.string().optional(),
    ux_flow_title: z.string().min(1),
    ux_steps: z.array(
      z
        .object({
          ux_step_index: z.number().int().nonnegative(),
          ux_step_label: z.string().min(1),
          ux_one_line_summary: z.string().min(1),
        })
        .strict()
    ),
    ux_transitions: z.array(
      z
        .object({
          ux_from_step: z.number().int().nonnegative(),
          ux_to_step: z.number().int().nonnegative(),
          ux_friction_summary: z.string().min(1),
          /** 1=거의 마찰 없음 … 5=심한 심리적 마찰 */
          ux_friction_score: score1to5,
          ux_psychological_dimensions: z
            .object({
              /** 기대와 다음 화면의 괴리, 5=심함 */
              ux_expectation_gap: score1to5,
              /** 인지 부하 급증, 5=심함 */
              ux_cognitive_spike: score1to5,
              /** 불안·피로·압박 체감, 5=심함 */
              ux_emotional_friction: score1to5,
            })
            .strict(),
          ux_theory_note: z.string().optional(),
        })
        .strict()
    ),
    ux_flow_metrics: z
      .object({
        /** 0~100, 높을수록 플로우가 매끄러움 */
        ux_seamlessness_index: z.number().min(0).max(100),
        /** 가장 마찰이 큰 전환 구간의 to_step (없으면 null) */
        ux_worst_transition_to_step: z.number().int().nonnegative().nullable(),
        ux_executive_summary: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type UxFlowAnalysisV1 = z.infer<typeof uxFlowAnalysisV1Z>;

export function parseUxFlowAnalysisV1(
  raw: unknown
): { ok: true; data: UxFlowAnalysisV1 } | { ok: false; error: z.ZodError } {
  const r = uxFlowAnalysisV1Z.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error };
}
