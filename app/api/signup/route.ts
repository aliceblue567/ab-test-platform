import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { USERS_PASSWORD_HASH_SQL } from "@/lib/db-password-hash-migration";
import { isSignupAvailable, verifySignupInvite } from "@/lib/signup-gate";

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

function userRoleEnumFixSql(): string {
  return `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('admin','member','viewer');
  END IF;
END $$;
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'member';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'viewer';`;
}

async function ensureUserRoleEnumForSignup() {
  await prisma.$executeRawUnsafe(`DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('admin','member','viewer');
  END IF;
END $$;`);
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'member';`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'viewer';`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'admin';`
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailDomainAllowed(email: string) {
  const raw = process.env.AUTH_SIGNUP_ALLOWED_EMAIL_DOMAINS ?? "";
  const allowed = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && allowed.includes(domain));
}

export async function POST(req: NextRequest) {
  if (!isSignupAvailable()) {
    return NextResponse.json(
      { error: "SIGNUP_DISABLED", message: "회원가입이 비활성화되어 있습니다." },
      { status: 403 }
    );
  }

  let body: {
    email?: string;
    password?: string;
    name?: string;
    inviteCode?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const inviteCheck = verifySignupInvite(body.inviteCode, body.email);
  if (!inviteCheck.ok) {
    return NextResponse.json(
      { error: inviteCheck.error, message: inviteCheck.message },
      { status: inviteCheck.error === "INVITE_INVALID" ? 403 : 400 }
    );
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name =
    typeof body.name === "string" ? body.name.trim() || undefined : undefined;

  if (!email.includes("@") || password.length < 8) {
    return NextResponse.json(
      {
        error: "VALIDATION",
        message: "이메일과 비밀번호(8자 이상)를 확인해 주세요.",
      },
      { status: 400 }
    );
  }

  if (!emailDomainAllowed(email)) {
    return NextResponse.json(
      {
        error: "DOMAIN_NOT_ALLOWED",
        message: "허용된 회사 이메일 도메인만 가입할 수 있습니다.",
      },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "EMAIL_TAKEN",
        message: "이미 가입된 이메일입니다. 로그인해 주세요.",
      },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "member",
      },
      select: { id: true },
    });
  } catch (e) {
    console.error("[signup] failed", e);
    const rawMsg = e instanceof Error ? e.message : String(e);
    const enumInvalid = rawMsg.includes(
      'invalid input value for enum "UserRole": "member"'
    );
    if (enumInvalid) {
      try {
        await ensureUserRoleEnumForSignup();
        await prisma.user.create({
          data: {
            email,
            name,
            passwordHash,
            role: "member",
          },
          select: { id: true },
        });
        return NextResponse.json({ ok: true, repaired: true });
      } catch (repairErr) {
        console.error("[signup] enum repair failed", repairErr);
        return NextResponse.json(
          {
            error: "DB_SCHEMA",
            code: "ENUM_USERROLE_INVALID",
            message:
              'DB enum "UserRole"에 member/viewer 값이 없습니다. SQL을 적용한 뒤 다시 시도해 주세요.',
            fixSql: userRoleEnumFixSql(),
          },
          { status: 503 }
        );
      }
    }

    const isSchemaErr =
      e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022";
    const missingColumn =
      isSchemaErr && e instanceof Prisma.PrismaClientKnownRequestError
        ? missingColumnMeta(e)
        : null;
    if (isSchemaErr) {
      return NextResponse.json(
        {
          error: "DB_SCHEMA",
          message: `DB 스키마가 최신이 아닙니다.${missingColumn ? ` 누락 컬럼: ${missingColumn}` : ""} SQL을 적용한 뒤 다시 시도해 주세요.`,
          fixSql: fixSqlForMissingUserColumn(missingColumn),
          ...(missingColumn ? { missingColumn } : {}),
        },
        { status: 503 }
      );
    }

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          error: "DB_ERROR",
          code: e.code,
          message:
            "가입 처리 중 DB 오류가 발생했습니다. 관리자에게 오류 코드를 전달해 주세요.",
        },
        { status: 500 }
      );
    }

    if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      const msg = e.message || "";
      if (msg.includes('invalid input value for enum "UserRole"')) {
        return NextResponse.json(
          {
            error: "DB_SCHEMA",
            code: "ENUM_USERROLE_INVALID",
            message:
              'DB enum "UserRole"에 member/viewer 값이 없습니다. SQL을 적용한 뒤 다시 시도해 주세요.',
            fixSql: userRoleEnumFixSql(),
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error: "DB_ERROR",
          code: "DB_UNKNOWN",
          message:
            "가입 처리 중 알 수 없는 DB 오류가 발생했습니다. 관리자에게 문의해 주세요.",
        },
        { status: 500 }
      );
    }

    if (e instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          error: "DB_CONNECTION",
          code: "DB_INIT",
          message:
            "DB 연결에 실패했습니다. DATABASE_URL 또는 DB 네트워크 접근을 확인해 주세요.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "DB_ERROR",
        code: "UNKNOWN",
        message: "가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
