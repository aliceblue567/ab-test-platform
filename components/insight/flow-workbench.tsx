"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Trash2,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";

import type {
  UxFlowAnalysisV1,
  UxFlowHotspotV1,
} from "@/lib/ux-insight/flow-analysis-v1";
import { resizeImageFilesForUxInsight } from "@/lib/ux-insight/client-image-prep";
import { computeTotalFrictionScore } from "@/lib/ux-insight/project-run-v1";
import { extractTheoryRefs } from "@/lib/ux-insight/extract-theory-refs";
import { FlowInsightCanvas } from "@/components/insight/flow-insight-canvas";
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
  if (score >= 5) return "bg-destructive text-destructive-foreground ring-2 ring-destructive/60";
  if (score >= 4) return "bg-orange-600 text-white";
  if (score >= 3) return "bg-amber-500 text-black";
  return "bg-emerald-600/90 text-white";
}

function newProjectId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `proj_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  return `proj_${Date.now()}`;
}

export function FlowWorkbench() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [flowTitle, setFlowTitle] = useState("예약 플로우");
  const [projectId, setProjectId] = useState(newProjectId);
  const [personaAge, setPersonaAge] = useState("30대");
  const [personaProficiency, setPersonaProficiency] = useState("중급");
  const [personaGoal, setPersonaGoal] = useState(
    "여행 상품을 찾아 결제까지 진행"
  );
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<UxFlowAnalysisV1 | null>(null);
  const [workingFlow, setWorkingFlow] = useState<UxFlowAnalysisV1 | null>(null);
  const [dragSrcIndex, setDragSrcIndex] = useState<number | null>(null);
  const [editingTransitionIdx, setEditingTransitionIdx] = useState<
    number | null
  >(null);
  const [editFrictionBuffer, setEditFrictionBuffer] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);
  const [editSummaryBuffer, setEditSummaryBuffer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayFlow = workingFlow ?? report;

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  useEffect(() => {
    if (report) {
      setWorkingFlow(structuredClone(report));
    } else {
      setWorkingFlow(null);
    }
    setEditingTransitionIdx(null);
    setEditingSummary(false);
  }, [report]);

  const transitionByPair = useMemo(() => {
    if (!displayFlow) {
      return new Map<string, UxFlowAnalysisV1["ux_transitions"][0]>();
    }
    const m = new Map<string, UxFlowAnalysisV1["ux_transitions"][0]>();
    for (const t of displayFlow.ux_transitions) {
      m.set(`${t.ux_from_step}-${t.ux_to_step}`, t);
    }
    return m;
  }, [displayFlow]);

  const hotspotsByStep = useMemo(() => {
    const m = new Map<number, UxFlowHotspotV1[]>();
    if (!displayFlow?.ux_flow_hotspots) return m;
    for (const h of displayFlow.ux_flow_hotspots) {
      const list = m.get(h.ux_step_index) ?? [];
      list.push(h);
      m.set(h.ux_step_index, list);
    }
    return m;
  }, [displayFlow]);

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
    setWorkingFlow(null);
  }, []);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files];
    [next[i], next[j]] = [next[j], next[i]];
    setFiles(next);
    setReport(null);
    setWorkingFlow(null);
  };

  const reorderFiles = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    if (from >= files.length || to >= files.length) return;
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setReport(null);
    setWorkingFlow(null);
  };

  const removeAt = (i: number) => {
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setReport(null);
    setWorkingFlow(null);
  };

  const analyze = async () => {
    if (files.length < 2) {
      toast.error("이미지를 2장 이상 순서대로 추가해 주세요.");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const resized = await resizeImageFilesForUxInsight(files);
      const fd = new FormData();
      resized.forEach((f) => fd.append("image", f));
      fd.append("flow_title", flowTitle);
      fd.append("persona_age", personaAge);
      fd.append("persona_proficiency", personaProficiency);
      fd.append("persona_goal", personaGoal);
      fd.append("project_id", projectId);

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

  const saveFrictionEdit = (idx: number) => {
    setWorkingFlow((w) => {
      if (!w) return w;
      const n = structuredClone(w);
      n.ux_transitions[idx] = {
        ...n.ux_transitions[idx],
        ux_friction_summary: editFrictionBuffer.trim(),
        ux_is_expert_edited: true,
      };
      return n;
    });
    setEditingTransitionIdx(null);
    toast.message("전환 요약이 초안에 반영되었습니다.");
  };

  const saveSummaryEdit = () => {
    setWorkingFlow((w) => {
      if (!w) return w;
      const n = structuredClone(w);
      n.ux_flow_metrics = {
        ...n.ux_flow_metrics,
        ux_executive_summary: editSummaryBuffer.trim(),
        ux_is_expert_edited: true,
      };
      return n;
    });
    setEditingSummary(false);
    toast.message("요약이 초안에 반영되었습니다.");
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
          나열하고, 단계 사이 심리적 마찰을 분석합니다. 썸네일을{" "}
          <strong className="text-foreground">드래그하여 순서</strong>를 바꿀 수
          있습니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">플로우 이미지</CardTitle>
            <CardDescription>
              2~8장 · 드래그 앤 드롭 추가 · 스텝 카드 드래그로 순서 변경 · 업로드 전
              자동 리사이즈
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
                  const spots = hotspotsByStep.get(i) ?? [];
                  return (
                    <div key={url} className="flex shrink-0 items-center gap-1">
                      <div
                        draggable
                        onDragStart={() => setDragSrcIndex(i)}
                        onDragEnd={() => setDragSrcIndex(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragSrcIndex !== null && dragSrcIndex !== i) {
                            reorderFiles(dragSrcIndex, i);
                          }
                          setDragSrcIndex(null);
                        }}
                        className={cn(
                          "relative w-[140px] shrink-0 rounded-lg border border-border bg-card p-1 shadow-sm",
                          dragSrcIndex === i && "opacity-60 ring-2 ring-primary"
                        )}
                      >
                        <div className="relative overflow-hidden rounded-md bg-muted/40">
                          <Image
                            src={url}
                            alt={`step ${i}`}
                            width={280}
                            height={210}
                            className="h-[105px] w-[140px] object-cover"
                            unoptimized
                          />
                          {spots.map((h, hi) => (
                            <span
                              key={hi}
                              title={h.ux_note}
                              className="absolute z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive ring-2 ring-background"
                              style={{
                                left: `${h.x_pct}%`,
                                top: `${h.y_pct}%`,
                              }}
                            />
                          ))}
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
                        <div className="pointer-events-none absolute left-1 top-1 rounded bg-background/80 px-1 py-0.5">
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
                                title="심리적 마찰 (5=심함, 스펙 상 ‘고마찰’ 구간은 4~5)"
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
            <CardTitle className="text-base">맥락 · 프로젝트</CardTitle>
            <CardDescription>
              project_id는 응답 JSON에 포함됩니다(추후 저장소 연동용).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>프로젝트 ID</Label>
              <div className="flex gap-2">
                <Input
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProjectId(newProjectId())}
                >
                  새 ID
                </Button>
              </div>
            </div>
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

      {displayFlow && !loading && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{displayFlow.ux_flow_title}</CardTitle>
                  {displayFlow.ux_project_id && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {displayFlow.ux_project_id}
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    마찰 합계 {computeTotalFrictionScore(displayFlow)} /{" "}
                    {displayFlow.ux_transitions.length * 5}
                  </Badge>
                </div>
                {editingSummary ? (
                  <div className="space-y-2 pt-2">
                    <Textarea
                      rows={4}
                      value={editSummaryBuffer}
                      onChange={(e) => setEditSummaryBuffer(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveSummaryEdit}
                      >
                        요약 저장
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSummary(false)}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <CardDescription className="text-pretty">
                    {displayFlow.ux_flow_metrics.ux_executive_summary}
                  </CardDescription>
                )}
              </div>
              {!editingSummary && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={() => {
                    setEditSummaryBuffer(
                      displayFlow.ux_flow_metrics.ux_executive_summary
                    );
                    setEditingSummary(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  요약 편집
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">매끄러움 지수</span>
                  <span className="font-mono font-medium">
                    {displayFlow.ux_flow_metrics.ux_seamlessness_index} / 100
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all"
                    style={{
                      width: `${displayFlow.ux_flow_metrics.ux_seamlessness_index}%`,
                    }}
                  />
                </div>
              </div>
              {displayFlow.ux_flow_metrics.ux_worst_transition_to_step !=
                null && (
                <p className="text-sm text-muted-foreground">
                  가장 마찰이 큰 전환:{" "}
                  <Badge variant="outline">
                    → 화면{" "}
                    {displayFlow.ux_flow_metrics.ux_worst_transition_to_step}
                  </Badge>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">플로 캔버스</CardTitle>
              <CardDescription>
                전환 구간 마찰 점수 시각화 (4~5: 고마찰·붉은 엣지)
              </CardDescription>
            </CardHeader>
            <CardContent className="rounded-lg border border-border bg-card/50 p-2">
              <FlowInsightCanvas flow={displayFlow} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {displayFlow.ux_transitions.map((t, idx) => {
              const refs = extractTheoryRefs(
                t.ux_friction_summary,
                t.ux_theory_note
              );
              const d = t.ux_psychological_dimensions;
              const isEditing = editingTransitionIdx === idx;
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
                      {t.ux_is_expert_edited && (
                        <Badge
                          variant="secondary"
                          className="border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        >
                          전문가 편집
                        </Badge>
                      )}
                      {refs.map((id) => (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="font-mono text-[10px]"
                        >
                          {id}
                        </Badge>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 gap-1 text-xs"
                        onClick={() => {
                          if (isEditing) {
                            setEditingTransitionIdx(null);
                          } else {
                            setEditingTransitionIdx(idx);
                            setEditFrictionBuffer(t.ux_friction_summary);
                          }
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        {isEditing ? "닫기" : "편집"}
                      </Button>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2 pt-2">
                        <Textarea
                          rows={5}
                          value={editFrictionBuffer}
                          onChange={(e) => setEditFrictionBuffer(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => saveFrictionEdit(idx)}
                          >
                            저장
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTransitionIdx(null)}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <CardTitle className="text-base leading-snug">
                        {t.ux_friction_summary}
                      </CardTitle>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded bg-muted/40 p-2">
                        <p className="font-medium text-foreground">기대 괴리</p>
                        <p className="mt-1 font-mono">
                          {d.ux_expectation_gap}/5
                        </p>
                      </div>
                      <div className="rounded bg-muted/40 p-2">
                        <p className="font-medium text-foreground">인지 급증</p>
                        <p className="mt-1 font-mono">
                          {d.ux_cognitive_spike}/5
                        </p>
                      </div>
                      <div className="rounded bg-muted/40 p-2">
                        <p className="font-medium text-foreground">정서 마찰</p>
                        <p className="mt-1 font-mono">
                          {d.ux_emotional_friction}/5
                        </p>
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
                {displayFlow.ux_steps.map((s) => (
                  <li key={s.ux_step_index} className="flex gap-3 text-sm">
                    <span className="font-mono text-muted-foreground">
                      {s.ux_step_index}
                    </span>
                    <div>
                      <p className="font-medium">{s.ux_step_label}</p>
                      <p className="text-muted-foreground">
                        {s.ux_one_line_summary}
                      </p>
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
