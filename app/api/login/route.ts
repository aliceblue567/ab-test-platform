/**
 * 커스텀 로그인 - lib/credential-check와 auth-diagnose와 동일한 검증 로직 사용
 */
import { encode } from "@auth/core/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  checkCredentials,
  parseRequestBody,
} from "@/lib/credential-check";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = await parseRequestBody(req, contentType);
    const callbackUrl = String(body?.callbackUrl ?? "/admin/experiments");
    const result = checkCredentials(body);

    if (!result.match) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("error", "CredentialsSignin");
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      const useRedirect = body?.redirect === "1" || body?.redirect === "true";
      if (useRedirect) {
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.json(
        {
          error: "CredentialsSignin",
          debug: {
            receivedKeys: Object.keys(body),
            inputEmailLen: result.inputEmail.length,
            inputPasswordLen: result.inputPassword.length,
            envEmailSet: result.envEmailSet,
            envPasswordSet: result.envPasswordSet,
            envMatch: result.envMatch,
            knownMatch: result.knownMatch,
          },
        },
        { status: 401 }
      );
    }

    const email = result.email;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
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

    const useRedirect = body?.redirect === "1" || body?.redirect === "true";
    const res = useRedirect
      ? NextResponse.redirect(new URL(callbackUrl, req.url))
      : NextResponse.json({ url: callbackUrl });
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
