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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          csrfToken,
          callbackUrl,
          json: true,
        }),
        redirect: "manual",
      });
      const location = res.headers.get("Location");
      if (res.status === 302 && location && !location.includes("error=")) {
        window.location.href = location;
        return;
      }
      if (res.status === 302 && location?.includes("CredentialsSignin")) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      const data = res.headers.get("Content-Type")?.includes("json") ? await res.json().catch(() => ({})) : {};
      if (data?.url && !data.url.includes("error=")) {
        window.location.href = data.url;
        return;
      }
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
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
