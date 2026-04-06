/**
 * credentials callback 전용 라우트 - [...nextauth]보다 우선
 * lib/credential-check와 동일한 검증 로직 사용
 */
import { encode } from "@auth/core/jwt";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCredentialsUser } from "@/lib/auth-session-user";
import {
  parseRequestBody,
  verifyLoginCredentials,
} from "@/lib/credential-check";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = await parseRequestBody(req, contentType);
    const callbackUrl = String(body?.callbackUrl ?? "/admin/experiments");
    const result = await verifyLoginCredentials(body);

    if (!result.match) {
      return NextResponse.redirect(
        new URL(`/admin/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`, req.url)
      );
    }

    const user = await getOrCreateCredentialsUser(
      result.email,
      !result.dbPasswordMatch
    );
    if (!user) {
      return NextResponse.redirect(
        new URL(`/admin/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`, req.url)
      );
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
    console.error("[credentials callback]", err);
    return NextResponse.redirect(new URL("/admin/login?error=Unknown", req.url));
  }
}
