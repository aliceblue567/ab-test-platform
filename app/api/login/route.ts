/**
 * 커스텀 로그인 - NextAuth와 경로 분리
 */
import { encode } from "@auth/core/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const norm = (s: string) => s.trim().replace(/\r?\n/g, "");

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, string> = {};
    if (contentType.includes("application/json")) {
      body = (await req.json()) as Record<string, string>;
    } else {
      const params = new URLSearchParams(await req.text());
      body = Object.fromEntries(params) as Record<string, string>;
    }

    const inputEmail = norm(String(body?.email ?? "")).toLowerCase();
    const inputPassword = norm(String(body?.password ?? ""));
    const callbackUrl = body?.callbackUrl ?? "/admin/experiments";

    const envEmail = norm(process.env.AUTH_ADMIN_EMAIL ?? "").toLowerCase();
    const envPassword = norm(process.env.AUTH_ADMIN_PASSWORD ?? "");

    const match = envEmail && envPassword && inputEmail === envEmail && inputPassword === envPassword;
    if (!match) {
      return NextResponse.json(
        { error: "CredentialsSignin" },
        { status: 401 }
      );
    }

    let user = await prisma.user.findUnique({ where: { email: envEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: envEmail,
          name: "관리자",
          role: "admin",
        },
      });
    }

    const isSecure = req.nextUrl.protocol === "https:";
    const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

    const secret = process.env.AUTH_SECRET || "dev-secret-replace-in-production";
    const token = await encode({
      token: {
        sub: user.id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        id: user.id,
      },
      secret,
      salt: cookieName,
      maxAge: 30 * 24 * 60 * 60,
    });

    const res = NextResponse.json({ url: callbackUrl });
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Unknown" }, { status: 500 });
  }
}
