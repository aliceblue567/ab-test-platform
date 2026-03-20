/**
 * 폼 POST 전용 로그인 - 302 리다이렉트로 쿠키 설정 (fetch보다 안정적)
 */
import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { prisma } from "@/lib/db";
import {
  checkCredentials,
  parseRequestBody,
} from "@/lib/credential-check";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = await parseRequestBody(req, contentType);
    const result = checkCredentials(body);
    const callbackUrl = String(body?.callbackUrl ?? "/admin/experiments");
    const loginUrl = new URL("/admin/login", req.url);

    if (!result.match) {
      loginUrl.searchParams.set("error", "CredentialsSignin");
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      return NextResponse.redirect(loginUrl);
    }

    let user = await prisma.user.findUnique({ where: { email: result.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: result.email,
          name: "관리자",
          role: "admin",
        },
      });
    }

    const isSecure =
      req.nextUrl.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https";
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

    const res = NextResponse.redirect(new URL(callbackUrl, req.url));
    res.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return res;
  } catch (err) {
    console.error("[login-form]", err);
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("error", "Unknown");
    return NextResponse.redirect(loginUrl);
  }
}
