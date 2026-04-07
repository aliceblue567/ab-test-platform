"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VERCEL_ENV_DOC =
  "https://vercel.com/docs/projects/environment-variables";

type Props = {
  gateEnabled: boolean;
  hasAuthSecret: boolean;
  hasNextAuthUrl: boolean;
};

export function AdminSettingsForm({
  gateEnabled,
  hasAuthSecret,
  hasNextAuthUrl,
}: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          배포·보안·로그인은 환경 변수와 1차 게이트로 제어됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1차 게이트 (팀 공유 비밀번호)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
              ADMIN_PASSWORD
            </code>
            가 설정되어 있으면 `/admin`·`/insight`·`/workspace` 진입 전에 비밀번호를
            묻습니다. 서명에는{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
              AUTH_SECRET
            </code>
            이 필요합니다.
          </p>
          <p>
            현재 서버 기준:{" "}
            <span className="font-medium text-foreground">
              {gateEnabled ? "게이트 사용 중" : "게이트 비활성 (비밀번호 미설정)"}
            </span>
          </p>
          {gateEnabled && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/gate">게이트 페이지 열기 (재인증)</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">로그인·세션 (NextAuth)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code className="rounded bg-muted px-1 text-foreground">
                AUTH_SECRET
              </code>{" "}
              —{" "}
              {hasAuthSecret ? (
                <span className="text-foreground">설정됨</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-500">
                  미설정 (프로덕션에서 필수)
                </span>
              )}
            </li>
            <li>
              <code className="rounded bg-muted px-1 text-foreground">
                NEXTAUTH_URL
              </code>{" "}
              —{" "}
              {hasNextAuthUrl ? (
                <span className="text-foreground">설정됨</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-500">
                  미설정 (배포 URL과 일치해야 함)
                </span>
              )}
            </li>
            <li>
              <code className="rounded bg-muted px-1 text-foreground">
                AUTH_ADMIN_EMAIL
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1 text-foreground">
                AUTH_ADMIN_PASSWORD
              </code>{" "}
              — 관리자 계정
            </li>
          </ul>
          <p className="pt-2">
            자세한 오류 해결: 저장소 루트{" "}
            <code className="rounded bg-muted px-1 text-foreground">
              AUTH_SETUP.md
            </code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">배포·연동</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Vercel(또는 호스팅)에 환경 변수를 넣는 방법은 공식 문서를 참고하세요.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={VERCEL_ENV_DOC} target="_blank" rel="noopener noreferrer">
              Vercel — Environment Variables (새 탭)
            </a>
          </Button>
          <p className="pt-2">
            변수 목록·우선순위: 저장소{" "}
            <code className="rounded bg-muted px-1 text-foreground">
              DEPLOY_GUIDE.md
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
            로그아웃하면 관리자 로그인 화면으로 돌아갑니다. 상단 오른쪽 메뉴에서도
            로그아웃할 수 있습니다.
          </p>
          <Button
            variant="outline"
            onClick={() => void signOut({ callbackUrl: "/admin/login" })}
          >
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
