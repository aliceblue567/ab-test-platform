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

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = await parseRequestBody(req, contentType);
    const callbackUrl = String(body?.callbackUrl ?? "/admin/experiments");
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
            dbPasswordMatch: result.dbPasswordMatch,
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
    const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

    const secret = process.env.AUTH_SECRET || "dev-secret-replace-in-production";
    const token = await encode({
      token: buildCredentialsJwtFields(user),
      secret,
      salt: cookieName,
      maxAge,
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
      maxAge,
    });

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
