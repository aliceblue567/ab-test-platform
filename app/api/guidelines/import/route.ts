/**
 * POST /api/guidelines/import — CSV에서 파싱된 행 배열 일괄 upsert (rule_name 유일)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServiceClient } from "@/lib/ux-writing/guidelines";
import {
  dedupeByRuleName,
  guidelineImportPayloadSchema,
} from "@/lib/ux-writing/guideline-import";
import { normalizeExamples } from "@/lib/ux-writing/guideline-schemas";

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

  const parsed = guidelineImportPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const items = dedupeByRuleName(parsed.data.items);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "No valid rows after deduplication", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const ruleNames = items.map((i) => i.rule_name);

  try {
    const supabase = getSupabaseServiceClient();

    const { data: existingRows, error: selErr } = await supabase
      .from("guidelines")
      .select("rule_name, is_active")
      .in("rule_name", ruleNames);

    if (selErr) throw selErr;

    const existingMap = new Map(
      (existingRows ?? []).map((r) => [r.rule_name as string, r.is_active as boolean])
    );

    const now = new Date().toISOString();
    const upsertPayload = items.map((row) => {
      const ex = normalizeExamples(row.example_bad, row.example_good);
      return {
        category: row.category,
        rule_name: row.rule_name,
        description: row.description,
        example_bad: ex.example_bad,
        example_good: ex.example_good,
        is_active: existingMap.get(row.rule_name) ?? true,
        updated_at: now,
      };
    });

    const { error: upErr } = await supabase.from("guidelines").upsert(upsertPayload, {
      onConflict: "rule_name",
    });

    if (upErr) throw upErr;

    return NextResponse.json({
      count: upsertPayload.length,
      message: `${upsertPayload.length}개의 가이드라인이 업데이트되었습니다`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
