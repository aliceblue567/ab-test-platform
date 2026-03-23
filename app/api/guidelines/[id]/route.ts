/**
 * PATCH /api/guidelines/[id] — 수정 (활성 토글 포함)
 * DELETE /api/guidelines/[id] — 삭제
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServiceClient } from "@/lib/ux-writing/guidelines";
import {
  emptyToNull,
  updateGuidelineSchema,
} from "@/lib/ux-writing/guideline-schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = updateGuidelineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const d = parsed.data;
  if (d.category !== undefined) patch.category = d.category.trim();
  if (d.rule_name !== undefined) patch.rule_name = d.rule_name.trim();
  if (d.description !== undefined) patch.description = d.description.trim();
  if (d.is_active !== undefined) patch.is_active = d.is_active;
  if (d.example_bad !== undefined) patch.example_bad = emptyToNull(d.example_bad);
  if (d.example_good !== undefined) patch.example_good = emptyToNull(d.example_good);

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("guidelines")
      .update(patch)
      .eq("id", id)
      .select(
        "id, category, rule_name, description, example_bad, example_good, is_active"
      )
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
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

  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("guidelines").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
