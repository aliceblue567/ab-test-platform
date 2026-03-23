/**
 * GET /api/api-keys — 목록 (원문 키 미포함)
 * POST /api/api-keys — 키 생성 (응답에 secret 1회만 포함)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServiceClient } from "@/lib/ux-writing/guidelines";
import {
  buildKeyPrefixFromPlain,
  generateApiKeyPlain,
  hashApiKey,
} from "@/lib/ux-writing/api-key-crypto";
import { createApiKeySchema } from "@/lib/ux-writing/api-key-schemas";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select(
        "id, name, key_prefix, is_active, created_at, updated_at, last_used_at"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const plain = generateApiKeyPlain();
  const keyHash = hashApiKey(plain);
  const keyPrefix = buildKeyPrefixFromPlain(plain);

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        name: parsed.data.name.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        is_active: true,
      })
      .select("id, name, key_prefix, is_active, created_at")
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Insert failed", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ...data,
        secret: plain,
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
