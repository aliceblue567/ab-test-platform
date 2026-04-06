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
import {
  budgetBytesPerFlowImage,
  prepareImageFileForUxInsightApi,
} from "@/lib/ux-insight/client-image-prep";
import { applyPrivacyMaskToImageFile } from "@/lib/ux-insight/image-privacy-mask";
import { UX_FLOW_MAX_SCREEN_COUNT } from "@/lib/ux-insight/flow-limits";
import { computeTotalFrictionScore } from "@/lib/ux-insight/project-run-v1";
import { extractTheoryRefs } from "@/lib/ux-insight/extract-theory-refs";
import { friction5ToTier, tierBadgeClass } from "@/lib/ux-insight/flow-friction-visual";
import {
  deriveStepJourney,
  buildTop3Issues,
  buildImprovementBoard,
  expectedImpactSummary,
  dataProvenanceLabel,
  frictionToPriority,
  inferProblemTag,
  userImpactFromDimensions,
  improvementForTransition,
  deriveCauseForTransition,
  inferDifficultyHint,
  priorityLabelKo,
  type PriorityLevel,
} from "@/lib/ux-insight/flow-report-derive";
import { hotspotKeysForTransition } from "@/lib/ux-insight/flow-hotspot-link";
import {
  humanizeTheoryIdsInText,
  theoryRefsToReadableList,
} from "@/lib/ux-insight/ux-theories-lookup";
import { FlowHealthGauge } from "@/components/insight/flow-health-gauge";
import { FlowInsightCanvas } from "@/components/insight/flow-insight-canvas";
import { FlowStepOverlayStrip } from "@/components/insight/flow-step-overlay-strip";
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
import { LayeredAuditDashboard } from "@/components/insight/layered-audit-dashboard";
import { FlowStepContextBar } from "@/components/insight/flow-step-context-bar";
import { FlowStepJourneyEnhanced } from "@/components/insight/flow-step-journey-enhanced";
import { FlowTransitionUnifiedCard } from "@/components/insight/flow-transition-unified-card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function bulletsFromTheoryNote(note: string | undefined): string[] {
  if (!note?.trim()) return [];
  return note
    .split(/\n/)
    .map((l) => l.replace(/^[\s•\-*\d.]+/, "").trim())
    .filter((l) => l.length > 0);
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
  const [privacyMaskBeforeApi, setPrivacyMaskBeforeApi] = useState(false);
  /** 멀티 스텝일 때 레포트 맥락(썸네일 강조); null = 전체 */
  const [flowContextStepIndex, setFlowContextStepIndex] = useState<
    number | null
  >(null);
  const [activeHotspotKey, setActiveHotspotKey] = useState<string | null>(null);
  const [focusedTransitionIdx, setFocusedTransitionIdx] = useState<
    number | null
  >(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterStep, setFilterStep] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"friction" | "ease">("friction");
  const transitionCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const PROBLEM_TAGS = [
    "탐색",
    "입력",
    "인지",
    "피드백",
    "내비게이션",
  ] as const;

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
    setFlowContextStepIndex(null);
    setActiveHotspotKey(null);
    setFocusedTransitionIdx(null);
  }, [report]);

  const flowStepContextThumbs = useMemo(() => {
    if (!displayFlow || previewUrls.length <= 1) return [];
    const n = Math.min(previewUrls.length, displayFlow.ux_steps.length);
    const out: {
      index: number;
      label: string;
      previewUrl: string;
    }[] = [];
    for (let i = 0; i < n; i++) {
      const step = displayFlow.ux_steps.find((s) => s.ux_step_index === i);
      out.push({
        index: i,
        label: step?.ux_step_label ?? `단계 ${i}`,
        previewUrl: previewUrls[i]!,
      });
    }
    return out;
  }, [displayFlow, previewUrls]);

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

  const overlaySteps = useMemo(() => {
    if (!displayFlow || previewUrls.length === 0) return [];
    const n = Math.min(previewUrls.length, displayFlow.ux_steps.length);
    return Array.from({ length: n }, (_, i) => ({
      stepIndex: i,
      label:
        displayFlow.ux_steps.find((s) => s.ux_step_index === i)?.ux_step_label ??
        `단계 ${i}`,
      previewUrl: previewUrls[i]!,
      hotspots: hotspotsByStep.get(i) ?? [],
    }));
  }, [displayFlow, previewUrls, hotspotsByStep]);

  const allHotspotsFlat = useMemo(
    () => displayFlow?.ux_flow_hotspots ?? [],
    [displayFlow?.ux_flow_hotspots]
  );

  const highlightedHotspotKeys = useMemo(() => {
    if (focusedTransitionIdx == null || !displayFlow) {
      return new Set<string>();
    }
    return hotspotKeysForTransition(
      focusedTransitionIdx,
      allHotspotsFlat,
      displayFlow.ux_transitions
    );
  }, [
    focusedTransitionIdx,
      displayFlow,
      allHotspotsFlat,
  ]);

  const provenanceTag = useMemo(
    () => dataProvenanceLabel(displayFlow?.ux_audit_layers ?? null),
    [displayFlow?.ux_audit_layers]
  );

  const stepJourney = useMemo(
    () => (displayFlow ? deriveStepJourney(displayFlow) : []),
    [displayFlow]
  );

  const top3Issues = useMemo(
    () => (displayFlow ? buildTop3Issues(displayFlow) : []),
    [displayFlow]
  );

  const improvementBoardRows = useMemo(
    () => (displayFlow ? buildImprovementBoard(displayFlow) : []),
    [displayFlow]
  );

  const impactLines = useMemo(
    () => (displayFlow ? expectedImpactSummary(displayFlow) : []),
    [displayFlow]
  );

  const transitionEntriesFiltered = useMemo(() => {
    if (!displayFlow) return [];
    const entries = displayFlow.ux_transitions.map((t, idx) => ({ t, idx }));
    let rows = entries;
    if (filterPriority !== "all") {
      rows = rows.filter(
        ({ t }) => frictionToPriority(t.ux_friction_score) === filterPriority
      );
    }
    if (filterTag !== "all") {
      rows = rows.filter(
        ({ t }) => inferProblemTag(t.ux_friction_summary) === filterTag
      );
    }
    if (filterStep !== "all") {
      const s = Number(filterStep);
      rows = rows.filter(
        ({ t }) => t.ux_from_step === s || t.ux_to_step === s
      );
    }
    const diffRank = (d: string) => (d === "하" ? 2 : d === "중" ? 1 : 0);
    rows = [...rows].sort((a, b) => {
      if (sortMode === "friction") {
        return b.t.ux_friction_score - a.t.ux_friction_score;
      }
      const impA = improvementForTransition(displayFlow, a.t, a.idx);
      const impB = improvementForTransition(displayFlow, b.t, b.idx);
      return (
        diffRank(
          inferDifficultyHint(impB.action, b.t.ux_friction_score)
        ) -
        diffRank(inferDifficultyHint(impA.action, a.t.ux_friction_score))
      );
    });
    return rows;
  }, [
    displayFlow,
    filterPriority,
    filterTag,
    filterStep,
    sortMode,
  ]);

  const scrollToTransition = useCallback((transitionIndex: number) => {
    setFocusedTransitionIdx(transitionIndex);
    setActiveHotspotKey(null);
    requestAnimationFrame(() => {
      transitionCardRefs.current[transitionIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, []);

  const topPriorityBadge: Record<PriorityLevel, string> = {
    critical: "bg-red-600 text-white border-red-700",
    high: "bg-orange-600 text-white border-orange-700",
    medium: "bg-amber-500/90 text-black border-amber-600",
    low: "bg-muted text-muted-foreground border-border",
  };

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) {
      toast.error("이미지 파일만 추가할 수 있습니다.");
      return;
    }
    setFiles((prev) => {
      const next = [...prev];
      for (const f of arr) {
        if (next.length >= UX_FLOW_MAX_SCREEN_COUNT) break;
        next.push(f);
      }
      const room = Math.max(0, UX_FLOW_MAX_SCREEN_COUNT - prev.length);
      if (arr.length > room) {
        toast.message(
          `플로우 이미지는 최대 ${UX_FLOW_MAX_SCREEN_COUNT}장까지 추가할 수 있습니다.`
        );
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
      const budget = budgetBytesPerFlowImage(files.length);
      let toSend = await Promise.all(
        files.map((f) =>
          prepareImageFileForUxInsightApi(f, { maxBytes: budget })
        )
      );
      if (privacyMaskBeforeApi) {
        try {
          toSend = await Promise.all(
            toSend.map((f) => applyPrivacyMaskToImageFile(f))
          );
          toSend = await Promise.all(
            toSend.map((f) =>
              prepareImageFileForUxInsightApi(f, { maxBytes: budget })
            )
          );
        } catch {
          toast.message(
            "로컬 블러에 실패해 압축만 적용한 이미지로 전송합니다."
          );
          toSend = await Promise.all(
            files.map((f) =>
              prepareImageFileForUxInsightApi(f, { maxBytes: budget })
            )
          );
        }
      }
      const fd = new FormData();
      toSend.forEach((f) => fd.append("image", f));
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
      let data: unknown = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        let err =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : typeof data === "object" &&
                data !== null &&
                "message" in data &&
                typeof (data as { message: unknown }).message === "string"
              ? (data as { message: string }).message
              : `분석 실패 (HTTP ${res.status})`;
        if (res.status === 413) {
          err =
            "요청이 너무 큽니다(HTTP 413). 한 번에 올리는 이미지 수·크기를 줄이거나(장당 약 수백KB 권장), 새로고침 후 다시 시도해 주세요.";
        }
        toast.error(err);
        return;
      }
      setReport(data as unknown as UxFlowAnalysisV1);
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
          있습니다. 분석 후 결과는{" "}
          <strong className="text-foreground">
            요약 → 핵심 Top 3 → 단계별 상세 → 개선 보드 → 기대 효과
          </strong>
          순으로 표시됩니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">플로우 이미지</CardTitle>
            <CardDescription>
              2~{UX_FLOW_MAX_SCREEN_COUNT}장 · 드래그 앤 드롭 추가 · 스텝 카드 드래그로 순서 변경 · 업로드 전
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
                                  tierBadgeClass(
                                    friction5ToTier(tNext.ux_friction_score)
                                  )
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
                {previewUrls.length > 0 &&
                  previewUrls.length < UX_FLOW_MAX_SCREEN_COUNT && (
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

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="flow-privacy" className="text-sm font-medium">
                  API 전송 전 로컬 블러
                </Label>
                <p className="text-xs text-muted-foreground">
                  고변동 영역 추정 후 블러(완전한 개인정보 삭제는 아님).
                </p>
              </div>
              <Switch
                id="flow-privacy"
                checked={privacyMaskBeforeApi}
                onCheckedChange={setPrivacyMaskBeforeApi}
              />
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
          {/* 1. 플로우 요약 */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{displayFlow.ux_flow_title}</CardTitle>
                  {displayFlow.ux_project_id && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {displayFlow.ux_project_id}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    마찰 합계 {computeTotalFrictionScore(displayFlow)} /{" "}
                    {displayFlow.ux_transitions.length * 5}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {provenanceTag}
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
                      <Button type="button" size="sm" onClick={saveSummaryEdit}>
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
                  <CardDescription className="text-pretty text-sm leading-relaxed">
                    {displayFlow.ux_flow_metrics.ux_executive_summary}
                  </CardDescription>
                )}
              </div>
              {!editingSummary && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
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
            <CardContent className="space-y-5 pt-0">
              <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-start">
                <div className="flex shrink-0 justify-center sm:w-[200px]">
                  <FlowHealthGauge
                    seamlessnessIndex={
                      displayFlow.ux_flow_metrics.ux_seamlessness_index
                    }
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">매끄러움 지수</span>
                    <span className="font-mono font-medium tabular-nums">
                      {displayFlow.ux_flow_metrics.ux_seamlessness_index} / 100
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 transition-all"
                      style={{
                        width: `${displayFlow.ux_flow_metrics.ux_seamlessness_index}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    마찰 1~5 스케일을 체감 2~10으로 환산합니다.{" "}
                    <span className="text-emerald-600">낮음</span> ·{" "}
                    <span className="text-amber-600">주의</span> ·{" "}
                    <span className="text-red-600">즉시 점검</span>.
                  </p>
                  {displayFlow.ux_flow_metrics.ux_worst_transition_to_step !=
                    null && (
                    <p className="text-xs text-muted-foreground">
                      최대 마찰 전환:{" "}
                      <Badge variant="outline" className="text-[10px]">
                        → 화면{" "}
                        {displayFlow.ux_flow_metrics.ux_worst_transition_to_step}
                      </Badge>
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    단계별 상태 · 이탈 위험
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    단계 카드에 마우스를 올리면 상세 설명
                  </span>
                </div>
                <FlowStepJourneyEnhanced
                  journey={stepJourney}
                  previewUrls={previewUrls}
                  flow={displayFlow}
                />
                {previewUrls.length === 0 &&
                  displayFlow.ux_steps.length > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      스크린샷이 이 세션에 없어 썸네일은 플레이스홀더입니다. 왼쪽에서
                      이미지를 추가한 뒤 다시 분석하면 썸네일이 채워집니다.
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* 2. 핵심 문제 Top 3 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              핵심 문제 Top 3
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              {top3Issues.map((issue) => (
                <button
                  key={issue.rank}
                  type="button"
                  className={cn(
                    "rounded-lg border border-border/80 bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
                  )}
                  onClick={() => scrollToTransition(issue.transitionIndex)}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      Top {issue.rank}
                    </Badge>
                    <Badge
                      className={cn(
                        "border px-1.5 text-[10px]",
                        topPriorityBadge[issue.priority]
                      )}
                    >
                      {priorityLabelKo(issue.priority)}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {issue.title}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {issue.affectedSteps}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-foreground/90">
                    {issue.oneLine}
                  </p>
                  <p className="mt-2 border-t border-emerald-500/15 pt-2 text-[11px] font-medium leading-snug text-emerald-800 dark:text-emerald-200">
                    대표 개선: {issue.representativeFix}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. 단계별 상세 — 필터 */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  단계별 상세 분석
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  콜아웃 핀이나 카드를 선택하면 서로 연동됩니다.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <div className="w-full min-w-[140px] sm:w-40">
                  <Label className="text-[10px] text-muted-foreground">
                    우선순위
                  </Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full min-w-[140px] sm:w-40">
                  <Label className="text-[10px] text-muted-foreground">
                    문제 유형
                  </Label>
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {PROBLEM_TAGS.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full min-w-[160px] sm:w-44">
                  <Label className="text-[10px] text-muted-foreground">
                    단계별 보기
                  </Label>
                  <Select value={filterStep} onValueChange={setFilterStep}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="전체 전환" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 전환</SelectItem>
                      {displayFlow.ux_steps.map((s) => (
                        <SelectItem
                          key={s.ux_step_index}
                          value={String(s.ux_step_index)}
                        >
                          {s.ux_step_index + 1}단계 포함만
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full min-w-[160px] sm:w-44">
                  <Label className="text-[10px] text-muted-foreground">
                    정렬
                  </Label>
                  <Select
                    value={sortMode}
                    onValueChange={(v) =>
                      setSortMode(v as "friction" | "ease")
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friction">마찰 높은 순</SelectItem>
                      <SelectItem value="ease">구현 난이도 낮은 순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {transitionEntriesFiltered.map(({ t, idx }) => {
                const refs = extractTheoryRefs(
                  t.ux_friction_summary,
                  t.ux_theory_note
                );
                const theoryBrief = theoryRefsToReadableList(refs);
                const d = t.ux_psychological_dimensions;
                const isEditing = editingTransitionIdx === idx;
                const imp = improvementForTransition(displayFlow, t, idx);
                const firstSentence =
                  t.ux_friction_summary.split(/(?<=[.!?])\s+/)[0]?.trim() ??
                  t.ux_friction_summary.slice(0, 160);
                const problemSummary = humanizeTheoryIdsInText(firstSentence);
                const guideBullets = bulletsFromTheoryNote(t.ux_theory_note);
                const bullets =
                  guideBullets.length > 0
                    ? guideBullets
                    : [
                        "이론·실행 메모를 편집에서 보강하거나, Layer 2 개선 포인트를 참고하세요.",
                      ];
                const cause = deriveCauseForTransition(t, imp.matchedIssueWhy);
                const tag = inferProblemTag(t.ux_friction_summary);

                return (
                  <FlowTransitionUnifiedCard
                    key={idx}
                    flow={displayFlow}
                    transition={t}
                    index={idx}
                    priority={frictionToPriority(t.ux_friction_score)}
                    problemTag={tag}
                    headlines={theoryBrief}
                    problemSummary={problemSummary}
                    cause={cause}
                    userImpact={userImpactFromDimensions(d)}
                    improvement={imp.action}
                    expectedEffect={imp.impact}
                    bullets={bullets.map((line) => humanizeTheoryIdsInText(line))}
                    theoryChips={
                      theoryBrief.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {theoryBrief.map((b) => (
                            <span
                              key={b.ux_theory_id}
                              className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              title={`규칙 ID: ${b.ux_theory_id}`}
                            >
                              {b.ux_theory_label_ko}
                            </span>
                          ))}
                        </div>
                      ) : null
                    }
                    isEditing={isEditing}
                    editBuffer={editFrictionBuffer}
                    onEditChange={setEditFrictionBuffer}
                    onSaveEdit={() => saveFrictionEdit(idx)}
                    onStartEdit={() => {
                      setEditingTransitionIdx(idx);
                      setEditFrictionBuffer(t.ux_friction_summary);
                    }}
                    onCancelEdit={() => setEditingTransitionIdx(null)}
                    isFocused={focusedTransitionIdx === idx}
                    onSelect={() => scrollToTransition(idx)}
                    cardRef={(el) => {
                      transitionCardRefs.current[idx] = el;
                    }}
                    onStopPropagation={(e) => e.stopPropagation()}
                    dataProvenance={provenanceTag}
                  />
                );
              })}
            </div>
            {transitionEntriesFiltered.length === 0 && (
              <p className="text-sm text-muted-foreground">
                필터 조건에 맞는 전환이 없습니다. 필터를 초기화해 보세요.
              </p>
            )}
          </div>

          {/* 4. 개선안 우선순위 보드 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">개선안 우선순위 보드</CardTitle>
              <CardDescription className="text-xs">
                액션 중심 정렬 · {provenanceTag}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {improvementBoardRows.map((row) => (
                <div
                  key={row.rank}
                  className="rounded-lg border border-border/70 bg-muted/[0.12] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {row.rank}순위
                    </Badge>
                    <Badge
                      className={cn(
                        "border px-1.5 text-[10px]",
                        topPriorityBadge[row.priority]
                      )}
                    >
                      {priorityLabelKo(row.priority)}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {row.title}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground/80">
                        예상 효과:
                      </span>{" "}
                      {row.effect}
                    </li>
                    <li>
                      <span className="font-medium text-foreground/80">
                        구현 난이도:
                      </span>{" "}
                      {row.difficulty}
                    </li>
                    <li>
                      <span className="font-medium text-foreground/80">
                        영향 범위:
                      </span>{" "}
                      {row.scope}
                    </li>
                    <li>
                      <span className="font-medium text-foreground/80">
                        관련 단계:
                      </span>{" "}
                      {row.steps}
                    </li>
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 5. 기대 효과 / 예상 개선 지표 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                기대 효과 · 예상 개선 지표
              </CardTitle>
              <CardDescription className="text-xs">
                정량 아님 — 플로우 마찰·요약에서 도출된 가이드 ({provenanceTag})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
                {impactLines.map((line, i) => (
                  <li key={i} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 고급: 캔버스, 콜아웃, 레이어, 단계 목록 */}
          <details
            open
            className="group rounded-lg border border-border/80 bg-card/30"
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="group-open:text-primary">
                캔버스 · 콜아웃 · 3계층 감사 · 단계 목록
              </span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (접기/펼치기)
              </span>
            </summary>
            <div className="space-y-6 border-t border-border/60 px-4 pb-4 pt-4">
              {overlaySteps.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">화면 콜아웃 & 핀</CardTitle>
                    <CardDescription className="text-xs">
                      핀을 누르면 아래 전환 카드로 스크롤합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FlowStepOverlayStrip
                      steps={overlaySteps}
                      transitions={displayFlow.ux_transitions}
                      activeHotspotKey={activeHotspotKey}
                      highlightedHotspotKeys={highlightedHotspotKeys}
                      onHotspotActivate={(tIdx, key) => {
                        setActiveHotspotKey(key);
                        if (tIdx != null) scrollToTransition(tIdx);
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">플로 캔버스</CardTitle>
                  <CardDescription className="text-xs">
                    전환 엣지 색은 마찰 체감 점수에 따른 신호등입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="rounded-lg border border-border bg-card/50 p-2">
                  <FlowInsightCanvas flow={displayFlow} />
                </CardContent>
              </Card>

              {flowStepContextThumbs.length > 1 && (
                <FlowStepContextBar
                  className="sticky top-2 z-10"
                  steps={flowStepContextThumbs}
                  activeStepIndex={flowContextStepIndex}
                  onSelectStep={setFlowContextStepIndex}
                />
              )}

              <LayeredAuditDashboard
                resetKey={
                  displayFlow.ux_analysis_run_id ??
                  displayFlow.ux_project_id ??
                  displayFlow.ux_flow_title
                }
                title={displayFlow.ux_flow_title}
                subtitle={
                  [
                    displayFlow.ux_project_id
                      ? `project_id: ${displayFlow.ux_project_id}`
                      : null,
                    flowContextStepIndex != null
                      ? `컨텍스트: 화면 #${flowContextStepIndex}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                layers={displayFlow.ux_audit_layers}
                layerTabLabels={{
                  screen: "화면별 (Layer 1)",
                  flow: "플로우간 전환 (Layer 2)",
                  system: "전체 전략 (Layer 3)",
                }}
                onLayersChange={(next) => {
                  setWorkingFlow((prev) => {
                    const base = prev ?? displayFlow;
                    return { ...base, ux_audit_layers: next };
                  });
                }}
                screenStepSync={
                  flowStepContextThumbs.length > 0
                    ? {
                        maxStepIndex: flowStepContextThumbs.length - 1,
                        activeStepIndex: flowContextStepIndex,
                        onActiveStepIndexChange: setFlowContextStepIndex,
                      }
                    : undefined
                }
              />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">단계 요약 (원본)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {displayFlow.ux_steps.map((s) => (
                      <li
                        key={s.ux_step_index}
                        className="flex gap-3 text-sm"
                      >
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
          </details>
        </div>
      )}
    </div>
  );
}
