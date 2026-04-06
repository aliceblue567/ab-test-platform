/**
 * GET/POST 인사이트 랩 저장물 (벤치마크·플로우·화면) — 로그인 사용자별
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { InsightArtifactKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const kindSchema = z.nativeEnum(InsightArtifactKind);

const createSchema = z.object({
  kind: kindSchema,
  title: z.string().min(1).max(256),
  payload: z.record(z.string(), z.unknown()),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const list = await prisma.insightArtifact.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        kind: true,
        title: true,
        updatedAt: true,
        createdAt: true,
      },
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
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const row = await prisma.insightArtifact.create({
      data: {
        userId: session.user.id,
        kind: parsed.data.kind,
        title: parsed.data.title.trim(),
        payload: parsed.data.payload as object,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
