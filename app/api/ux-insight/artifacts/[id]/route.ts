import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing id", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const row = await prisma.insightArtifact.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!row) {
    return NextResponse.json(
      { error: "Not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }
  return NextResponse.json(row);
}

export async function PATCH(req: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing id", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const existing = await prisma.insightArtifact.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Not found", code: "NOT_FOUND" },
      { status: 404 }
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.insightArtifact.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined && {
        title: parsed.data.title.trim(),
      }),
      ...(parsed.data.payload !== undefined && {
        payload: parsed.data.payload as object,
      }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing id", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const existing = await prisma.insightArtifact.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await prisma.insightArtifact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
