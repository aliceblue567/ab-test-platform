/**
 * GET /api/reports/[id] - 실험 리포트
 * event_logs 기준 unique user 집계, uplift, winner
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessExperimentRow } from "@/lib/experiment-access";
import { z } from "zod";
import { getReportSummary } from "@/src/lib/stats";

export async function GET(
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

    const experiment = await prisma.experiment.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        name: true,
        status: true,
        ownerId: true,
      },
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

    const summary = await getReportSummary(id);
    if (!summary) {
      return NextResponse.json(
        { error: "Insufficient variant data (need at least 2 variants)", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      experiment: {
        id: experiment.id,
        key: experiment.key,
        name: experiment.name,
        status: experiment.status,
      },
      summary: summary.summary,
      variants: summary.variants,
    });
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
