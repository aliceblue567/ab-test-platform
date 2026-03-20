/**
 * 로그인 요청이 Auth callback과 동일하게 파싱되는지 진단
 * lib/credential-check와 동일한 파싱·검증 로직 사용
 */
import { NextResponse } from "next/server";
import {
  checkCredentials,
  parseRequestBody,
} from "@/lib/credential-check";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = await parseRequestBody(req, contentType);
    const result = checkCredentials(body);

    return NextResponse.json({
      receivedKeys: Object.keys(body),
      contentType,
      inputEmailLen: result.inputEmail.length,
      inputPasswordLen: result.inputPassword.length,
      envEmailSet: result.envEmailSet,
      envPasswordSet: result.envPasswordSet,
      emailMatch: result.emailMatch,
      passwordMatch: result.passwordMatch,
      bothMatch: result.match,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 400 }
    );
  }
}
