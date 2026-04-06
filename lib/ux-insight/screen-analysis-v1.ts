/**
 * UX 인사이트 랩 — 화면 단위 분석 JSON 규격 v1
 * JSON Schema: schemas/ux-screen-analysis.v1.schema.json
 */

import { z } from "zod";

import type { UxAuditLayers } from "@/lib/ux-insight/layered-audit-v1";

export const UX_SCREEN_ANALYSIS_SCHEMA_VERSION = "1.0.0" as const;

const uxSeverityZ = z.enum(["high", "medium", "low"]);

/** LLM이 JSON에 null을 넣는 경우가 많아 optional 문자열은 null 허용 후 제거 */
function optStr() {
  return z.preprocess(
    (v) => (v === null || v === undefined ? undefined : v),
    z.string().optional()
  );
}

/** high/medium/low 외 값·대문자·한글 표기 흡수, 불가 시 필드 제거 */
const severityLoose = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  const s = String(v).toLowerCase().trim();
  if (s === "high" || s === "높음" || s === "상") return "high";
  if (s === "medium" || s === "중간" || s === "중") return "medium";
  if (s === "low" || s === "낮음" || s === "하") return "low";
  return undefined;
}, uxSeverityZ.optional());

const pinPct = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "."));
  if (Number.isNaN(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n * 1000) / 1000));
}, z.number().min(0).max(100).optional());

export const uxGoodPracticeItemZ = z.object({
  ux_good_id: optStr(),
  ux_good_summary: z.coerce.string().min(1),
  ux_good_detail: optStr(),
  ux_pin_x_pct: pinPct,
  ux_pin_y_pct: pinPct,
});

export const uxScreenAnalysisV1Z = z
  .object({
    ux_schema_version: z.literal(UX_SCREEN_ANALYSIS_SCHEMA_VERSION),
    ux_analysis_run_id: optStr(),
    ux_lens_id: optStr(),
    screen_id: z.coerce.string().min(1),
    screen_name: z.coerce.string().min(1),
    url_or_path: z.coerce.string(),
    visual_analysis: z.object({
      layout: z.coerce.string(),
      color: z.coerce.string(),
      font: z.coerce.string(),
    }),
    usability_issues: z.array(
      z.object({
        ux_issue_id: optStr(),
        ux_issue_summary: z.string().min(1),
        ux_issue_detail: optStr(),
        ux_severity: severityLoose,
        ux_category: optStr(),
        ux_evidence: optStr(),
        /** 화면 좌상단 기준 퍼센트 (0~100) — 시각 핀 매핑 */
        ux_pin_x_pct: pinPct,
        ux_pin_y_pct: pinPct,
        ux_issue_as_is: optStr(),
        ux_theory_explained: optStr(),
        ux_to_be_hint: optStr(),
      })
    ),
    ux_good_practices: z.preprocess(
      (v) => (Array.isArray(v) ? v : []),
      z.array(uxGoodPracticeItemZ)
    ),
    user_pain_points: z.array(
      z.object({
        ux_persona_id: optStr(),
        ux_persona_label: z.string().min(1),
        ux_pain_points: z.preprocess((v) => {
          if (typeof v === "string" && v.trim()) return [v.trim()];
          if (Array.isArray(v)) {
            return v.filter((x) => typeof x === "string" && x.trim().length > 0);
          }
          return v;
        }, z.array(z.string().min(1))),
      })
    ),
    improvement_suggestions: z.array(
      z.object({
        ux_suggestion: z.string().min(1),
        ux_rationale: optStr(),
        ux_priority: severityLoose,
        ux_related_issue_id: optStr(),
      })
    ),
  });
  // 루트 .strict() 없음: LLM이 요약용 추가 키를 붙이는 경우가 있어 strip만 적용

export type UxScreenAnalysisV1 = z.infer<typeof uxScreenAnalysisV1Z> & {
  /** 3계층 UX 감사 (모델·후처리 병합) */
  ux_audit_layers?: UxAuditLayers;
};
export type UxSeverity = z.infer<typeof uxSeverityZ>;
export type UxUsabilityIssueV1 = UxScreenAnalysisV1["usability_issues"][number];
export type UxUserPainPointGroupV1 = UxScreenAnalysisV1["user_pain_points"][number];
export type UxImprovementSuggestionV1 =
  UxScreenAnalysisV1["improvement_suggestions"][number];
export type UxGoodPracticeV1 = z.infer<typeof uxGoodPracticeItemZ>;

export type UxScreenAnalysisCoreV1 = z.infer<typeof uxScreenAnalysisV1Z>;

export function parseUxScreenAnalysisV1(
  raw: unknown
):
  | { ok: true; data: UxScreenAnalysisCoreV1 }
  | { ok: false; error: z.ZodError } {
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
    ux_good_practices: [],
    user_pain_points: [],
    improvement_suggestions: [],
  };
}
