import { getSupabaseServiceClient } from "@/lib/ux-writing/guidelines";
import {
  hashApiKey,
  timingSafeCompareEnv,
} from "@/lib/ux-writing/api-key-crypto";

const MSG_MISSING =
  "x-api-key 헤더가 없습니다. 관리자 콘솔에서 발급받은 키를 헤더에 넣어 주세요.";
const MSG_INVALID =
  "API 키가 유효하지 않거나 비활성화되었습니다. 키를 확인하거나 관리자에게 문의하세요.";

export type VerifyApiKeyResult =
  | { ok: true; keyId: string }
  | { ok: false; message: string };

/**
 * Supabase api_keys 테이블의 활성 키(해시 일치) 또는
 * (선택) 환경변수 UX_CHECK_API_KEY — 레거시 부트스트랩
 * keyId는 레이트 리밋 식별용(원문 키 노출 없음).
 */
export async function verifyUxCheckApiKey(
  headerValue: string | null
): Promise<VerifyApiKeyResult> {
  const trimmed = headerValue?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, message: MSG_MISSING };
  }

  const keyHash = hashApiKey(trimmed);

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select("id")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    if (data?.id) {
      void supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id);
      return { ok: true, keyId: `db:${data.id}` };
    }
  } catch (e) {
    console.error(
      "[verifyUxCheckApiKey] Supabase error:",
      e instanceof Error ? e.message : e
    );
    return { ok: false, message: MSG_INVALID };
  }

  const legacy = process.env.UX_CHECK_API_KEY;
  if (legacy && timingSafeCompareEnv(trimmed, legacy)) {
    return { ok: true, keyId: "legacy:env" };
  }

  return { ok: false, message: MSG_INVALID };
}
