/**
 * 커스텀 로그인 - lib/credential-check와 auth-diagnose와 동일한 검증 로직 사용
 */
import { encode } from "@auth/core/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCredentialsUser } from "@/lib/auth-session-user";
import {
  parseRequestBody,
  verifyLoginCredentials,
} from "@/lib/credential-check";
import { buildCredentialsJwtFields } from "@/lib/auth-jwt-payload";
import { loginPagePathForCallback } from "@/lib/auth-login-redirect";
import { getSessionMaxAgeForRole } from "@/lib/auth-session-max-age";

const SECURE_COOKIE_NAME = "__Secure-authjs.session-token";
const PLAIN_COOKIE_NAME = "authjs.session-token";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = await parseRequestBody(req, contentType);
    const callbackUrl = String(body?.callbackUrl ?? "/admin/dashboard");
    const loginPath = loginPagePathForCallback(callbackUrl);
    const result = await verifyLoginCredentials(body);

    if (!result.match) {
      const loginUrl = new URL(loginPath, req.url);
      loginUrl.searchParams.set("error", "CredentialsSignin");
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      const useRedirect = body?.redirect === "1" || body?.redirect === "true";
      if (useRedirect) {
        return NextResponse.redirect(loginUrl);
      }
      // 스키마 누락 안내(DB 마이그레이션 SQL)는 자격 증명 정보가 아니므로 항상 반환.
      // 그 외 상세 디버그 정보(env 설정 여부, 매치 결과 등)는 AUTH_DEBUG=true일 때만
      // 반환 — 익명 요청으로 계정 존재/설정 여부를 추측할 수 있는 정보 노출 방지.
      const authDebugOn = process.env.AUTH_DEBUG === "true";
      return NextResponse.json(
        {
          error: "CredentialsSignin",
          debug: {
            missingPasswordHashColumn: result.missingPasswordHashColumn,
            missingUserColumn: result.missingUserColumn,
            ...(result.fixSql ? { fixSql: result.fixSql } : {}),
            ...(authDebugOn
              ? {
                  receivedKeys: Object.keys(body),
                  inputEmailLen: result.inputEmail.length,
                  inputPasswordLen: result.inputPassword.length,
                  envEmailSet: result.envEmailSet,
                  envPasswordSet: result.envPasswordSet,
                  envMatch: result.envMatch,
                  knownMatch: result.knownMatch,
                  dbPasswordMatch: result.dbPasswordMatch,
                }
              : {}),
          },
        },
        { status: 401 }
      );
    }

    const user = await getOrCreateCredentialsUser(
      result.email,
      !result.dbPasswordMatch
    );
    if (!user) {
      const loginUrl = new URL(loginPath, req.url);
      loginUrl.searchParams.set("error", "CredentialsSignin");
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      const useRedirect = body?.redirect === "1" || body?.redirect === "true";
      if (useRedirect) return NextResponse.redirect(loginUrl);
      return NextResponse.json(
        { error: "CredentialsSignin", debug: { reason: "no_user_row" } },
        { status: 401 }
      );
    }

    const maxAge = getSessionMaxAgeForRole(user.role);

    const isSecure =
      req.nextUrl.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https";
    const secret =
      process.env.AUTH_SECRET ||
      (process.env.NODE_ENV === "development"
        ? "dev-secret-replace-in-production"
        : undefined);
    if (!secret) {
      throw new Error("AUTH_SECRET is required in production");
    }
    const secureToken = await encode({
      token: buildCredentialsJwtFields(user),
      secret,
      salt: SECURE_COOKIE_NAME,
      maxAge,
    });
    const plainToken = await encode({
      token: buildCredentialsJwtFields(user),
      secret,
      salt: PLAIN_COOKIE_NAME,
      maxAge,
    });

    const useRedirect = body?.redirect === "1" || body?.redirect === "true";
    const res = useRedirect
      ? NextResponse.redirect(new URL(callbackUrl, req.url))
      : NextResponse.json({ url: callbackUrl });
    // 런타임(Edge/Node)별 쿠키명 판단 차이를 피하기 위해 둘 다 발급
    res.cookies.set(PLAIN_COOKIE_NAME, plainToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    if (isSecure) {
      res.cookies.set(SECURE_COOKIE_NAME, secureToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge,
      });
    }

    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : "";
    console.error("[login]", err);
    return NextResponse.json(
      { error: msg, errorName: name },
      { status: 500 }
    );
  }
}
