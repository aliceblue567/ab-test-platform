/**
 * POST /api/assign
 * 실험 key + userKey로 variant 할당 요청
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrCreateAssignment,
  isAssignmentError,
} from "@/src/lib/assignment";
import { assignmentInputSchema } from "@/src/lib/validation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { experimentKey, userKey } = assignmentInputSchema.parse(body);
    const result = await getOrCreateAssignment(experimentKey, userKey);

    if (isAssignmentError(result)) {
      const status =
        result.code === "EXPERIMENT_NOT_FOUND" ? 404 :
        result.code === "EXPERIMENT_NOT_RUNNING" ? 409 : 500;
      return NextResponse.json(
        { error: result.code },
        { status }
      );
    }

    return NextResponse.json({
      experimentId: result.experimentId,
      variantId: result.variantId,
      variantKey: result.variantKey,
      payload: result.payload,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
