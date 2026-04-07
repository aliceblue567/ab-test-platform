/**
 * GET /api/experiments - 실험 목록
 * POST /api/experiments - 실험 생성 (관리자)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { experimentsListWhere } from "@/lib/experiment-access";
import { z } from "zod";
import { createExperimentSchema } from "@/src/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  try {
    const scope = experimentsListWhere(session);
    const list = await prisma.experiment.findMany({
      where: scope ?? {},
      orderBy: { updatedAt: "desc" },
      include: { variants: { select: { id: true, key: true, name: true } } },
    });
    return NextResponse.json(list);
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const data = createExperimentSchema.parse(body);

    const existing = await prisma.experiment.findUnique({
      where: { key: data.key },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Experiment key already exists", code: "CONFLICT" },
        { status: 409 }
      );
    }

    const userId = session.user.id as string;
    const experiment = await prisma.experiment.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description ?? null,
        primaryGoalKey: data.primaryGoalKey ?? null,
        primaryGoalCustom: data.primaryGoalCustom ?? null,
        trafficAllocation: data.trafficAllocation ?? 100,
        requireParticipantLinkToken: data.requireParticipantLinkToken ?? false,
        ownerId: userId,
        variants: {
          create: data.variants.map((v) => ({
            key: v.key,
            name: v.name,
            weight: v.weight,
            payload: v.payload as object,
            isControl: v.isControl ?? false,
          })),
        },
      },
      include: { variants: true },
    });

    return NextResponse.json(experiment, { status: 201 });
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
