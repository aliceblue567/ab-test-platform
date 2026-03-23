"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { GuidelinesCsvUpload } from "@/components/admin/guidelines/guidelines-csv-upload";

export type Guideline = {
  id: string;
  category: string;
  rule_name: string;
  description: string;
  example_bad: string | null;
  example_good: string | null;
  is_active: boolean;
};

const emptyForm = {
  category: "",
  rule_name: "",
  description: "",
  example_bad: "",
  example_good: "",
  is_active: true,
};

const toolbarBtnClass =
  "h-9 min-h-9 gap-2 px-3 sm:px-4 text-sm font-medium";

/** API 500 본문을 사용자가 조치할 수 있게 풀어 씀 */
function friendlyGuidelineApiError(raw: string): string {
  if (
    raw.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ||
    raw.includes("SUPABASE_SERVICE_ROLE_KEY")
  ) {
    return "Supabase 환경 변수가 없습니다. 배포(Vercel 등)에 NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY(서비스 롤 키)를 넣어 주세요.";
  }
  if (
    /relation ["']guidelines["'] does not exist/i.test(raw) ||
    raw.includes("Could not find the table") ||
    raw.includes("schema cache")
  ) {
    return "Supabase에 guidelines 테이블이 없거나 아직 반영되지 않았습니다. 프로젝트의 supabase-setup.sql 중 guidelines·RLS 부분을 SQL 편집기에서 실행해 주세요.";
  }
  if (
    raw.toLowerCase().includes("row-level security") ||
    raw.includes("permission denied") ||
    (raw.includes("JWT") && raw.includes("Invalid"))
  ) {
    return "Supabase 권한 오류입니다. SUPABASE_SERVICE_ROLE_KEY가 anon 키가 아니라 서비스 롤(비밀) 키인지 확인해 주세요.";
  }
  return raw;
}

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: unknown };
    if (typeof j.error === "string" && j.error.trim()) return j.error;
  } catch {
    /* ignore */
  }
  return "목록을 불러오지 못했습니다.";
}

