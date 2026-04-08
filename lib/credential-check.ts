/**
 * auth-diagnose·login·NextAuth credentials 공통 검증
 * - 환경 변수 단일 관리자 (AUTH_ADMIN_EMAIL / AUTH_ADMIN_PASSWORD)
 * - DB `User.passwordHash` (bcrypt) — 팀원 개별 계정
 * - AUTH_DEBUG 전용 테스트 계정
 */
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { USERS_PASSWORD_HASH_SQL } from "@/lib/db-password-hash-migration";

function missingColumnMeta(e: Prisma.PrismaClientKnownRequestError): string | null {
  const raw = (e.meta as { column?: unknown } | undefined)?.column;
  if (typeof raw !== "string") return null;
  const parts = raw.split(".");
  return parts[parts.length - 1] ?? null;
}

function fixSqlForMissingUserColumn(column: string | null): string {
  if (column === "password_hash") return USERS_PASSWORD_HASH_SQL;
  if (column === "role") {
    return `DO $$
BEGIN
  CREATE TYPE "UserRole" AS ENUM ('admin','member','viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'admin';`;
  }
  if (column === "createdAt") {
    return 'ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();';
  }
  if (column === "updatedAt") {
    return 'ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now();';
  }
  return USERS_PASSWORD_HASH_SQL;
}

function norm(s: string): string {
  return (
    String(s ?? "")
      .replace(/^\uFEFF/, "") // BOM
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .normalize("NFC")
  );
}

export type CredentialCheckResult = {
  match: boolean;
  email: string;
  inputEmail: string;
  inputPassword: string;
  envEmailSet: boolean;
  envPasswordSet: boolean;
  envMatch: boolean;
  knownMatch: boolean;
  emailMatch: boolean;
  passwordMatch: boolean;
  /** DB에 passwordHash가 있을 때 bcrypt로 통과했는지 */
  dbPasswordMatch?: boolean;
  /** Prisma P2022 — 배포 DB에 마이그레이션 미적용 */
  missingPasswordHashColumn?: boolean;
  missingUserColumn?: string;
  fixSql?: string;
  debugMismatch?: {
    inputEmailLen: number;
    envEmailLen: number;
    inputEmailFirstChar: number;
    envEmailFirstChar: number;
    inputPassFirstChar: number;
    envPassFirstChar: number;
  };
};

/**
 * 로그인 검증 (환경 변수 관리자 + DB 개인 비밀번호 + 디버그 계정).
 */
export async function verifyLoginCredentials(
  body: Record<string, unknown>
): Promise<CredentialCheckResult> {
  const inputEmail = norm(
    String(body?.email ?? body?.Email ?? "")
  ).toLowerCase();
  const inputPassword = norm(String(body?.password ?? body?.Password ?? ""));

  const envEmail = norm(process.env.AUTH_ADMIN_EMAIL ?? "").toLowerCase();
  const envPassword = norm(process.env.AUTH_ADMIN_PASSWORD ?? "");

  const emailMatch = inputEmail === envEmail;
  const passwordMatch = inputPassword === envPassword;
  const envMatch =
    !!envEmail && !!envPassword && emailMatch && passwordMatch;

  const debugBypass =
    process.env.AUTH_DEBUG === "true" &&
    inputEmail === "aliceblue567@gmail.com" &&
    inputPassword === "ABtest00!!";

  const debugMismatch =
    !envMatch && envEmail && envPassword
      ? {
          inputEmailLen: inputEmail.length,
          envEmailLen: envEmail.length,
          inputEmailFirstChar: inputEmail.charCodeAt(0),
          envEmailFirstChar: envEmail.charCodeAt(0),
          inputPassFirstChar: inputPassword.charCodeAt(0),
          envPassFirstChar: envPassword.charCodeAt(0),
        }
      : undefined;

  let match = envMatch || debugBypass;
  let resolvedEmail = envMatch
    ? envEmail
    : debugBypass
      ? "aliceblue567@gmail.com"
      : inputEmail;

  let dbPasswordMatch: boolean | undefined;
  let missingPasswordHashColumn = false;
  let missingUserColumn: string | undefined;

  if (!match && inputEmail.length > 0 && inputPassword.length > 0) {
    try {
      const user = await prisma.user.findFirst({
        where: { email: { equals: inputEmail, mode: "insensitive" } },
        select: { id: true, email: true, passwordHash: true },
      });
      if (user?.passwordHash) {
        try {
          dbPasswordMatch = await bcrypt.compare(
            inputPassword,
            user.passwordHash
          );
        } catch {
          dbPasswordMatch = false;
        }
        if (dbPasswordMatch && user.email) {
          match = true;
          resolvedEmail = user.email.toLowerCase();
        }
      }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2022"
      ) {
        missingPasswordHashColumn = true;
        missingUserColumn = missingColumnMeta(e) ?? undefined;
      } else {
        throw e;
      }
    }
  }

  return {
    match,
    email: match ? resolvedEmail : inputEmail,
    inputEmail,
    inputPassword,
    envEmailSet: !!envEmail,
    envPasswordSet: !!envPassword,
    envMatch,
    knownMatch: debugBypass,
    emailMatch,
    passwordMatch,
    dbPasswordMatch,
    ...(missingPasswordHashColumn
      ? {
          missingPasswordHashColumn: true,
          ...(missingUserColumn ? { missingUserColumn } : {}),
          fixSql: fixSqlForMissingUserColumn(missingUserColumn ?? null),
        }
      : {}),
    debugMismatch,
  };
}

export async function parseRequestBody(
  req: Request,
  contentType: string
): Promise<Record<string, unknown>> {
  if (contentType.includes("application/json")) {
    return (await req.json()) as Record<string, unknown>;
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("form-urlencoded")
  ) {
    const params = new URLSearchParams(await req.text());
    return Object.fromEntries(params) as Record<string, unknown>;
  }
  const text = await req.text();
  if (text) {
    try {
      const params = new URLSearchParams(text);
      return Object.fromEntries(params) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}
