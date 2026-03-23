"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        setError("목록을 불러오지 못했습니다.");
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
          setError(typeof j.error === "string" ? j.error : "저장에 실패했습니다.");
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
          setError(typeof j.error === "string" ? j.error : "추가에 실패했습니다.");
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
            UX 라이팅 가이드라인
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            규칙을 추가·수정하면 Supabase에 즉시 반영되며,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /api/v1/ux-writing/check
            </code>
            는{" "}
            <strong className="text-foreground">활성</strong> 규칙만 AI
            프롬프트에 포함합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            새로고침
          </Button>
          <GuidelinesCsvUpload onImported={load} disabled={loading} />
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            새 규칙
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}{" "}
          {error.includes("로그인") ? (
            <Link href="/admin/login" className="underline font-medium">
              로그인하기
            </Link>
          ) : null}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">규칙 목록</CardTitle>
          <CardDescription>
            표에서 활성화를 끄면 해당 규칙은 다음 검수 요청부터 AI 분석에서 제외됩니다.
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
              등록된 규칙이 없습니다. 「새 규칙」으로 추가하거나 Supabase SQL로
              시드 데이터를 넣어 주세요.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">활성</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>규칙 이름</TableHead>
                  <TableHead className="min-w-[200px]">설명</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-[140px]">
                    나쁜 예
                  </TableHead>
                  <TableHead className="hidden lg:table-cell max-w-[140px]">
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
                    <TableCell className="text-muted-foreground text-xs max-w-xs whitespace-pre-wrap">
                      {g.description}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-pre-wrap">
                      {g.example_bad ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-pre-wrap">
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
            <DialogTitle>
              {editing ? "규칙 수정" : "새 규칙 추가"}
            </DialogTitle>
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
          <DialogFooter>
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
