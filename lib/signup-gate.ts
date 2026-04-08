import { createHash, timingSafeEqual } from "crypto";

type InviteRosterRow = {
  email: string;
  code: string;
};

/**
 * AUTH_SIGNUP_INVITES 형식 (줄바꿈 또는 세미콜론 구분):
 *   email,inviteCode
 * 예:
 *   a@company.com,INVITE-A
 *   b@company.com,INVITE-B
 */
function parseInviteRoster(raw: string): InviteRosterRow[] {
  const rows = raw
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: InviteRosterRow[] = [];
  for (const row of rows) {
    const parts = row.split(",").map((s) => s.trim());
    // 신규 형식: email,code / 구형 형식: email,password,code (password는 무시)
    const emailRaw = parts[0];
    const codeRaw = parts.length >= 3 ? parts[2] : parts[1];
    if (!emailRaw || !codeRaw) continue;
    out.push({
      email: emailRaw.toLowerCase(),
      code: codeRaw,
    });
  }
  return out;
}

function getInviteRoster(): InviteRosterRow[] {
  return parseInviteRoster(process.env.AUTH_SIGNUP_INVITES ?? "");
}

/**
 * 가입 허용 조건 (하나만 만족하면 됨)
 * - AUTH_SIGNUP_ENABLED=true → 초대 코드 없이 가입 가능
 * - AUTH_SIGNUP_INVITE_CODE 가 비어 있지 않음 → 같은 문자열을 입력한 사람만 가입
 * - AUTH_SIGNUP_INVITES 가 있으면 명단 기반(이메일·비번·코드) 가입 허용
 */
export function isSignupAvailable(): boolean {
  const open = process.env.AUTH_SIGNUP_ENABLED === "true";
  const invite = (process.env.AUTH_SIGNUP_INVITE_CODE ?? "").trim();
  const roster = getInviteRoster();
  return open || invite.length > 0 || roster.length > 0;
}

/** UI/API: 초대 코드 입력이 필수인지 (공개 가입이 아닐 때) */
export function inviteCodeRequired(): boolean {
  if (process.env.AUTH_SIGNUP_ENABLED === "true") return false;
  if (getInviteRoster().length > 0) return true;
  return (process.env.AUTH_SIGNUP_INVITE_CODE ?? "").trim().length > 0;
}

function inviteMatches(provided: string, expected: string): boolean {
  const ha = createHash("sha256").update(provided, "utf8").digest();
  const hb = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function verifySignupInvite(
  bodyInvite: unknown,
  bodyEmail?: unknown
): { ok: true } | { ok: false; error: string; message: string } {
  const open = process.env.AUTH_SIGNUP_ENABLED === "true";
  if (open) return { ok: true };

  const roster = getInviteRoster();
  if (roster.length > 0) {
    const email =
      typeof bodyEmail === "string" ? bodyEmail.trim().toLowerCase() : "";
    const providedCode =
      typeof bodyInvite === "string" ? bodyInvite.trim() : "";

    if (!email || !providedCode) {
      return {
        ok: false,
        error: "INVITE_REQUIRED",
        message:
          "초대받은 이메일과 초대 코드를 모두 입력해 주세요.",
      };
    }

    const row = roster.find((r) => r.email === email);
    if (!row) {
      return {
        ok: false,
        error: "INVITE_INVALID",
        message: "초대된 이메일이 아닙니다. 관리자에게 확인해 주세요.",
      };
    }
    if (!inviteMatches(providedCode, row.code)) {
      return {
        ok: false,
        error: "INVITE_INVALID",
        message: "초대 코드가 올바르지 않습니다.",
      };
    }
    return { ok: true };
  }

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
