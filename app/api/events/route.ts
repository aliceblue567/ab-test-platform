/**
 * POST /api/events - 이벤트 로깅
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { eventInputSchema } from "@/src/lib/validation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = eventInputSchema.parse(body);

    const experiment = await prisma.experiment.findUnique({
      where: { id: data.experimentId },
    });

    if (!experiment) {
      return NextResponse.json(
        { error: "Experiment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const eventLog = await prisma.eventLog.create({
      data: {
        experimentId: data.experimentId,
        variantKey: data.variantKey,
        userKey: data.userKey,
        sessionKey: data.sessionKey ?? null,
        eventName: data.eventName,
        eventValue: data.eventValue ?? null,
        eventProps: data.metadata ?? null,
      },
    });

    return NextResponse.json({ id: eventLog.id }, { status: 201 });
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
