/**
 * GET /api/experiments/[id] - 실험 조회
 * PATCH /api/experiments/[id] - 실험 수정 (관리자)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessExperimentRow } from "@/lib/experiment-access";
import { z } from "zod";
import { updateExperimentSchema } from "@/src/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Experiment ID is required", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!experiment) {
      return NextResponse.json(
        { error: "Experiment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!canAccessExperimentRow(session, experiment)) {
      return NextResponse.json(
        { error: "Experiment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(experiment);
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Experiment ID is required", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = updateExperimentSchema.parse(body);

    const experiment = await prisma.experiment.findUnique({
      where: { id },
    });

    if (!experiment) {
      return NextResponse.json(
        { error: "Experiment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!canAccessExperimentRow(session, experiment)) {
      return NextResponse.json(
        { error: "Experiment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await prisma.experiment.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.primaryGoalKey !== undefined && { primaryGoalKey: data.primaryGoalKey }),
        ...(data.primaryGoalCustom !== undefined && { primaryGoalCustom: data.primaryGoalCustom }),
        ...(data.trafficAllocation !== undefined && {
          trafficAllocation: data.trafficAllocation,
        }),
      },
      include: { variants: true },
    });

    if (data.variants?.length) {
      for (const v of data.variants) {
        await prisma.variant.update({
          where: { id: v.id },
          data: {
            ...(v.name !== undefined && { name: v.name }),
            ...(v.weight !== undefined && { weight: v.weight }),
            ...(v.payload !== undefined && { payload: v.payload as object }),
          },
        });
      }
    }

    const result = await prisma.experiment.findUnique({
      where: { id },
      include: { variants: true },
    });

    return NextResponse.json(result ?? updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
