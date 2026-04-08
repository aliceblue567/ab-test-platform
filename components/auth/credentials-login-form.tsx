"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Variant = "admin" | "workspace";

function LoginFormInner({
  variant,
  signupEnabled,
  defaultCallbackUrl,
  showDiagnose,
}: {
  variant: Variant;
  signupEnabled: boolean;
  defaultCallbackUrl: string;
  showDiagnose: boolean;
}) {
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") ?? defaultCallbackUrl;
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError ? "이메일 또는 비밀번호가 올바르지 않습니다." : null
  );
  const [loading, setLoading] = useState(false);
  const [diagnose, setDiagnose] = useState<string | null>(null);
  const [schemaFixSql, setSchemaFixSql] = useState<string | null>(null);

  const isWorkspace = variant === "workspace";
  const title = isWorkspace ? "팀 워크스페이스 로그인" : "관리자 로그인";
  const subtitle = isWorkspace
    ? "초대받은 팀원 · 본인 계정으로 로그인"
    : "A/B·UX 라이팅 전체 관리 (API 키·가이드 편집 등)";

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
    setSchemaFixSql(null);
    setLoading(true);
    const form = (e.currentTarget as HTMLButtonElement).form;
    if (!form) return;
    const { email: eVal, password: pVal } = getFormValues(form);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: eVal,
          password: pVal,
          csrfToken: "x",
          callbackUrl,
        }).toString(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && data?.debug?.missingPasswordHashColumn) {
        setSchemaFixSql(
          typeof data.debug.fixSql === "string" ? data.debug.fixSql : null
        );
        setError(
          "DB에 password_hash 컬럼이 없습니다. 아래 SQL을 Supabase에서 실행한 뒤 다시 로그인해 주세요."
        );
      }
      setDiagnose(
        JSON.stringify(
          {
            httpStatus: res.status,
            ...data,
            clientSent: { emailLen: eVal.length, passwordLen: pVal.length },
            hint:
              data?.debug?.missingPasswordHashColumn
                ? "DB에 password_hash 컬럼 추가 필요 — debug.fixSql 참고"
                : res.status === 401 && data?.debug && !data.debug.envEmailSet
                  ? "Vercel 환경 변수 AUTH_ADMIN_EMAIL 이 비어 있습니다."
                  : res.status === 401 && data?.debug && !data.debug.envPasswordSet
                    ? "Vercel 환경 변수 AUTH_ADMIN_PASSWORD 가 비어 있습니다."
                    : undefined,
          },
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDiagnose(null);
    setSchemaFixSql(null);
    setLoading(true);
    const form = e.currentTarget;
    const { email: eVal, password: pVal } = getFormValues(form);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: eVal,
          password: pVal,
          csrfToken: "x",
          callbackUrl,
        }).toString(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      if (data?.debug?.missingPasswordHashColumn) {
        const missingCol =
          typeof data?.debug?.missingUserColumn === "string"
            ? data.debug.missingUserColumn
            : "password_hash";
        setSchemaFixSql(
          typeof data.debug.fixSql === "string" ? data.debug.fixSql : null
        );
        setError(
          `DB 스키마 누락(${missingCol})으로 이메일·비밀번호 로그인을 할 수 없습니다. SQL Editor에서 아래 SQL을 실행한 뒤 다시 시도해 주세요.`
        );
        if (showDiagnose) {
          setDiagnose(
            JSON.stringify(
              {
                ...data,
                hint: "운영 DB에 prisma/migrations/20260406120000_add_user_password_hash 가 적용되지 않은 상태입니다.",
              },
              null,
              2
            )
          );
        }
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        if (showDiagnose) setDiagnose(JSON.stringify(data, null, 2));
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const signupHref = `/admin/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/80">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">{title}</h1>
          <p className="text-sm text-muted-foreground text-center">{subtitle}</p>
          {isWorkspace && (
            <p className="text-xs text-muted-foreground text-center pt-2 leading-relaxed">
              로그인은 브라우저에 세션이 저장됩니다. 같은 PC에서는 한동안 다시 입력하지 않아도 됩니다.
              더 자주 로그아웃시키려면 Vercel에{" "}
              <code className="rounded bg-muted px-1">AUTH_SESSION_MAX_AGE_SECONDS</code>
              를 짧게(예: 28800=8시간) 설정하세요.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            {error && (
              <div className="space-y-2">
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive whitespace-pre-line">
                  {error}
                </div>
                {schemaFixSql && (
                  <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted/50 p-2 text-xs text-foreground">
                    {schemaFixSql}
                  </pre>
                )}
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
                placeholder="name@company.com"
                autoComplete="username"
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
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>

            {isWorkspace && (
              <p className="text-center text-sm">
                <Link
                  href={signupHref}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  계정이 없어요 — 초대 코드로 가입
                </Link>
              </p>
            )}

            {showDiagnose && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={(e) => handleDiagnose(e)}
                disabled={loading}
              >
                원인 확인
              </Button>
            )}
            {showDiagnose && diagnose && (
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                {diagnose}
              </pre>
            )}
          </form>

          {!isWorkspace && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              {signupEnabled
                ? "가입한 이메일·비밀번호 또는 관리자 환경 변수 계정으로 로그인합니다."
                : "DB에 등록된 이메일·비밀번호 또는 AUTH_ADMIN_EMAIL / AUTH_ADMIN_PASSWORD 계정으로 로그인합니다."}
            </p>
          )}
          {isWorkspace && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              팀에서 받은 이메일·비밀번호로 로그인합니다. 조직 관리(전체 실험·API 키)는{" "}
              <Link href="/admin/login" className="text-primary hover:underline">
                관리자 로그인
              </Link>
              을 이용하세요.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 text-center text-sm">
            {isWorkspace ? (
              <Link
                href="/admin/login"
                className="text-muted-foreground hover:underline"
              >
                관리자 로그인으로 이동 →
              </Link>
            ) : (
              <Link
                href={`/workspace/login?callbackUrl=${encodeURIComponent("/workspace/dashboard")}`}
                className="text-muted-foreground hover:underline"
              >
                팀원 · 워크스페이스 로그인 →
              </Link>
            )}
            {!isWorkspace && (
              <Link href="/admin" className="text-muted-foreground hover:underline text-xs">
                ← 관리자 홈으로
              </Link>
            )}
            {isWorkspace && (
              <span className="text-xs text-muted-foreground">
                첫 화면 비밀번호(게이트)를 통과한 뒤 이 페이지에서 로그인합니다.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CredentialsLoginForm(props: {
  variant: Variant;
  signupEnabled: boolean;
  defaultCallbackUrl: string;
  showDiagnose: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <LoginFormInner {...props} />
    </Suspense>
  );
}
