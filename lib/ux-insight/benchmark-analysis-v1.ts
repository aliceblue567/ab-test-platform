import { z } from "zod";

export const UX_BENCHMARK_SCHEMA_VERSION = "1.0.0" as const;

const score1to5 = z.number().min(1).max(5);

const pairZ = z
  .object({
    ux_ours: score1to5,
    ux_competitor: score1to5,
  })
  .strict();

export const uxBenchmarkAnalysisV1Z = z
  .object({
    ux_benchmark_schema_version: z.literal(UX_BENCHMARK_SCHEMA_VERSION),
    ux_analysis_run_id: z.string().optional(),
    ux_comparison_context: z.string().min(1),
    ux_dimension_scores: z
      .object({
        usability: pairZ,
        visual_hierarchy: pairZ,
        trust_transparency: pairZ,
        task_efficiency: pairZ,
        consistency: pairZ,
        content_clarity: pairZ,
      })
      .strict(),
    ux_swot: z
      .object({
        ux_ours: z
          .object({
            strengths: z.array(z.string()),
            weaknesses: z.array(z.string()),
            opportunities: z.array(z.string()),
            threats: z.array(z.string()),
          })
          .strict(),
        ux_competitor: z
          .object({
            strengths: z.array(z.string()),
            weaknesses: z.array(z.string()),
            opportunities: z.array(z.string()),
            threats: z.array(z.string()),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type UxBenchmarkAnalysisV1 = z.infer<typeof uxBenchmarkAnalysisV1Z>;

export const BENCHMARK_RADAR_LABELS: Record<
  keyof UxBenchmarkAnalysisV1["ux_dimension_scores"],
  string
> = {
  usability: "사용성",
  visual_hierarchy: "시각 위계",
  trust_transparency: "신뢰·투명성",
  task_efficiency: "과업 효율",
  consistency: "일관성",
  content_clarity: "정보 명료성",
};

export function parseUxBenchmarkAnalysisV1(
  raw: unknown
): { ok: true; data: UxBenchmarkAnalysisV1 } | { ok: false; error: z.ZodError } {
  const r = uxBenchmarkAnalysisV1Z.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error };
}

export function toRadarChartRows(data: UxBenchmarkAnalysisV1) {
  const keys = Object.keys(
    data.ux_dimension_scores
  ) as (keyof typeof BENCHMARK_RADAR_LABELS)[];
  return keys.map((k) => ({
    dimension: BENCHMARK_RADAR_LABELS[k],
    key: k,
    자사: data.ux_dimension_scores[k].ux_ours,
    타사: data.ux_dimension_scores[k].ux_competitor,
    fullMark: 5,
  }));
}
