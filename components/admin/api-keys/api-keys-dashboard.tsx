"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_used_at: string | null;
};

export function ApiKeysDashboard() {
  const pathname = usePathname() ?? "/admin/api-keys";
  const loginHref = `/admin/login?callbackUrl=${encodeURIComponent(pathname)}`;
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [secretDialog, setSecretDialog] = useState<{
    name: string;
    secret: string;
  } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys");
      if (res.status === 401) {
        setError("로그인이 필요합니다.");
        setRows([]);
        return;
      }
      if (!res.ok) {
        setError("목록을 불러오지 못했습니다.");
        return;
      }
      const data = (await res.json()) as ApiKeyRow[];
      setRows(data);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createKey = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.status === 401) {
        setError("로그인이 필요합니다.");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j.error === "string" ? j.error : "생성에 실패했습니다.");
        return;
      }
      const raw = (await res.json()) as ApiKeyRow & { secret: string };
      const { secret, ...row } = raw;
      setRows((prev) => [row, ...prev]);
      setSecretDialog({ name: raw.name, secret });
      setCreateOpen(false);
      setNewName("");
    } catch {
      setError("요청 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (row: ApiKeyRow, checked: boolean) => {
    setTogglingId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/api-keys/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: checked }),
      });
      if (!res.ok) {
        setError("상태를 변경하지 못했습니다.");
        return;
      }
      const updated = (await res.json()) as ApiKeyRow;
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setTogglingId(null);
    }
  };

  const onDelete = async (row: ApiKeyRow) => {
    if (
      !window.confirm(
        `「${row.name}」 API 키를 삭제할까요? 피그마 플러그인 등에서 더 이상 사용할 수 없습니다.`
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/api-keys/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("삭제하지 못했습니다.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
  };

  const copySecret = async () => {
    if (!secretDialog) return;
    try {
      await navigator.clipboard.writeText(secretDialog.secret);
    } catch {
      setError("클립보드 복사에 실패했습니다.");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-7 w-7 text-muted-foreground" />
            API 키
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            피그마 플러그인 등 외부 클라이언트는 HTTP 헤더{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">x-api-key</code>
            에 아래에서 발급한 키를 넣어{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /api/v1/ux-writing/check
            </code>
            를 호출합니다. 원문 키는 생성 직후 한 번만 표시되며 서버에는 해시만
            저장됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            새로고침
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            새 API 키
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}{" "}
          {error.includes("로그인") ? (
            <Link href={loginHref} className="underline font-medium">
              로그인하기
            </Link>
          ) : null}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">발급된 키</CardTitle>
          <CardDescription>
            비활성화하면 해당 키로는 즉시 호출이 거절됩니다. 유출이 의심되면 비활성화
            후 새 키를 발급하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:px-6 pb-6">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12 px-6">
              <RefreshCw className="h-4 w-4 animate-spin" />
              불러오는 중…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center px-6">
              아직 API 키가 없습니다. 「새 API 키」로 발급하거나 Supabase에서{" "}
              <code className="text-xs">api_keys</code> 테이블을 확인하세요.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">활성</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>키 식별</TableHead>
                  <TableHead className="hidden md:table-cell">마지막 사용</TableHead>
                  <TableHead className="hidden sm:table-cell">생성일</TableHead>
                  <TableHead className="w-[80px] text-right">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className={r.is_active ? undefined : "opacity-70"}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={r.is_active}
                          disabled={togglingId === r.id}
                          onCheckedChange={(c) => onToggle(r, c)}
                          aria-label={r.is_active ? "키 활성" : "키 비활성"}
                        />
                        {r.is_active ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            활성
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-normal">
                            비활성
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground break-all">
                        {r.key_prefix}
                      </code>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {r.last_used_at
                        ? new Date(r.last_used_at).toLocaleString("ko-KR")
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(r)}
                        aria-label="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 API 키</DialogTitle>
            <DialogDescription>
              용도를 구분할 수 있도록 이름을 지정하세요. 예: 피그마 플러그인 (프로덕션)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="key-name">이름</Label>
            <Input
              id="key-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="예: Figma plugin — prod"
              onKeyDown={(e) => {
                if (e.key === "Enter") void createKey();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => void createKey()}
              disabled={saving || !newName.trim()}
            >
              {saving ? "생성 중…" : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!secretDialog}
        onOpenChange={(o) => {
          if (!o) setSecretDialog(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>키를 안전한 곳에 보관하세요</DialogTitle>
            <DialogDescription>
              이 비밀 값은 다시 표시할 수 없습니다. 피그마 플러그인 시크릿 저장소 등에
              복사해 두세요.
            </DialogDescription>
          </DialogHeader>
          {secretDialog ? (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">이름:</span>{" "}
                {secretDialog.name}
              </p>
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <code className="text-xs break-all whitespace-pre-wrap select-all">
                  {secretDialog.secret}
                </code>
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={() => void copySecret()}>
                <Copy className="h-4 w-4" />
                클립보드에 복사
              </Button>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setSecretDialog(null)}>
              확인했습니다
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
