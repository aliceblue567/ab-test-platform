"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SignupForm({ inviteRequired }: { inviteRequired: boolean }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin/experiments";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const signupRes = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name.trim() || undefined,
          ...(inviteRequired || inviteCode.trim()
            ? { inviteCode: inviteCode.trim() }
            : {}),
        }),
      });
      const signupData = await signupRes.json().catch(() => ({}));
      if (!signupRes.ok) {
        setError(
          typeof signupData.message === "string"
            ? signupData.message
            : "가입에 실패했습니다."
        );
        setLoading(false);
        return;
      }

      const loginRes = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          csrfToken: "x",
          callbackUrl,
        }).toString(),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (loginRes.ok && loginData?.url) {
        window.location.href = loginData.url;
        return;
      }
      setError(
        "가입은 완료되었습니다. 로그인 페이지에서 다시 시도해 주세요."
      );
    } catch {
      setError("요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">계정 만들기</h1>
          <p className="text-sm text-muted-foreground text-center">
            팀에서 받은 초대만 사용하세요
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {inviteRequired && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">팀 초대 코드</Label>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  type="password"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="관리자가 공유한 코드"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">이름 (선택)</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 (8자 이상)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">비밀번호 확인</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "처리 중..." : "가입 후 로그인"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            가입이 막혀 있으면 관리자에게 문의하세요. Vercel에는 보통{" "}
            <code className="rounded bg-muted px-1">AUTH_SIGNUP_INVITE_CODE</code>
            만 넣으면 됩니다.
          </p>
          <div className="mt-4 text-center">
            <Link
              href={`/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              이미 계정이 있어요 → 로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SignupWithSuspense({ inviteRequired }: { inviteRequired: boolean }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <SignupForm inviteRequired={inviteRequired} />
    </Suspense>
  );
}

export { SignupWithSuspense as SignupClient };
