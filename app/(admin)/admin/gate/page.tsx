"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function GateForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin/login";
  const configError = searchParams.get("error") === "config";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    configError
      ? "ADMIN_PASSWORD는 설정되어 있지만 AUTH_SECRET이 없습니다. Vercel에 AUTH_SECRET을 추가하세요."
      : null
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "인증에 실패했습니다."
        );
        return;
      }
      const next =
        callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/admin/login";
      window.location.href = next;
    } catch {
      setError("요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-center text-2xl font-bold">관리자 영역</h1>
          <p className="text-center text-sm text-muted-foreground">
            팀 테스트용 1차 비밀번호를 입력하세요. (환경 변수{" "}
            <code className="rounded bg-muted px-1 text-xs">ADMIN_PASSWORD</code>
            )
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            {error ? (
              <div
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="admin-gate-pw">비밀번호</Label>
              <Input
                id="admin-gate-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="관리자에게 전달받은 비밀번호"
                autoComplete="off"
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "확인 중…" : "계속"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              통과 후{" "}
              <Link href="/admin/login" className="underline underline-offset-2">
                관리자 로그인
              </Link>
              으로 이동합니다.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminGatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">로딩 중…</p>
        </div>
      }
    >
      <GateForm />
    </Suspense>
  );
}
