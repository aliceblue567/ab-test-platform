/**
 * GET — 대시보드용 실험 집계 (권한 범위: 관리자 전체 / 팀원 본인 소유)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { experimentsListWhere } from "@/lib/experiment-access";

const select = {
  id: true,
  key: true,
  name: true,
  status: true,
  updatedAt: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const scope = experimentsListWhere(session) ?? {};

    const [running, recentOther] = await Promise.all([
      prisma.experiment.findMany({
        where: { ...scope, status: "running" },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select,
      }),
      prisma.experiment.findMany({
        where: { ...scope, status: { not: "running" } },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select,
      }),
    ]);

    return NextResponse.json({
      running,
      recentOther,
      runningCount: running.length,
    });
  } catch (e) {
    console.error("[dashboard/summary]", e);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
