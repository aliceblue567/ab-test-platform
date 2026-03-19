/**
 * 통계/리포트 계산
 * unique user 기준 conversionRate, uplift, winner state
 */
import { prisma } from "@/src/lib/db";

export type VariantMetrics = {
  landingUsers: number;
  cardClickUsers: number;
  detailViewUsers: number;
  ctaClickUsers: number;
  ctaClickRate: number;
};

export type ReportResult = {
  summary: {
    winner: "A" | "B" | "inconclusive";
    uplift: number;
    primaryMetric: "cta_click_rate";
  };
  variants: {
    A: VariantMetrics;
    B: VariantMetrics;
  };
};

export type VariantStats = {
  variantId: string;
  variantKey: string;
  uniqueUsers: number;
  totalEvents: number;
  conversionRate: number | null;
  uplift: number | null;
  confidence: number | null;
  isWinner: boolean;
};

type ControlStats = {
  rate: number;
  converted: number;
  total: number;
};

const CONFIDENCE_THRESHOLD = 0.95;

/**
 * conversionRate 계산 (unique user 기준)
 */
export function calculateConversionRate(
  convertedUsers: number,
  uniqueUsers: number
): number | null {
  if (uniqueUsers <= 0) return null;
  return (convertedUsers / uniqueUsers) * 100;
}

/**
 * uplift 계산 (control 대비 %)
 */
export function calculateUplift(
  variantRate: number,
  controlRate: number
): number | null {
  if (controlRate <= 0) {
    return variantRate > 0 ? 100 : 0;
  }
  return ((variantRate - controlRate) / controlRate) * 100;
}

/**
 * winner 여부 (confidence >= threshold)
 */
export function isWinner(confidence: number | null): boolean {
  return confidence !== null && confidence >= CONFIDENCE_THRESHOLD;
}

/**
 * 두 비율 비교 시 statistical confidence (z-test 근사)
 */
export function calculateConfidence(
  convertedA: number,
  totalA: number,
  convertedB: number,
  totalB: number
): number {
  if (totalA <= 0 || totalB <= 0) return 0;

  const pA = convertedA / totalA;
  const pB = convertedB / totalB;
  const se = Math.sqrt(
    (pA * (1 - pA)) / totalA + (pB * (1 - pB)) / totalB
  );

  if (se <= 0) return 1;

  const z = Math.abs(pA - pB) / se;

  if (z >= 2.576) return 0.99;
  if (z >= 1.96) return 0.95;
  if (z >= 1.645) return 0.9;

  return Math.min(0.9, z / 2);
}

/**
 * 실험별 variant 통계 (conversionRate, uplift, winner)
 */
export async function getExperimentStats(
  experimentId: string,
  conversionEventName: string
): Promise<VariantStats[]> {
  const variants = await prisma.variant.findMany({
    where: { experimentId },
    orderBy: { key: "asc" },
  });

  if (variants.length === 0) return [];

  const control = variants.find((v) => v.isControl) ?? variants[0];
  const controlStats = await getControlStats(
    experimentId,
    control.id,
    control.key,
    conversionEventName
  );

  const results: VariantStats[] = [];

  for (const v of variants) {
    const uniqueUsers = await prisma.assignment.count({
      where: { experimentId, variantId: v.id },
    });

    const convertedUsers = (
      await prisma.eventLog.groupBy({
        by: ["userKey"],
        where: {
          experimentId,
          variantKey: v.key,
          eventName: conversionEventName,
        },
      })
    ).length;

    const totalEvents = await prisma.eventLog.count({
      where: {
        experimentId,
        variantKey: v.key,
        eventName: conversionEventName,
      },
    });

    const conversionRate = calculateConversionRate(convertedUsers, uniqueUsers);

    let uplift: number | null = null;
    let confidence: number | null = null;
    let winner = false;

    if (control.id !== v.id && conversionRate !== null && controlStats) {
      uplift = calculateUplift(conversionRate, controlStats.rate);
      confidence = calculateConfidence(
        convertedUsers,
        uniqueUsers,
        controlStats.converted,
        controlStats.total
      );
      winner = isWinner(confidence);
    }

    results.push({
      variantId: v.id,
      variantKey: v.key,
      uniqueUsers,
      totalEvents,
      conversionRate,
      uplift,
      confidence,
      isWinner: winner,
    });
  }

  return results;
}

const REPORT_EVENTS = [
  "view_landing",
  "card_click",
  "detail_view",
  "cta_click",
] as const;

/**
 * event_logs 기준 unique user 집계
 */
async function getVariantMetricsFromEvents(
  experimentId: string,
  variantKey: string
): Promise<VariantMetrics> {
  const [landingUsers, cardClickUsers, detailViewUsers, ctaClickUsers] =
    await Promise.all(
      REPORT_EVENTS.map((eventName) =>
        prisma.eventLog
          .groupBy({
            by: ["userKey"],
            where: {
              experimentId,
              variantKey,
              eventName,
            },
          })
          .then((r) => r.length)
      )
    );

  const ctaClickRate = landingUsers > 0 ? ctaClickUsers / landingUsers : 0;

  return {
    landingUsers,
    cardClickUsers,
    detailViewUsers,
    ctaClickUsers,
    ctaClickRate,
  };
}

/**
 * 리포트 요약 (event_logs unique user 기반)
 * A = 첫 번째 variant, B = 두 번째 variant
 * uplift = (B.ctaClickRate - A.ctaClickRate) / A.ctaClickRate
 * winner = 더 높은 ctaClickRate, 같으면 inconclusive
 */
export async function getReportSummary(
  experimentId: string
): Promise<ReportResult | null> {
  const variants = await prisma.variant.findMany({
    where: { experimentId },
    orderBy: { key: "asc" },
  });

  if (variants.length < 2) return null;

  const [variantA, variantB] = variants;
  const keyA = variantA.key as string;
  const keyB = variantB.key as string;

  const [metricsA, metricsB] = await Promise.all([
    getVariantMetricsFromEvents(experimentId, keyA),
    getVariantMetricsFromEvents(experimentId, keyB),
  ]);

  const rateA = metricsA.ctaClickRate;
  const rateB = metricsB.ctaClickRate;

  let winner: "A" | "B" | "inconclusive" = "inconclusive";
  if (rateB > rateA) winner = "B";
  else if (rateA > rateB) winner = "A";

  const uplift =
    rateA > 0 ? (rateB - rateA) / rateA : rateB > 0 ? 1 : 0;

  return {
    summary: {
      winner,
      uplift,
      primaryMetric: "cta_click_rate",
    },
    variants: {
      A: metricsA,
      B: metricsB,
    },
  };
}

async function getControlStats(
  experimentId: string,
  controlVariantId: string,
  controlVariantKey: string,
  eventName: string
): Promise<ControlStats | null> {
  const total = await prisma.assignment.count({
    where: { experimentId, variantId: controlVariantId },
  });

  if (total <= 0) return null;

  const converted = (
    await prisma.eventLog.groupBy({
      by: ["userKey"],
      where: {
        experimentId,
        variantKey: controlVariantKey,
        eventName,
      },
    })
  ).length;

  return {
    rate: (converted / total) * 100,
    converted,
    total,
  };
}
