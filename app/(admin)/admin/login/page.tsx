"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin/experiments";
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(urlError ? "이메일 또는 비밀번호가 올바르지 않습니다." : null);
  const [loading, setLoading] = useState(false);
  const [diagnose, setDiagnose] = useState<string | null>(null);

  const getFormValues = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    return {
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? "").trim(),
    };
  };

  const handleDiagnose = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDiagnose(null);
    setLoading(true);
    const form = (e.currentTarget as HTMLButtonElement).form;
    if (!form) return;
    const { email: eVal, password: pVal } = getFormValues(form);
    try {
      const res = await fetch("/api/debug/auth-diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: eVal,
          password: pVal,
          csrfToken: "x",
          callbackUrl,
        }).toString(),
      });
      const data = await res.json();
      setDiagnose(
        JSON.stringify(
          { ...data, clientSent: { emailLen: eVal.length, passwordLen: pVal.length } },
          null,
          2
        )
      );
    } catch {
      setDiagnose("진단 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">관리자 로그인</h1>
          <p className="text-sm text-muted-foreground text-center">
            A/B 테스트 플랫폼 관리자 전용
          </p>
        </CardHeader>
        <CardContent>
          <form
            action="/api/login"
            method="POST"
            autoComplete="off"
            className="space-y-4"
          >
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <input type="hidden" name="redirect" value="1" />
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aliceblue567@gmail.com"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                autoComplete="off"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              로그인
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={(e) => handleDiagnose(e)}
              disabled={loading}
            >
              원인 확인
            </Button>
            {diagnose && (
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                {diagnose}
              </pre>
            )}
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            환경 변수 AUTH_ADMIN_EMAIL, AUTH_ADMIN_PASSWORD로 설정된 계정으로 로그인합니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            로그인 안 될 때: Vercel에서 Production·Preview 둘 다 env 설정 확인. 또는 AUTH_DEBUG=true 추가 후 <code className="bg-muted px-1 rounded">debug@abtest.com</code> / <code className="bg-muted px-1 rounded">DebugLogin2025!</code> 로 테스트.
          </p>
          <div className="mt-4 text-center">
            <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
              ← 관리자 홈으로
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
