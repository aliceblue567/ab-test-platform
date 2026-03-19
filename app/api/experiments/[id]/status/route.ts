/**
 * POST /api/experiments/[id]/status - 실험 상태 변경 (관리자)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { experimentStatusSchema } from "@/src/lib/validation";

export async function POST(
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
    const { status } = experimentStatusSchema.parse(body);

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

    const updated = await prisma.experiment.update({
      where: { id },
      data: {
        status,
        ...(status === "running" && {
          startAt: experiment.startAt ?? new Date(),
        }),
        ...(status === "completed" && {
          endAt: new Date(),
        }),
      },
      include: { variants: true },
    });

    return NextResponse.json(updated);
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
