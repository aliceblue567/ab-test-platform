/**
 * 3계층 UX 감사 — 문제점/개선 포인트 분리, 접두사 규격 준수.
 * 화면·플로 API 응답에 선택적 `ux_audit_layers` 로 포함.
 */
import { z } from "zod";

export const UX_LAYERED_AUDIT_VERSION = "1.0.0" as const;

function optStr() {
  return z.preprocess(
    (v) => (v === null || v === undefined ? undefined : v),
    z.string().optional()
  );
}

const sev = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  const s = String(v).toLowerCase().trim();
  if (s === "high" || s === "높음") return "high";
  if (s === "medium" || s === "중간") return "medium";
  if (s === "low" || s === "낮음") return "low";
  return undefined;
}, z.enum(["high", "medium", "low"]).optional());

/** 플로우 N장 중 몇 번째 화면(0-based)인지; 멀티 플로우 Layer 1 동기화용 */
const optStepIndex = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.floor(n));
}, z.number().int().min(0).optional());

/** --- Layer 1 (Screen) --- */
export const uxIssueScreenItemZ = z.object({
  ux_issue_screen_id: optStr(),
  ux_issue_screen_summary: z.coerce.string().min(1),
  ux_issue_screen_why: z.coerce.string().min(1),
  ux_issue_screen_theory_note: optStr(),
  ux_issue_screen_severity: sev,
  ux_step_index: optStepIndex,
});

export const uxImprovementScreenItemZ = z.object({
  ux_improvement_screen_id: optStr(),
  ux_improvement_screen_action: z.coerce.string().min(1),
  ux_improvement_screen_impact: z.coerce.string().min(1),
  ux_improvement_screen_wireframe_note: optStr(),
  ux_issue_screen_related_id: optStr(),
  ux_step_index: optStepIndex,
});

/** --- Layer 2 (Flow) --- */
export const uxIssueFlowItemZ = z.object({
  ux_issue_flow_id: optStr(),
  ux_issue_flow_summary: z.coerce.string().min(1),
  ux_issue_flow_why: z.coerce.string().min(1),
  ux_issue_flow_theory_note: optStr(),
  ux_issue_flow_severity: sev,
  ux_issue_flow_transition_hint: optStr(),
});

export const uxImprovementFlowItemZ = z.object({
  ux_improvement_flow_id: optStr(),
  ux_improvement_flow_action: z.coerce.string().min(1),
  ux_improvement_flow_impact: z.coerce.string().min(1),
  ux_improvement_flow_nav_note: optStr(),
  ux_issue_flow_related_id: optStr(),
});

/** --- Layer 3 (System / 전체) --- */
export const uxIssueTotalItemZ = z.object({
  ux_issue_total_id: optStr(),
  ux_issue_total_summary: z.coerce.string().min(1),
  ux_issue_total_why: z.coerce.string().min(1),
  ux_issue_total_theory_note: optStr(),
  ux_issue_total_severity: sev,
});

export const uxImprovementTotalItemZ = z.object({
  ux_improvement_total_id: optStr(),
  ux_improvement_total_action: z.coerce.string().min(1),
  ux_improvement_total_impact: z.coerce.string().min(1),
  ux_improvement_total_strategy_note: optStr(),
  ux_issue_total_related_id: optStr(),
});

export const uxAuditLayersZ = z
  .object({
    ux_layered_audit_version: z.literal(UX_LAYERED_AUDIT_VERSION).optional(),
    ux_audit_layer_screen: z
      .object({
        ux_issue_screen: z.array(uxIssueScreenItemZ).catch([]),
        ux_improvement_screen: z.array(uxImprovementScreenItemZ).catch([]),
      })
      .optional(),
    ux_audit_layer_flow: z
      .object({
        ux_issue_flow: z.array(uxIssueFlowItemZ).catch([]),
        ux_improvement_flow: z.array(uxImprovementFlowItemZ).catch([]),
      })
      .optional(),
    ux_audit_layer_system: z
      .object({
        ux_issue_total: z.array(uxIssueTotalItemZ).catch([]),
        ux_improvement_total: z.array(uxImprovementTotalItemZ).catch([]),
      })
      .optional(),
  })
  .transform((o) => ({
    ...o,
    ux_layered_audit_version:
      o.ux_layered_audit_version ?? UX_LAYERED_AUDIT_VERSION,
  }));

export type UxAuditLayers = z.infer<typeof uxAuditLayersZ>;
export type UxIssueScreenItem = z.infer<typeof uxIssueScreenItemZ>;
export type UxImprovementScreenItem = z.infer<typeof uxImprovementScreenItemZ>;

export function parseUxAuditLayers(
  raw: unknown
): { ok: true; data: UxAuditLayers } | { ok: false; error: z.ZodError } {
  const r = uxAuditLayersZ.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error };
}

export function emptyUxAuditLayers(): UxAuditLayers {
  return {
    ux_layered_audit_version: UX_LAYERED_AUDIT_VERSION,
    ux_audit_layer_screen: {
      ux_issue_screen: [],
      ux_improvement_screen: [],
    },
    ux_audit_layer_flow: { ux_issue_flow: [], ux_improvement_flow: [] },
    ux_audit_layer_system: {
      ux_issue_total: [],
      ux_improvement_total: [],
    },
  };
}
