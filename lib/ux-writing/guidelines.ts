import { createClient } from "@supabase/supabase-js";

export type GuidelineRow = {
  id: string;
  category: string;
  rule_name: string;
  description: string;
  example_bad: string | null;
  example_good: string | null;
  is_active: boolean;
};

const MAX_CATEGORY = 200;
const MAX_RULE = 200;
const MAX_DESC = 8000;
const MAX_EXAMPLE = 2000;

/** 제어 문자 제거 + 길이 제한 (프롬프트·DB 오염 방지) */
export function sanitizePromptText(input: string, max: number): string {
  const stripped = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return stripped.length <= max ? stripped : stripped.slice(0, max) + "…";
}

function asNonEmptyString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return sanitizePromptText(t, max);
}

/** Supabase 행이 깨져 있어도 안전한 GuidelineRow만 생성 */
export function parseGuidelineRow(raw: unknown): GuidelineRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const id = typeof o.id === "string" && o.id.length > 0 ? o.id : null;
  const category = asNonEmptyString(o.category, MAX_CATEGORY);
  const rule_name = asNonEmptyString(o.rule_name, MAX_RULE);
  const description = asNonEmptyString(o.description, MAX_DESC);
  if (!id || !category || !rule_name || !description) return null;

  const example_bad =
    o.example_bad == null || o.example_bad === ""
      ? null
      : asNonEmptyString(o.example_bad, MAX_EXAMPLE);
  const example_good =
    o.example_good == null || o.example_good === ""
      ? null
      : asNonEmptyString(o.example_good, MAX_EXAMPLE);

  const is_active = o.is_active !== false;

  return {
    id,
    category,
    rule_name,
    description,
    example_bad,
    example_good,
    is_active,
  };
}

export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * AI 분석용: 활성 규칙만. Supabase 오류·깨진 행은 로그 후 빈 배열/필터로 프롬프트 보호.
 */
export async function fetchGuidelines(): Promise<GuidelineRow[]> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("guidelines")
      .select(
        "id, category, rule_name, description, example_bad, example_good, is_active"
      )
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("rule_name", { ascending: true });

    if (error) {
      console.error("[fetchGuidelines] Supabase error:", error.message);
      return [];
    }

    const rows = (data ?? [])
      .map((raw) => parseGuidelineRow(raw))
      .filter((r): r is GuidelineRow => r !== null);

    if (rows.length < (data?.length ?? 0)) {
      console.warn(
        "[fetchGuidelines] 일부 행이 스키마 불일치로 제외되었습니다."
      );
    }

    return rows;
  } catch (e) {
    console.error("[fetchGuidelines] unexpected:", e);
    return [];
  }
}

/** 관리자 목록: 활성/비활성 포함 전체 */
export async function fetchAllGuidelines(): Promise<GuidelineRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("guidelines")
    .select(
      "id, category, rule_name, description, example_bad, example_good, is_active"
    )
    .order("category", { ascending: true })
    .order("rule_name", { ascending: true });

  if (error) throw error;
  const rows = (data ?? [])
    .map((raw) => parseGuidelineRow(raw))
    .filter((r): r is GuidelineRow => r !== null);
  return rows;
}

export function formatGuidelinesForSystemPrompt(rows: GuidelineRow[]): string {
  if (rows.length === 0) {
    return "회사 UX 라이팅 가이드라인이 아직 등록되어 있지 않습니다. 일반적인 UX 라이팅 모범 사례를 적용하세요.";
  }
  return rows
    .map((r, i) => {
      const cat = sanitizePromptText(r.category, MAX_CATEGORY);
      const name = sanitizePromptText(r.rule_name, MAX_RULE);
      const desc = sanitizePromptText(r.description, MAX_DESC);
      const bad = r.example_bad
        ? `\n  나쁜 예: ${sanitizePromptText(r.example_bad, MAX_EXAMPLE)}`
        : "";
      const good = r.example_good
        ? `\n  좋은 예: ${sanitizePromptText(r.example_good, MAX_EXAMPLE)}`
        : "";
      return `[${i + 1}] (${cat}) ${name}\n  설명: ${desc}${bad}${good}`;
    })
    .join("\n\n");
}
