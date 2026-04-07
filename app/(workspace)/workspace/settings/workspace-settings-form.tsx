"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VERCEL_ENV_DOC =
  "https://vercel.com/docs/projects/environment-variables";

type Props = {
  gateEnabled: boolean;
};

export function WorkspaceSettingsForm({ gateEnabled }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          팀 워크스페이스 옵션·초대는 관리자에게 문의하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">플랫폼 진입 (게이트)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            내부 도구 전체에{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
              ADMIN_PASSWORD
            </code>
            게이트가 켜져 있으면, 먼저 공용 비밀번호를 통과한 뒤 로그인합니다.
          </p>
          <p>
            상태:{" "}
            <span className="font-medium text-foreground">
              {gateEnabled ? "게이트 사용 중" : "게이트 비활성"}
            </span>
          </p>
          {gateEnabled && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/gate">게이트 페이지 (재인증)</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">문서</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" asChild>
            <a href={VERCEL_ENV_DOC} target="_blank" rel="noopener noreferrer">
              Vercel 환경 변수 도움말
            </a>
          </Button>
          <p>
            저장소:{" "}
            <code className="rounded bg-muted px-1 text-foreground">
              DEPLOY_GUIDE.md
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 text-foreground">
              AUTH_SETUP.md
            </code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">세션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            상단 프로필 메뉴에서도 로그아웃할 수 있습니다.
          </p>
          <Button
            variant="outline"
            onClick={() => void signOut({ callbackUrl: "/workspace/login" })}
          >
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
