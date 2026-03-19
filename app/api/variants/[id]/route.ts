/**
 * PATCH /api/variants/[id] - Variant 수정 (payload, name, weight)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { variantPayloadSchema } from "@/src/lib/validation";

const updateVariantSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  weight: z.number().min(0).max(100).optional(),
  payload: z.record(z.unknown()).optional(),
});

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
        { error: "Variant ID is required", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = updateVariantSchema.parse(body);

    if (data.payload) {
      variantPayloadSchema.parse(data.payload);
    }

    const variant = await prisma.variant.findUnique({ where: { id } });
    if (!variant) {
      return NextResponse.json(
        { error: "Variant not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await prisma.variant.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.payload !== undefined && { payload: data.payload as object }),
      },
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
