/**
 * N-Way 벤치마크 분석 규격 (스키마 2.0.0)
 * 1.0.0 응답은 정규화 후 동일 구조로 다룹니다.
 */
import { z } from "zod";

import {
  BENCHMARK_RADAR_LABELS,
  type UxBenchmarkAnalysisV1,
  uxBenchmarkAnalysisV1Z,
} from "@/lib/ux-insight/benchmark-analysis-v1";

export const UX_BENCHMARK_MULTI_SCHEMA_VERSION = "2.0.0" as const;

const score1to5 = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return 3;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "."));
  if (Number.isNaN(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}, z.number().min(1).max(5));

const dimensionScoresZ = z.object({
  usability: score1to5,
  visual_hierarchy: score1to5,
  trust_transparency: score1to5,
  task_efficiency: score1to5,
  consistency: score1to5,
  content_clarity: score1to5,
});

const swotZ = z.object({
  strengths: z.array(z.coerce.string()).catch([]),
  weaknesses: z.array(z.coerce.string()).catch([]),
  opportunities: z.array(z.coerce.string()).catch([]),
  threats: z.array(z.coerce.string()).catch([]),
});

const variantZ = z.object({
  ux_label: z.coerce.string().min(1),
  ux_dimension_scores: dimensionScoresZ,
  ux_swot: swotZ,
});

const featureMatrixZ = z
  .object({
    ux_features: z.array(z.coerce.string()).min(1),
    ux_rows: z.array(
      z.object({
        ux_label: z.coerce.string(),
        ux_present: z.array(z.coerce.boolean()),
      })
    ),
  })
  .optional();

export const uxBenchmarkMultiV1Z = z
  .object({
    ux_benchmark_schema_version: z
      .literal(UX_BENCHMARK_MULTI_SCHEMA_VERSION)
      .optional(),
    ux_analysis_run_id: z.string().optional().nullable(),
    ux_comparison_context: z.coerce.string().min(1),
    ux_variants: z.array(variantZ).min(2).max(8),
    ux_feature_matrix: featureMatrixZ,
  })
  .transform((o) => {
    const features = o.ux_feature_matrix?.ux_features;
    const rows = o.ux_feature_matrix?.ux_rows;
    let matrix = o.ux_feature_matrix;
    if (features && rows && features.length > 0) {
      const n = features.length;
      matrix = {
        ux_features: features,
        ux_rows: rows.map((r) => ({
          ux_label: r.ux_label,
          ux_present: Array.from(
            { length: n },
            (_, i) => !!r.ux_present[i]
          ),
        })),
      };
    }
    return {
      ux_benchmark_schema_version: UX_BENCHMARK_MULTI_SCHEMA_VERSION,
      ux_analysis_run_id: o.ux_analysis_run_id ?? undefined,
      ux_comparison_context: o.ux_comparison_context,
      ux_variants: o.ux_variants,
      ux_feature_matrix: matrix,
    };
  });

export type UxBenchmarkVariantV1 = z.infer<typeof variantZ>;
export type UxBenchmarkFeatureMatrixV1 = NonNullable<
  z.infer<typeof uxBenchmarkMultiV1Z>["ux_feature_matrix"]
>;
export type UxBenchmarkMultiV1 = z.infer<typeof uxBenchmarkMultiV1Z>;

export function benchmarkV1ToMulti(v1: UxBenchmarkAnalysisV1): UxBenchmarkMultiV1 {
  const dims = v1.ux_dimension_scores;
  const keys = Object.keys(dims) as (keyof typeof dims)[];
  const ours = Object.fromEntries(
    keys.map((k) => [k, dims[k].ux_ours])
  ) as UxBenchmarkVariantV1["ux_dimension_scores"];
  const comp = Object.fromEntries(
    keys.map((k) => [k, dims[k].ux_competitor])
  ) as UxBenchmarkVariantV1["ux_dimension_scores"];

  return {
    ux_benchmark_schema_version: UX_BENCHMARK_MULTI_SCHEMA_VERSION,
    ux_analysis_run_id: v1.ux_analysis_run_id,
    ux_comparison_context: v1.ux_comparison_context,
    ux_variants: [
      { ux_label: "자사", ux_dimension_scores: ours, ux_swot: v1.ux_swot.ux_ours },
      {
        ux_label: "타사",
        ux_dimension_scores: comp,
        ux_swot: v1.ux_swot.ux_competitor,
      },
    ],
    ux_feature_matrix: undefined,
  };
}

export function parseUxBenchmarkMultiReport(
  raw: unknown
):
  | { ok: true; data: UxBenchmarkMultiV1 }
  | { ok: false; error: z.ZodError } {
  const multi = uxBenchmarkMultiV1Z.safeParse(raw);
  if (multi.success) return { ok: true, data: multi.data };

  const legacy = uxBenchmarkAnalysisV1Z.safeParse(raw);
  if (legacy.success) {
    return { ok: true, data: benchmarkV1ToMulti(legacy.data) };
  }

  return { ok: false, error: multi.error };
}

export const RADAR_SLOT_COLORS = [
  "hsl(217 91% 55%)",
  "hsl(142 71% 42%)",
  "hsl(280 65% 50%)",
  "hsl(35 92% 48%)",
  "hsl(340 72% 50%)",
  "hsl(185 70% 42%)",
  "hsl(25 88% 48%)",
  "hsl(220 12% 48%)",
];

export function toRadarChartRowsMulti(data: UxBenchmarkMultiV1): {
  rows: Record<string, string | number>[];
  slotKeys: string[];
  labels: string[];
} {
  const dimKeys = Object.keys(
    BENCHMARK_RADAR_LABELS
  ) as (keyof typeof BENCHMARK_RADAR_LABELS)[];
  const slotKeys = data.ux_variants.map((_, i) => `s${i}`);
  const labels = data.ux_variants.map((v) => v.ux_label);

  const rows = dimKeys.map((k) => {
    const row: Record<string, string | number> = {
      dimension: BENCHMARK_RADAR_LABELS[k],
      key: k,
      fullMark: 5,
    };
    data.ux_variants.forEach((v, i) => {
      row[slotKeys[i]!] = v.ux_dimension_scores[k];
    });
    return row;
  });

  return { rows, slotKeys, labels };
}
