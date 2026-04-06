/**
 * 로그인 진단 + 로그인 실행 (동일 코드 경로로 diagnose 성공 시 로그인도 성공 보장)
 * X-Do-Login: true 헤더 시 credential 검증 후 세션 쿠키 설정
 */
import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { getOrCreateCredentialsUser } from "@/lib/auth-session-user";
import {
  parseRequestBody,
  verifyLoginCredentials,
} from "@/lib/credential-check";
import { buildCredentialsJwtFields } from "@/lib/auth-jwt-payload";
import { getSessionMaxAgeSeconds } from "@/lib/auth-session-max-age";

export async function POST(req: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.AUTH_DEBUG !== "true"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const doLogin = req.headers.get("x-do-login") === "true";
    const body = await parseRequestBody(req, contentType);
    const result = await verifyLoginCredentials(body);

    const diagnostic = {
      receivedKeys: Object.keys(body),
      contentType,
      inputEmailLen: result.inputEmail.length,
      inputPasswordLen: result.inputPassword.length,
      envEmailSet: result.envEmailSet,
      envPasswordSet: result.envPasswordSet,
      emailMatch: result.emailMatch,
      passwordMatch: result.passwordMatch,
      dbPasswordMatch: result.dbPasswordMatch,
      bothMatch: result.match,
      ...(result.debugMismatch && { debugMismatch: result.debugMismatch }),
    };

    if (!result.match) {
      return NextResponse.json(
        doLogin ? { error: "CredentialsSignin", ...diagnostic } : diagnostic,
        { status: doLogin ? 401 : 200 }
      );
    }

    if (doLogin) {
      const callbackUrl = String(body?.callbackUrl ?? "/admin/experiments");
      const user = await getOrCreateCredentialsUser(
        result.email,
        !result.dbPasswordMatch
      );
      if (!user) {
        return NextResponse.json(
          { error: "CredentialsSignin", reason: "no_user_row", ...diagnostic },
          { status: 401 }
        );
      }

      const isSecure =
        req.nextUrl.protocol === "https:" ||
        req.headers.get("x-forwarded-proto") === "https";
      const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
      const secret = process.env.AUTH_SECRET || "dev-secret-replace-in-production";
      const maxAge = getSessionMaxAgeSeconds();
      const token = await encode({
        token: buildCredentialsJwtFields(user),
        secret,
        salt: cookieName,
        maxAge,
      });

      const res = NextResponse.json({ url: callbackUrl, ...diagnostic });
      res.cookies.set(cookieName, token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge,
      });
      return res;
    }

    return NextResponse.json(diagnostic);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[auth-diagnose]", err);
    return NextResponse.json(
      { error: msg, ...(stack && { stack: stack.split("\n").slice(0, 5) }) },
      { status: 500 }
    );
  }
}
