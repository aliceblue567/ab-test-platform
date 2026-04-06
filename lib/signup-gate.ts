import { createHash, timingSafeEqual } from "crypto";

/**
 * 가입 허용 조건 (하나만 만족하면 됨)
 * - AUTH_SIGNUP_ENABLED=true → 초대 코드 없이 가입 가능
 * - AUTH_SIGNUP_INVITE_CODE 가 비어 있지 않음 → 같은 문자열을 입력한 사람만 가입
 */
export function isSignupAvailable(): boolean {
  const open = process.env.AUTH_SIGNUP_ENABLED === "true";
  const invite = (process.env.AUTH_SIGNUP_INVITE_CODE ?? "").trim();
  return open || invite.length > 0;
}

/** UI/API: 초대 코드 입력이 필수인지 (공개 가입이 아닐 때) */
export function inviteCodeRequired(): boolean {
  if (process.env.AUTH_SIGNUP_ENABLED === "true") return false;
  return (process.env.AUTH_SIGNUP_INVITE_CODE ?? "").trim().length > 0;
}

function inviteMatches(provided: string, expected: string): boolean {
  const ha = createHash("sha256").update(provided, "utf8").digest();
  const hb = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function verifySignupInvite(
  bodyInvite: unknown
): { ok: true } | { ok: false; error: string; message: string } {
  const open = process.env.AUTH_SIGNUP_ENABLED === "true";
  if (open) return { ok: true };

  const expected = (process.env.AUTH_SIGNUP_INVITE_CODE ?? "").trim();
  if (!expected) {
    return {
      ok: false,
      error: "SIGNUP_DISABLED",
      message: "회원가입이 비활성화되어 있습니다.",
    };
  }

  const provided =
    typeof bodyInvite === "string" ? bodyInvite.trim() : "";
  if (!provided) {
    return {
      ok: false,
      error: "INVITE_REQUIRED",
      message: "팀 초대 코드를 입력해 주세요.",
    };
  }
  if (!inviteMatches(provided, expected)) {
    return {
      ok: false,
      error: "INVITE_INVALID",
      message: "초대 코드가 올바르지 않습니다.",
    };
  }
  return { ok: true };
}
