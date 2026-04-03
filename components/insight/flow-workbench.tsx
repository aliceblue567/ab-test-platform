"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  ImagePlus,
  Loader2,
  Trash2,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";

import type { UxFlowAnalysisV1 } from "@/lib/ux-insight/flow-analysis-v1";
import { extractTheoryRefs } from "@/lib/ux-insight/extract-theory-refs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function frictionHue(score: number) {
  if (score >= 5) return "bg-destructive text-destructive-foreground";
  if (score >= 4) return "bg-orange-500/90 text-white";
  if (score >= 3) return "bg-amber-500 text-black";
  return "bg-emerald-600/90 text-white";
}

export function FlowWorkbench() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [flowTitle, setFlowTitle] = useState("예약 플로우");
  const [personaAge, setPersonaAge] = useState("30대");
  const [personaProficiency, setPersonaProficiency] = useState("중급");
  const [personaGoal, setPersonaGoal] = useState(
    "여행 상품을 찾아 결제까지 진행"
  );
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<UxFlowAnalysisV1 | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const transitionByPair = useMemo(() => {
    if (!report) return new Map<string, UxFlowAnalysisV1["ux_transitions"][0]>();
    const m = new Map<string, UxFlowAnalysisV1["ux_transitions"][0]>();
    for (const t of report.ux_transitions) {
      m.set(`${t.ux_from_step}-${t.ux_to_step}`, t);
    }
    return m;
  }, [report]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) {
      toast.error("이미지 파일만 추가할 수 있습니다.");
      return;
    }
    setFiles((prev) => {
      const next = [...prev];
      for (const f of arr) {
        if (next.length >= 8) break;
        next.push(f);
      }
      return next;
    });
    setReport(null);
  }, []);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    setFiles(next);
    setReport(null);
  };

  const removeAt = (i: number) => {
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setReport(null);
  };

  const analyze = async () => {
    if (files.length < 2) {
      toast.error("이미지를 2장 이상 순서대로 추가해 주세요.");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("image", f));
      fd.append("flow_title", flowTitle);
      fd.append("persona_age", personaAge);
      fd.append("persona_proficiency", personaProficiency);
      fd.append("persona_goal", personaGoal);

      const res = await fetch("/api/ux-insight/analyze-flow", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "분석 실패");
        return;
      }
      setReport(data as UxFlowAnalysisV1);
      toast.success("플로우 분석이 완료되었습니다.");
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  const onDropRow = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">유저 플로우</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          화면을 <strong className="text-foreground">시간 순서대로</strong> 가로로
          나열하고, 단계 사이 심리적 마찰을 분석합니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">플로우 이미지</CardTitle>
            <CardDescription>
              2~8장 · 드래그 앤 드롭 또는 클릭 · 화살표로 순서 변경
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div
              onDrop={onDropRow}
              onDragOver={(e) => e.preventDefault()}
              className="rounded-lg border border-dashed border-border bg-muted/10 p-3"
            >
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                {previewUrls.length === 0 && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex min-h-[140px] min-w-[200px] shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                  >
                    <ImagePlus className="mb-2 h-8 w-8" />
                    이미지 추가
                  </button>
                )}
                {previewUrls.map((url, i) => {
                  const tNext = transitionByPair.get(`${i}-${i + 1}`);
                  return (
                    <div key={url} className="flex shrink-0 items-center gap-1">
                      <div className="relative w-[140px] shrink-0 rounded-lg border border-border bg-card p-1 shadow-sm">
                        <div className="overflow-hidden rounded-md bg-muted/40">
                          <Image
                            src={url}
                            alt={`step ${i}`}
                            width={280}
                            height={210}
                            className="h-[105px] w-[140px] object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-0.5">
                          <span className="pl-1 text-[10px] font-mono text-muted-foreground">
                            #{i}
                          </span>
                          <div className="flex gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={i === 0}
                              onClick={() => move(i, -1)}
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={i === files.length - 1}
                              onClick={() => move(i, 1)}
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeAt(i)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="absolute left-1 top-1 rounded bg-background/80 px-1 py-0.5">
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                      {i < previewUrls.length - 1 && (
                        <div className="flex w-[72px] shrink-0 flex-col items-center gap-1 px-0.5">
                          <div className="h-0.5 w-full bg-border" />
                          {tNext ? (
                            <>
                              <div
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shadow-md",
                                  frictionHue(tNext.ux_friction_score)
                                )}
                                title="심리적 마찰 (5=심함)"
                              >
                                {tNext.ux_friction_score}
                              </div>
                              <span className="text-center text-[9px] leading-tight text-muted-foreground">
                                마찰
                              </span>
                            </>
                          ) : (
                            <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {previewUrls.length > 0 && previewUrls.length < 8 && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex h-[140px] w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted/30"
                  >
                    <ImagePlus className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>

            <Button
              type="button"
              className="w-full gap-2"
              disabled={loading || files.length < 2}
              onClick={analyze}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Waypoints className="h-4 w-4" />
              )}
              플로우 마찰 분석
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">맥락</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>플로우 제목</Label>
              <Input
                value={flowTitle}
                onChange={(e) => setFlowTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>연령</Label>
              <Input
                value={personaAge}
                onChange={(e) => setPersonaAge(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>숙련도</Label>
              <Input
                value={personaProficiency}
                onChange={(e) => setPersonaProficiency(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>목적</Label>
              <Textarea
                rows={3}
                value={personaGoal}
                onChange={(e) => setPersonaGoal(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          플로우를 분석하는 중…
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{report.ux_flow_title}</CardTitle>
              <CardDescription>{report.ux_flow_metrics.ux_executive_summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">매끄러움 지수</span>
                  <span className="font-mono font-medium">
                    {report.ux_flow_metrics.ux_seamlessness_index} / 100
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all"
                    style={{
                      width: `${report.ux_flow_metrics.ux_seamlessness_index}%`,
                    }}
                  />
                </div>
              </div>
              {report.ux_flow_metrics.ux_worst_transition_to_step != null && (
                <p className="text-sm text-muted-foreground">
                  가장 마찰이 큰 전환:{" "}
                  <Badge variant="outline">
                    → 화면 {report.ux_flow_metrics.ux_worst_transition_to_step}
                  </Badge>
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {report.ux_transitions.map((t, idx) => {
              const refs = extractTheoryRefs(t.ux_friction_summary, t.ux_theory_note);
              const d = t.ux_psychological_dimensions;
              return (
                <Card
                  key={idx}
                  className={cn(
                    "border-l-4",
                    t.ux_friction_score >= 4
                      ? "border-l-destructive"
                      : t.ux_friction_score >= 3
                        ? "border-l-amber-500"
                        : "border-l-emerald-600"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {t.ux_from_step} → {t.ux_to_step}
                      </Badge>
                      <Badge className={frictionHue(t.ux_friction_score)}>
                        마찰 {t.ux_friction_score}/5
                      </Badge>
                      {refs.map((id) => (
                        <Badge key={id} variant="secondary" className="font-mono text-[10px]">
                          {id}
                        </Badge>
                      ))}
                    </div>
                    <CardTitle className="text-base leading-snug">
                      {t.ux_friction_summary}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded bg-muted/40 p-2">
                        <p className="font-medium text-foreground">기대 괴리</p>
                        <p className="mt-1 font-mono">{d.ux_expectation_gap}/5</p>
                      </div>
                      <div className="rounded bg-muted/40 p-2">
                        <p className="font-medium text-foreground">인지 급증</p>
                        <p className="mt-1 font-mono">{d.ux_cognitive_spike}/5</p>
                      </div>
                      <div className="rounded bg-muted/40 p-2">
                        <p className="font-medium text-foreground">정서 마찰</p>
                        <p className="mt-1 font-mono">{d.ux_emotional_friction}/5</p>
                      </div>
                    </div>
                    {t.ux_theory_note && (
                      <p className="text-xs">{t.ux_theory_note}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">단계 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {report.ux_steps.map((s) => (
                  <li
                    key={s.ux_step_index}
                    className="flex gap-3 text-sm"
                  >
                    <span className="font-mono text-muted-foreground">
                      {s.ux_step_index}
                    </span>
                    <div>
                      <p className="font-medium">{s.ux_step_label}</p>
                      <p className="text-muted-foreground">{s.ux_one_line_summary}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
