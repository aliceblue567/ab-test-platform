/**
 * UX 인사이트 랩 — 화면 단위 분석 JSON 규격 v1
 * JSON Schema: schemas/ux-screen-analysis.v1.schema.json
 */

import { z } from "zod";

export const UX_SCREEN_ANALYSIS_SCHEMA_VERSION = "1.0.0" as const;

const uxSeverityZ = z.enum(["high", "medium", "low"]);

export const uxScreenAnalysisV1Z = z
  .object({
    ux_schema_version: z.literal(UX_SCREEN_ANALYSIS_SCHEMA_VERSION),
    ux_analysis_run_id: z.string().optional(),
    ux_lens_id: z.string().optional(),
    screen_id: z.string().min(1),
    screen_name: z.string().min(1),
    url_or_path: z.string(),
    visual_analysis: z.object({
      layout: z.string(),
      color: z.string(),
      font: z.string(),
    }),
    usability_issues: z.array(
      z.object({
        ux_issue_id: z.string().optional(),
        ux_issue_summary: z.string().min(1),
        ux_issue_detail: z.string().optional(),
        ux_severity: uxSeverityZ.optional(),
        ux_category: z.string().optional(),
        ux_evidence: z.string().optional(),
      })
    ),
    user_pain_points: z.array(
      z.object({
        ux_persona_id: z.string().optional(),
        ux_persona_label: z.string().min(1),
        ux_pain_points: z.array(z.string().min(1)),
      })
    ),
    improvement_suggestions: z.array(
      z.object({
        ux_suggestion: z.string().min(1),
        ux_rationale: z.string().optional(),
        ux_priority: uxSeverityZ.optional(),
        ux_related_issue_id: z.string().optional(),
      })
    ),
  })
  .strict();

export type UxScreenAnalysisV1 = z.infer<typeof uxScreenAnalysisV1Z>;
export type UxSeverity = z.infer<typeof uxSeverityZ>;
export type UxUsabilityIssueV1 = UxScreenAnalysisV1["usability_issues"][number];
export type UxUserPainPointGroupV1 = UxScreenAnalysisV1["user_pain_points"][number];
export type UxImprovementSuggestionV1 =
  UxScreenAnalysisV1["improvement_suggestions"][number];

export function parseUxScreenAnalysisV1(
  raw: unknown
): { ok: true; data: UxScreenAnalysisV1 } | { ok: false; error: z.ZodError } {
  const r = uxScreenAnalysisV1Z.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error };
}

/** LLM/파서 실패 시 빈 문서용 최소 뼈대 */
export function emptyUxScreenAnalysisV1(
  partial: Pick<UxScreenAnalysisV1, "screen_id" | "screen_name" | "url_or_path">
): UxScreenAnalysisV1 {
  return {
    ux_schema_version: UX_SCREEN_ANALYSIS_SCHEMA_VERSION,
    ...partial,
    visual_analysis: { layout: "", color: "", font: "" },
    usability_issues: [],
    user_pain_points: [],
    improvement_suggestions: [],
  };
}
