"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const isConfigError =
    error === "Configuration" ||
    error === "AccessDenied" ||
    !error;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <h1 className="text-xl font-bold text-destructive">인증 설정 오류</h1>
          <p className="text-sm text-muted-foreground">
            로그인을 사용하려면 서버 환경 변수를 설정해주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">Vercel 대시보드에서 다음 변수를 추가하세요:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code className="text-foreground">AUTH_SECRET</code> — <code>openssl rand -base64 32</code>로 생성</li>
              <li><code className="text-foreground">AUTH_ADMIN_EMAIL</code> — 로그인 이메일</li>
              <li><code className="text-foreground">AUTH_ADMIN_PASSWORD</code> — 로그인 비밀번호</li>
              <li><code className="text-foreground">AUTH_TRUST_HOST</code> — <code>true</code></li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            설정 후 프로젝트를 Redeploy 해주세요.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/login">로그인 다시 시도</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin">관리자 홈</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
