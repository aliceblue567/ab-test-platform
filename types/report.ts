/**
 * 리포트 API 응답 타입
 */

export type VariantMetrics = {
  landingUsers: number;
  cardClickUsers: number;
  detailViewUsers: number;
  ctaClickUsers: number;
  ctaClickRate: number;
};

export type ReportSummary = {
  winner: "A" | "B" | "inconclusive";
  uplift: number;
  primaryMetric: "cta_click_rate";
};

export type ReportApiResponse = {
  experiment: {
    id: string;
    key: string;
    name: string;
    status: string;
  };
  summary: ReportSummary;
  variants: {
    A: VariantMetrics;
    B: VariantMetrics;
  };
};
