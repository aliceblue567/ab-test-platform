/**
 * 통계/리포트 계산
 * unique user 기준, uplift, confidence 구조
 */
import { prisma } from "@/lib/db";

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

/**
 * 실험별 unique user 기준 이벤트 집계
 */
export async function getExperimentStats(
  experimentId: string,
  conversionEventName: string
): Promise<VariantStats[]> {
  const variants = await prisma.variant.findMany({
    where: { experimentId },
    orderBy: { key: "asc" },
  });

  const control = variants.find((v) => v.isControl) ?? variants[0];
  const results: VariantStats[] = [];

  for (const v of variants) {
    const uniqueUsers = await prisma.assignment.count({
      where: { experimentId, variantId: v.id },
    });

    const events = await prisma.eventLog.groupBy({
      by: ["userKey"],
      where: {
        experimentId,
        variantKey: v.key,
        eventName: conversionEventName,
      },
      _count: { userKey: true },
    });

    const convertedUsers = events.length;
    const totalEvents = await prisma.eventLog.count({
      where: { experimentId, variantKey: v.key, eventName: conversionEventName },
    });

    const conversionRate =
      uniqueUsers > 0 ? (convertedUsers / uniqueUsers) * 100 : null;

    let uplift: number | null = null;
    let confidence: number | null = null;
    let isWinner = false;

    if (control.id !== v.id && conversionRate !== null) {
      const controlStats = await getControlConversion(
        experimentId,
        control.id,
        conversionEventName
      );
      if (controlStats !== null) {
        uplift =
          controlStats.rate > 0
            ? ((conversionRate - controlStats.rate) / controlStats.rate) * 100
            : conversionRate > 0
              ? 100
              : 0;
        confidence = approximateConfidence(
          convertedUsers,
          uniqueUsers,
          controlStats.rate,
          controlStats.total
        );
        isWinner = confidence >= 0.95;
      }
    } else if (v.isControl) {
      isWinner = false;
    }

    results.push({
      variantId: v.id,
      variantKey: v.key as string,
      uniqueUsers,
      totalEvents,
      conversionRate,
      uplift,
      confidence,
      isWinner,
    });
  }

  return results;
}

async function getControlConversion(
  experimentId: string,
  controlVariantId: string,
  eventName: string
): Promise<{ rate: number; total: number } | null> {
  const total = await prisma.assignment.count({
    where: { experimentId, variantId: controlVariantId },
  });
  if (total === 0) return null;
  const control = await prisma.variant.findUnique({
    where: { id: controlVariantId },
  });
  if (!control) return null;
  const converted = await prisma.eventLog.groupBy({
    by: ["userKey"],
    where: {
      experimentId,
      variantKey: control.key,
      eventName,
    },
  });
  return { rate: (converted.length / total) * 100, total };
}

/**
 * Wilson score 근사로 confidence 계산
 */
function approximateConfidence(
  convA: number,
  totalA: number,
  rateB: number,
  totalB: number
): number {
  if (totalA === 0 || totalB === 0) return 0;
  const pA = convA / totalA;
  const pB = rateB / 100;
  const se = Math.sqrt((pA * (1 - pA)) / totalA + (pB * (1 - pB)) / totalB);
  if (se === 0) return 1;
  const z = Math.abs(pA - pB) / se;
  // z to p-value 근사
  if (z >= 2.576) return 0.99;
  if (z >= 1.96) return 0.95;
  if (z >= 1.645) return 0.90;
  return Math.min(0.9, z / 2);
}
