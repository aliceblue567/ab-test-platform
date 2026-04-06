/**
 * PATCH /api/api-keys/[id] — 이름 변경, 비활성화
 * DELETE /api/api-keys/[id] — 삭제
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { guardAdmin } from "@/lib/require-admin";
import { getSupabaseServiceClient } from "@/lib/ux-writing/guidelines";
import { updateApiKeySchema } from "@/lib/ux-writing/api-key-schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const session = await auth();
  const denied = guardAdmin(session);
  if (denied) return denied;

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

  const parsed = updateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .update(patch)
      .eq("id", id)
      .select(
        "id, name, key_prefix, is_active, created_at, updated_at, last_used_at"
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
  const denied = guardAdmin(session);
  if (denied) return denied;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing id", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("api_keys").delete().eq("id", id);

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
