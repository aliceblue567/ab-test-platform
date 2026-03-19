"use server";

import { signIn } from "@/lib/auth";
import { CredentialsSignin } from "next-auth";

export async function loginAction(email: string, password: string, callbackUrl: string) {
  try {
    const url = await signIn("credentials", {
      email: email.trim(),
      password: password.trim(),
      redirectTo: callbackUrl,
      redirect: false,
    });
    return { ok: true, url };
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    if (err instanceof Error && err.message === "DB_ERROR") {
      return { ok: false, error: "데이터베이스 연결 오류입니다. DATABASE_URL을 확인해주세요." };
    }
    return { ok: false, error: "로그인 중 오류가 발생했습니다." };
  }
}
