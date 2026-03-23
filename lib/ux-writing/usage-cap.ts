import { getSupabaseServiceClient } from "@/lib/ux-writing/guidelines";

/** 월간 검수 상한 미설정·0 이하 = 제한 없음 */
export function getMaxChecksPerMonth(): number {
  const n = Number(process.env.UX_WRITING_MAX_CHECKS_PER_MONTH);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), 1_000_000);
}

function currentMonthKeyUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class UsageCapExceededError extends Error {
  readonly maxPerMonth: number;

  constructor(maxPerMonth: number) {
    super(
      `이번 달 검수 한도(${maxPerMonth}회)에 도달했습니다. 다음 달에 다시 이용하거나, 관리자가 한도를 조정할 수 있습니다.`
    );
    this.name = "UsageCapExceededError";
    this.maxPerMonth = maxPerMonth;
  }
}

/**
 * OpenAI 호출 전: 한도 초과면 UsageCapExceededError.
 * Supabase `ux_writing_usage` 테이블 필요.
 */
export async function assertUxWritingQuotaAvailable(): Promise<void> {
  const max = getMaxChecksPerMonth();
  if (max <= 0) return;

  const supabase = getSupabaseServiceClient();
  const monthKey = currentMonthKeyUtc();

  const { data, error } = await supabase
    .from("ux_writing_usage")
    .select("month_key, count")
    .eq("id", "singleton")
    .maybeSingle();

  if (error) throw error;

  let count = 0;
  if (data && data.month_key === monthKey) {
    count = typeof data.count === "number" ? data.count : 0;
  }

  if (count >= max) {
    throw new UsageCapExceededError(max);
  }
}

/**
 * 검수 성공 후에만 호출. 실패 시 호출하지 않으면 한도만큼만 과금됨.
 */
export async function recordUxWritingCheckSuccess(): Promise<void> {
  const max = getMaxChecksPerMonth();
  if (max <= 0) return;

  const supabase = getSupabaseServiceClient();
  const monthKey = currentMonthKeyUtc();

  const { data: row, error: selErr } = await supabase
    .from("ux_writing_usage")
    .select("month_key, count")
    .eq("id", "singleton")
    .maybeSingle();

  if (selErr) throw selErr;

  let nextCount = 1;
  if (row && row.month_key === monthKey) {
    nextCount = (typeof row.count === "number" ? row.count : 0) + 1;
  }

  const { error: upErr } = await supabase.from("ux_writing_usage").upsert(
    {
      id: "singleton",
      month_key: monthKey,
      count: nextCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upErr) throw upErr;
}
