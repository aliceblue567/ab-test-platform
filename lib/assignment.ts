/**
 * 사용자 Assignment 로직
 * 규칙: 한 실험당 한 사용자는 항상 동일 variant
 */
import { prisma } from "@/lib/db";

export type AssignmentResult = {
  variantId: string;
  variantKey: string;
  payload: unknown;
};

/**
 * 사용자에게 variant 할당 (기존 assignment 있으면 반환)
 */
export async function getOrAssignVariant(
  experimentKey: string,
  userId: string
): Promise<AssignmentResult | null> {
  const experiment = await prisma.experiment.findUnique({
    where: { key: experimentKey, status: "running" },
    include: { variants: true },
  });

  if (!experiment || experiment.variants.length === 0) return null;

  // 기존 assignment 확인
  const existing = await prisma.assignment.findUnique({
    where: {
      experimentId_userKey: { experimentId: experiment.id, userKey: userId },
    },
    include: { variant: true },
  });

  if (existing) {
    return {
      variantId: existing.variantId,
      variantKey: existing.variant.key as string,
      payload: existing.variant.payload as unknown,
    };
  }

  // 가중치 기반 랜덤 할당
  const totalWeight = experiment.variants.reduce((s, v) => s + v.weight, 0);
  let r = Math.random() * totalWeight;

  for (const v of experiment.variants) {
    r -= v.weight;
    if (r <= 0) {
      await prisma.assignment.create({
        data: {
          experimentId: experiment.id,
          variantId: v.id,
          variantKey: v.key as string,
          userKey: userId,
        },
      });
    return {
      variantId: v.id,
      variantKey: v.key as string,
      payload: v.payload as unknown,
    };
    }
  }

  const fallback = experiment.variants[0];
  await prisma.assignment.create({
    data: {
      experimentId: experiment.id,
      variantId: fallback.id,
      variantKey: fallback.key as string,
      userKey: userId,
    },
  });
  return {
    variantId: fallback.id,
    variantKey: fallback.key,
    payload: fallback.payload as unknown,
  };
}