export function GuidelinesDashboard() {
  const [rows, setRows] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Guideline | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guidelines");
      if (res.status === 401) {
        setError("로그인이 필요합니다.");
        setRows([]);
        return;
      }
      if (!res.ok) {
        const raw = await readApiErrorMessage(res);
        setError(friendlyGuidelineApiError(raw));
        setRows([]);
        return;
      }
      const data = (await res.json()) as Guideline[];
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (g: Guideline) => {
    setEditing(g);
    setForm({
      category: g.category,
      rule_name: g.rule_name,
      description: g.description,
      example_bad: g.example_bad ?? "",
      example_good: g.example_good ?? "",
      is_active: g.is_active,
    });
    setDialogOpen(true);
  };

  const submitForm = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const res = await fetch(`/api/guidelines/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: form.category,
            rule_name: form.rule_name,
            description: form.description,
            example_bad: form.example_bad || null,
            example_good: form.example_good || null,
            is_active: form.is_active,
          }),
        });
        if (res.status === 401) {
          setError("로그인이 필요합니다.");
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          const raw =
            typeof j.error === "string" ? j.error : "저장에 실패했습니다.";
          setError(friendlyGuidelineApiError(raw));
          return;
        }
        const updated = (await res.json()) as Guideline;
        setRows((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      } else {
        const res = await fetch("/api/guidelines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: form.category,
            rule_name: form.rule_name,
            description: form.description,
            example_bad: form.example_bad || null,
            example_good: form.example_good || null,
            is_active: form.is_active,
          }),
        });
        if (res.status === 401) {
          setError("로그인이 필요합니다.");
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          const raw =
            typeof j.error === "string" ? j.error : "추가에 실패했습니다.";
          setError(friendlyGuidelineApiError(raw));
          return;
        }
        const created = (await res.json()) as Guideline;
        setRows((prev) => [...prev, created].sort(compareGuideline));
      }
      setDialogOpen(false);
    } catch {
      setError("요청 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (g: Guideline, checked: boolean) => {
    setTogglingId(g.id);
    setError(null);
    try {
      const res = await fetch(`/api/guidelines/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: checked }),
      });
      if (!res.ok) {
        setError("활성 상태를 변경하지 못했습니다.");
        return;
      }
      const updated = (await res.json()) as Guideline;
      setRows((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setTogglingId(null);
    }
  };

  const onDelete = async (g: Guideline) => {
    if (
      !window.confirm(
        `「${g.rule_name}」 규칙을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/guidelines/${g.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("삭제하지 못했습니다.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== g.id));
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* 페이지 헤더 */}
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BookOpen className="h-7 w-7 shrink-0 text-muted-foreground" aria-hidden />
          UX 라이팅 가이드라인
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          규칙을 추가·수정하면 Supabase에 반영되고,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            /api/v1/ux-writing/check
          </code>{" "}
          는 <strong className="text-foreground">활성</strong> 규칙만 AI
          프롬프트에 넣습니다.
        </p>
      </header>

      {/* 작업 영역: 주요 동작 + 보조 동작을 한 카드에 정리 */}
      <section
        aria-label="가이드라인 작업"
        className="rounded-xl border border-border bg-card text-card-foreground shadow-sm"
      >
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">작업</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            자주 쓰는 기능을 한곳에 모았습니다.
          </p>
        </div>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6 sm:p-5">
          <div className="flex flex-col justify-center gap-2 sm:min-w-[200px]">
            <span className="text-xs font-medium text-muted-foreground">
              규칙 만들기
            </span>
            <Button
              type="button"
              className="h-10 w-full justify-center gap-2 sm:w-auto sm:min-w-[160px]"
              onClick={openCreate}
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
              새 규칙 추가
            </Button>
          </div>

          <div className="hidden w-px shrink-0 bg-border sm:block" aria-hidden />

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              목록 · 파일
            </span>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                variant="outline"
                className={toolbarBtnClass}
                onClick={() => load()}
                disabled={loading}
                aria-busy={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`}
                />
                목록 새로고침
              </Button>
              <GuidelinesCsvUpload onImported={load} disabled={loading} />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              CSV는 UTF-8로 저장한 뒤 업로드해 주세요. 엑셀에서 저장할 때도
              “CSV UTF-8(쉼표로 분리)” 형식을 선택하면 안전합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 오류 알림 */}
      {error ? (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0 pt-0.5">
            <p className="font-medium">문제가 발생했습니다</p>
            <p className="mt-1 text-destructive/90">
              {error}
              {error.includes("로그인") ? (
                <>
                  {" "}
                  <Link
                    href="/admin/login"
                    className="font-medium underline underline-offset-2"
                  >
                    로그인하기
                  </Link>
                </>
              ) : null}
            </p>
            {!error.includes("로그인") ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => load()}
              >
                다시 시도
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 규칙 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">규칙 목록</CardTitle>
          <CardDescription>
            비활성화한 규칙은 다음 검수 요청부터 AI 분석에서 제외됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-6 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>불러오는 중…</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="rounded-full bg-muted/60 p-4">
                <Inbox className="h-10 w-10 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                아직 등록된 규칙이 없습니다
              </p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                새 규칙을 추가하거나, 샘플 CSV를 받아 여러 개를 한 번에 올릴 수
                있습니다.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button type="button" className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  새 규칙 추가
                </Button>
                <GuidelinesCsvUpload onImported={load} disabled={false} />
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">활성</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>규칙 이름</TableHead>
                  <TableHead className="min-w-[200px]">설명</TableHead>
                  <TableHead className="hidden max-w-[140px] lg:table-cell">
                    나쁜 예
                  </TableHead>
                  <TableHead className="hidden max-w-[140px] lg:table-cell">
                    좋은 예
                  </TableHead>
                  <TableHead className="w-[120px] text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((g) => (
                  <TableRow
                    key={g.id}
                    className={g.is_active ? undefined : "opacity-70"}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={g.is_active}
                          disabled={togglingId === g.id}
                          onCheckedChange={(c) => onToggleActive(g, c)}
                          aria-label={
                            g.is_active ? "규칙 활성화됨" : "규칙 비활성화됨"
                          }
                        />
                        {g.is_active ? (
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
                    <TableCell className="font-medium">{g.category}</TableCell>
                    <TableCell>{g.rule_name}</TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap text-xs text-muted-foreground">
                      {g.description}
                    </TableCell>
                    <TableCell className="hidden whitespace-pre-wrap text-xs text-muted-foreground lg:table-cell">
                      {g.example_bad ?? "—"}
                    </TableCell>
                    <TableCell className="hidden whitespace-pre-wrap text-xs text-muted-foreground lg:table-cell">
                      {g.example_good ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(g)}
                          aria-label="수정"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(g)}
                          aria-label="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "규칙 수정" : "새 규칙 추가"}</DialogTitle>
            <DialogDescription>
              저장 시 DB에 반영되며, 활성 규칙만 UX Writing 검수 API에 사용됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="form-active">AI 분석에 포함</Label>
                <p className="text-xs text-muted-foreground">
                  끄면 검수 API 프롬프트에서 제외됩니다.
                </p>
              </div>
              <Switch
                id="form-active"
                checked={form.is_active}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, is_active: c }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-cat">카테고리</Label>
              <Input
                id="form-cat"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="예: 명확성"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-name">규칙 이름</Label>
              <Input
                id="form-name"
                value={form.rule_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rule_name: e.target.value }))
                }
                placeholder="예: 동사로 행동 표현"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-desc">설명</Label>
              <Textarea
                id="form-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
                placeholder="규칙에 대한 설명"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-bad">나쁜 예 (선택)</Label>
              <Textarea
                id="form-bad"
                value={form.example_bad}
                onChange={(e) =>
                  setForm((f) => ({ ...f, example_bad: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-good">좋은 예 (선택)</Label>
              <Textarea
                id="form-good"
                value={form.example_good}
                onChange={(e) =>
                  setForm((f) => ({ ...f, example_good: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              type="button"
            >
              취소
            </Button>
            <Button
              onClick={submitForm}
              disabled={
                saving ||
                !form.category.trim() ||
                !form.rule_name.trim() ||
                !form.description.trim()
              }
            >
              {saving ? "저장 중…" : editing ? "저장" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function compareGuideline(a: Guideline, b: Guideline): number {
  const c = a.category.localeCompare(b.category, "ko");
  if (c !== 0) return c;
  return a.rule_name.localeCompare(b.rule_name, "ko");
}
