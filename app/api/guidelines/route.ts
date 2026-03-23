/**
 * GET /api/guidelines — 가이드라인 전체 (관리자, 세션)
 * POST /api/guidelines — 가이드라인 추가 (관리자, 세션)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServiceClient, fetchAllGuidelines } from "@/lib/ux-writing/guidelines";
import {
  createGuidelineSchema,
  normalizeExamples,
} from "@/lib/ux-writing/guideline-schemas";
import { toApiErrorMessage } from "@/lib/api-error";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const list = await fetchAllGuidelines();
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: toApiErrorMessage(e), code: "INTERNAL_ERROR" },
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

  const parsed = createGuidelineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ex = normalizeExamples(
    parsed.data.example_bad,
    parsed.data.example_good
  );

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("guidelines")
      .insert({
        category: parsed.data.category.trim(),
        rule_name: parsed.data.rule_name.trim(),
        description: parsed.data.description.trim(),
        example_bad: ex.example_bad,
        example_good: ex.example_good,
        is_active: parsed.data.is_active,
      })
      .select(
        "id, category, rule_name, description, example_bad, example_good, is_active"
      )
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: toApiErrorMessage(e), code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
