/**
 * 사용자 Assignment 로직
 * 규칙: 한 실험당 한 사용자는 항상 동일 variant
 */
import { prisma } from "@/src/lib/db";
import type { VariantKey } from "@prisma/client";

export type AssignmentResult = {
  assignmentId: string;
  experimentId: string;
  variantId: string;
  variantKey: VariantKey;
  payload: unknown;
};

export type AssignmentError =
  | { code: "EXPERIMENT_NOT_FOUND" }
  | { code: "EXPERIMENT_NOT_RUNNING" }
  | { code: "NO_VARIANTS" }
  | { code: "DB_ERROR"; cause?: unknown };

/**
 * 기존 assignment 조회 또는 새로 생성
 */
export async function getOrCreateAssignment(
  experimentKey: string,
  userKey: string
): Promise<AssignmentResult | AssignmentError> {
  try {
    const experiment = await prisma.experiment.findUnique({
      where: { key: experimentKey },
      include: { variants: { orderBy: { key: "asc" } } },
    });

    if (!experiment) {
      return { code: "EXPERIMENT_NOT_FOUND" };
    }

    if (experiment.status !== "running") {
      return { code: "EXPERIMENT_NOT_RUNNING" };
    }

    if (experiment.variants.length === 0) {
      return { code: "NO_VARIANTS" };
    }

    // 기존 assignment 확인
    const existing = await prisma.assignment.findUnique({
      where: {
        experimentId_userKey: {
          experimentId: experiment.id,
          userKey,
        },
      },
      include: { variant: true },
    });

    if (existing) {
      return {
        assignmentId: existing.id,
        experimentId: existing.experimentId,
        variantId: existing.variantId,
        variantKey: existing.variant.key,
        payload: existing.variant.payload as unknown,
      };
    }

    // 가중치 기반 랜덤 할당
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight <= 0) {
      const fallback = experiment.variants[0];
      return createAssignment(experiment.id, fallback.id, fallback.key, fallback.payload, userKey);
    }

    let r = Math.random() * totalWeight;

    for (const v of experiment.variants) {
      r -= v.weight;
      if (r <= 0) {
        return createAssignment(experiment.id, v.id, v.key, v.payload, userKey);
      }
    }

    const fallback = experiment.variants[0];
    return createAssignment(experiment.id, fallback.id, fallback.key, fallback.payload, userKey);
  } catch (err) {
    return { code: "DB_ERROR", cause: err };
  }
}

async function createAssignment(
  experimentId: string,
  variantId: string,
  variantKey: VariantKey,
  payload: unknown,
  userKey: string
): Promise<AssignmentResult | AssignmentError> {
  try {
    const assignment = await prisma.assignment.create({
      data: {
        experimentId,
        variantId,
        variantKey: variantKey as string,
        userKey,
      },
      include: { variant: true },
    });

    return {
      assignmentId: assignment.id,
      experimentId: assignment.experimentId,
      variantId: assignment.variantId,
      variantKey: assignment.variant.key,
      payload: payload as unknown,
    };
  } catch (err: unknown) {
    // Race: 동시 요청 시 unique 제약 위반 → 기존 assignment 조회
    const isUniqueViolation =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002";

    if (isUniqueViolation) {
      const existing = await prisma.assignment.findUnique({
        where: {
          experimentId_userKey: { experimentId, userKey },
        },
        include: { variant: true },
      });
      if (existing) {
        return {
          assignmentId: existing.id,
          experimentId: existing.experimentId,
          variantId: existing.variantId,
          variantKey: existing.variant.key,
          payload: existing.variant.payload as unknown,
        };
      }
    }
    return { code: "DB_ERROR", cause: err };
  }
}

/** AssignmentError 여부 판별 */
export function isAssignmentError(
  result: AssignmentResult | AssignmentError
): result is AssignmentError {
  return "code" in result && result.code !== undefined;
}
