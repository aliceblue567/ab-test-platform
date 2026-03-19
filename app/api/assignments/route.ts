/**
 * GET /api/assignments - assignment 목록 조회 (관리자)
 * Query: experimentId?, userKey?, limit?, offset?
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { assignmentQuerySchema } from "@/src/lib/validation";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = assignmentQuerySchema.parse({
      experimentId: searchParams.get("experimentId") ?? undefined,
      userKey: searchParams.get("userKey") ?? undefined,
      limit: searchParams.get("limit") ?? "50",
      offset: searchParams.get("offset") ?? "0",
    });

    const where = {
      ...(query.experimentId && { experimentId: query.experimentId }),
      ...(query.userKey && { userKey: query.userKey }),
    };

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { assignedAt: "desc" },
        include: {
          experiment: { select: { id: true, key: true, name: true, status: true } },
          variant: { select: { id: true, key: true, name: true } },
        },
      }),
      prisma.assignment.count({ where }),
    ]);

    return NextResponse.json({
      data: assignments,
      meta: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
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
