/**
 * Gemini가 흔히 쓰는 래핑·별칭·배열 타입 실수를 Zod 전에 정리합니다.
 */
import { UX_SCREEN_ANALYSIS_SCHEMA_VERSION } from "@/lib/ux-insight/screen-analysis-v1";

export function coerceUxScreenAnalysisRaw(parsed: unknown): Record<string, unknown> {
  let root: Record<string, unknown>;

  if (Array.isArray(parsed)) {
    const first = parsed.find(
      (x) => x !== null && typeof x === "object" && !Array.isArray(x)
    ) as Record<string, unknown> | undefined;
    if (!first) {
      throw new Error("Invalid model JSON output");
    }
    root = { ...first };
  } else if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    root = { ...(parsed as Record<string, unknown>) };
  } else {
    throw new Error("Invalid model JSON output");
  }

  const outerAuditLayers = root["ux_audit_layers"];

  const unwrapKeys = [
    "analysis",
    "data",
    "result",
    "screen_analysis",
    "ux_screen_analysis",
    "output",
    "response",
  ];
  for (const k of unwrapKeys) {
    const inner = root[k];
    if (
      inner !== null &&
      typeof inner === "object" &&
      !Array.isArray(inner)
    ) {
      const inn = inner as Record<string, unknown>;
      if ("visual_analysis" in inn || "usability_issues" in inn) {
        root = { ...inn };
        if (root["ux_audit_layers"] === undefined && outerAuditLayers !== undefined) {
          root["ux_audit_layers"] = outerAuditLayers;
        }
        break;
      }
    }
  }

  for (const key of [
    "usability_issues",
    "user_pain_points",
    "improvement_suggestions",
    "ux_good_practices",
  ] as const) {
    const v = root[key];
    if (!Array.isArray(v)) {
      root[key] = [];
    }
  }

  const vaIn = root.visual_analysis;
  if (
    vaIn === null ||
    typeof vaIn !== "object" ||
    Array.isArray(vaIn)
  ) {
    root.visual_analysis = { layout: "", color: "", font: "" };
  } else {
    const v = vaIn as Record<string, unknown>;
    const str = (x: unknown) => (x == null ? "" : String(x));
    root.visual_analysis = {
      layout: str(v.layout ?? v.layout_analysis ?? v.Layout),
      color: str(v.color ?? v.colors ?? v.color_analysis ?? v.Color),
      font: str(v.font ?? v.typography ?? v.fonts ?? v.Font),
    };
  }

  const toStr = (x: unknown) => (x == null ? "" : String(x));

  const clampPct = (v: unknown): number | undefined => {
    if (v === null || v === undefined || v === "") return undefined;
    const n =
      typeof v === "number" ? v : Number(String(v).replace(/,/g, "."));
    if (Number.isNaN(n)) return undefined;
    return Math.min(100, Math.max(0, n));
  };

  root.usability_issues = (root.usability_issues as unknown[])
    .map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const it = item as Record<string, unknown>;
      const summary =
        it.ux_issue_summary ??
        it.summary ??
        it.title ??
        it.issue ??
        it.description ??
        it.problem;
      if (typeof summary !== "string" || !summary.trim()) {
        return null;
      }
      const x = clampPct(
        it.ux_pin_x_pct ?? it.x_pct ?? it.pin_x ?? it.ux_hotspot_x_pct
      );
      const y = clampPct(
        it.ux_pin_y_pct ?? it.y_pct ?? it.pin_y ?? it.ux_hotspot_y_pct
      );
      const next: Record<string, unknown> = {
        ...it,
        ux_issue_summary: summary.trim(),
      };
      if (x !== undefined) next.ux_pin_x_pct = x;
      if (y !== undefined) next.ux_pin_y_pct = y;
      return next;
    })
    .filter((x) => x !== null) as Record<string, unknown>[];

  root.ux_good_practices = (root.ux_good_practices as unknown[])
    .map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const it = item as Record<string, unknown>;
      const summary =
        it.ux_good_summary ??
        it.summary ??
        it.title ??
        it.highlight;
      if (typeof summary !== "string" || !summary.trim()) {
        return null;
      }
      const x = clampPct(it.ux_pin_x_pct ?? it.x_pct);
      const y = clampPct(it.ux_pin_y_pct ?? it.y_pct);
      const next: Record<string, unknown> = {
        ...it,
        ux_good_summary: summary.trim(),
      };
      if (x !== undefined) next.ux_pin_x_pct = x;
      if (y !== undefined) next.ux_pin_y_pct = y;
      return next;
    })
    .filter((x) => x !== null) as Record<string, unknown>[];

  root.user_pain_points = (root.user_pain_points as unknown[])
    .map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const it = item as Record<string, unknown>;
      const label =
        it.ux_persona_label ??
        it.persona_label ??
        it.label ??
        it.persona ??
        it.persona_name;
      let pains = it.ux_pain_points;
      if (typeof pains === "string" && pains.trim()) {
        pains = [pains.trim()];
      }
      if (!Array.isArray(pains)) {
        pains = [];
      }
      const painArr = (pains as unknown[]).filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0
      );
      const lab =
        typeof label === "string" && label.trim()
          ? label.trim()
          : "지정 페르소나";
      return { ...it, ux_persona_label: lab, ux_pain_points: painArr };
    })
    .filter((x) => x !== null) as Record<string, unknown>[];

  root.improvement_suggestions = (root.improvement_suggestions as unknown[])
    .map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const it = item as Record<string, unknown>;
      const sug =
        it.ux_suggestion ??
        it.suggestion ??
        it.recommendation ??
        it.improvement ??
        it.proposal;
      if (typeof sug !== "string" || !sug.trim()) {
        return null;
      }
      return { ...it, ux_suggestion: sug.trim() };
    })
    .filter((x) => x !== null) as Record<string, unknown>[];

  root.screen_id = toStr(root.screen_id);
  root.screen_name = toStr(root.screen_name);
  root.url_or_path = toStr(root.url_or_path);

  /** 모델이 버전 문자열을 살짝 다르게 주는 경우에도 파싱 실패 방지 */
  root.ux_schema_version = UX_SCREEN_ANALYSIS_SCHEMA_VERSION;

  return root;
}
