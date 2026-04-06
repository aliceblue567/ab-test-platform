"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, Layers3, Printer } from "lucide-react";
import { toast } from "sonner";

import type {
  UxAuditLayers,
  UxImprovementScreenItem,
  UxIssueScreenItem,
} from "@/lib/ux-insight/layered-audit-v1";
import {
  buildFigmaGuideFlow,
  buildFigmaGuideScreen,
  buildFigmaGuideTotal,
} from "@/lib/ux-insight/figma-guide-copy";
import {
  emptyUxAuditLayers,
  parseUxAuditLayers,
} from "@/lib/ux-insight/layered-audit-v1";
import { exportLayeredAuditMarkdown } from "@/lib/ux-insight/export-layered-audit-md";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ScreenLayerStepSyncFrame } from "@/components/insight/screen-layer-step-sync-frame";

type LayerTab = "screen" | "flow" | "system";

export type ScreenStepSyncConfig = {
  maxStepIndex: number;
  activeStepIndex: number | null;
  onActiveStepIndexChange: (index: number | null) => void;
};

function clampStepToMax(
  n: number | undefined,
  maxIdx: number
): number | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(maxIdx, Math.floor(n)));
}

function resolveImprovementScreenStep(
  imp: UxImprovementScreenItem,
  issues: UxIssueScreenItem[],
  impIndex: number
): number | undefined {
  if (imp.ux_step_index != null) return imp.ux_step_index;
  const rel = imp.ux_issue_screen_related_id;
  if (rel) {
    const iss = issues.find((x) => x.ux_issue_screen_id === rel);
    if (iss?.ux_step_index != null) return iss.ux_step_index;
  }
  const iss = issues[impIndex];
  return iss?.ux_step_index ?? undefined;
}

function normalizeLayers(raw: UxAuditLayers | null | undefined): UxAuditLayers {
  if (!raw) return emptyUxAuditLayers();
  const p = parseUxAuditLayers(raw);
  return p.ok ? p.data : emptyUxAuditLayers();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadMarkdown(filename: string, body: string) {
  const blob = new Blob([body], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printMarkdownAsPdfHint(md: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const safe = escapeHtml(md);
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(
      title
    )}</title><style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px; max-width: 48rem; margin: 0 auto; line-height: 1.5; white-space: pre-wrap; }
      @media print { body { padding: 12px; } }
    </style></head><body><pre>${safe}</pre></body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}

export type LayeredAuditDashboardProps = {
  title: string;
  subtitle?: string;
  layers?: UxAuditLayers | null;
  /** 새 분석으로 초기화할 때 사용 (run id 등) */
  resetKey?: string;
  onLayersChange?: (next: UxAuditLayers) => void;
  className?: string;
  /** 탭 라벨 커스텀 (예: 멀티 플로우 뷰에서 한국어) */
  layerTabLabels?: Partial<Record<LayerTab, string>>;
  /** 멀티 스텝 플로우: Layer 1 카드와 상단 단계 썸네일 동기화 */
  screenStepSync?: ScreenStepSyncConfig | null;
};

async function copyGuide(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("피그마 가이드를 클립보드에 복사했습니다.");
  } catch {
    toast.error("복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
  }
}

export function LayeredAuditDashboard({
  title,
  subtitle,
  layers: layersProp,
  resetKey,
  onLayersChange,
  className,
  layerTabLabels,
  screenStepSync,
}: LayeredAuditDashboardProps) {
  const [tab, setTab] = useState<LayerTab>("screen");
  const [draft, setDraft] = useState<UxAuditLayers>(() =>
    normalizeLayers(layersProp)
  );
  const [expertNote, setExpertNote] = useState("");

  /** 부모가 같은 resetKey로 매 렌더 새 객체를 넘기면 입력 포커스가 끊기므로 run/식별자 변경 시에만 동기화 */
  useEffect(() => {
    setDraft(normalizeLayers(layersProp));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layersProp은 resetKey 전환 시점의 스냅샷만 반영
  }, [resetKey]);

  const pushDraft = useCallback(
    (next: UxAuditLayers) => {
      setDraft(next);
      onLayersChange?.(next);
    },
    [onLayersChange]
  );

  const zoneHeightsRef = useRef<Map<number, number>>(new Map());
  const zoneRafRef = useRef<number | null>(null);

  const reportBandHeight = useCallback(
    (step: number, height: number) => {
      if (!screenStepSync) return;
      if (height <= 0) zoneHeightsRef.current.delete(step);
      else if (step >= 0 && step <= screenStepSync.maxStepIndex) {
        zoneHeightsRef.current.set(step, height);
      }
      if (zoneRafRef.current != null) cancelAnimationFrame(zoneRafRef.current);
      zoneRafRef.current = requestAnimationFrame(() => {
        zoneRafRef.current = null;
        let best: number | null = null;
        let bestH = 0;
        for (const [s, h] of zoneHeightsRef.current) {
          if (h > bestH) {
            bestH = h;
            best = s;
          }
        }
        if (best != null && bestH > 0) {
          screenStepSync.onActiveStepIndexChange(best);
        }
      });
    },
    [screenStepSync]
  );

  const activateFlowStep = useCallback(
    (step: number) => {
      screenStepSync?.onActiveStepIndexChange(step);
    },
    [screenStepSync]
  );

  const screenScrollSyncEnabled = !!screenStepSync;

  const md = exportLayeredAuditMarkdown({
    title,
    subtitle,
    layers: draft,
    expertNote,
  });

  const safeSlug = title.replace(/[^\w\uac00-\ud7af\-]+/gi, "_").slice(0, 64);

  const tabLabelsResolved = {
    screen: layerTabLabels?.screen ?? "Layer 1 · 화면",
    flow: layerTabLabels?.flow ?? "Layer 2 · 플로우",
    system: layerTabLabels?.system ?? "Layer 3 · 전체 전략",
  };

  const tabBtn = (id: LayerTab, label: string) => (
    <Button
      type="button"
      size="sm"
      variant={tab === id ? "default" : "outline"}
      className="rounded-md"
      onClick={() => setTab(id)}
    >
      {label}
    </Button>
  );

  return (
    <Card className={cn("border-primary/20 bg-card/80", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <CardTitle className="text-base">
                계층형 UX 감사 (Layered Audit)
              </CardTitle>
              <CardDescription>
                화면 · 플로우 · 전체 전략 순으로 문제점과 개선안을 구분합니다.
                전문가 필드를 바로 수정할 수 있습니다.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                downloadMarkdown(`ux-audit_${safeSlug}.md`, md)
              }
            >
              <Download className="h-3.5 w-3.5" />
              Markdown
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => printMarkdownAsPdfHint(md, title)}
            >
              <Printer className="h-3.5 w-3.5" />
              PDF(인쇄)
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {tabBtn("screen", tabLabelsResolved.screen)}
          {tabBtn("flow", tabLabelsResolved.flow)}
          {tabBtn("system", tabLabelsResolved.system)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tab === "screen" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">문제점 · ux_issue_screen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {(draft.ux_audit_layer_screen?.ux_issue_screen ?? []).map(
                  (it, i) => {
                    const maxIdx = screenStepSync?.maxStepIndex ?? 0;
                    const stepClamped = clampStepToMax(
                      it.ux_step_index,
                      maxIdx
                    );
                    const stepForSync =
                      screenScrollSyncEnabled && stepClamped != null
                        ? stepClamped
                        : null;
                    const isStepHi =
                      screenStepSync != null &&
                      stepForSync != null &&
                      screenStepSync.activeStepIndex === stepForSync;

                    return (
                      <ScreenLayerStepSyncFrame
                        key={it.ux_issue_screen_id ?? `s-iss-${i}`}
                        stepIndex={stepForSync}
                        syncEnabled={screenScrollSyncEnabled}
                        isHighlighted={isStepHi}
                        reportBandHeight={reportBandHeight}
                        onPointerActivate={activateFlowStep}
                      >
                        <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
                          {!screenStepSync &&
                            it.ux_step_index != null && (
                              <p className="text-[10px] font-mono text-muted-foreground">
                                ux_step_index: {it.ux_step_index}
                              </p>
                            )}
                          {screenStepSync && (
                            <div className="space-y-1">
                              <Label className="text-xs">
                                플로우 단계 (ux_step_index)
                              </Label>
                              <Select
                                value={
                                  stepClamped === undefined
                                    ? "none"
                                    : String(stepClamped)
                                }
                                onValueChange={(v) => {
                                  const arr = [
                                    ...(draft.ux_audit_layer_screen
                                      ?.ux_issue_screen ?? []),
                                  ];
                                  const nextStep =
                                    v === "none"
                                      ? undefined
                                      : clampStepToMax(
                                          Number(v),
                                          screenStepSync.maxStepIndex
                                        );
                                  arr[i] = {
                                    ...it,
                                    ux_step_index: nextStep,
                                  };
                                  pushDraft({
                                    ...draft,
                                    ux_audit_layer_screen: {
                                      ux_issue_screen: arr,
                                      ux_improvement_screen:
                                        draft.ux_audit_layer_screen
                                          ?.ux_improvement_screen ?? [],
                                    },
                                  });
                                }}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="단계 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    (미지정 · 썸네일 동기화 안 함)
                                  </SelectItem>
                                  {Array.from(
                                    { length: screenStepSync.maxStepIndex + 1 },
                                    (_, s) => (
                                      <SelectItem key={s} value={String(s)}>
                                        화면 #{s}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label className="text-xs">요약</Label>
                            <Textarea
                              rows={2}
                              className="text-sm"
                              value={it.ux_issue_screen_summary}
                              onChange={(e) => {
                                const arr = [
                                  ...(draft.ux_audit_layer_screen
                                    ?.ux_issue_screen ?? []),
                                ];
                                arr[i] = {
                                  ...it,
                                  ux_issue_screen_summary: e.target.value,
                                };
                                pushDraft({
                                  ...draft,
                                  ux_audit_layer_screen: {
                                    ux_issue_screen: arr,
                                    ux_improvement_screen:
                                      draft.ux_audit_layer_screen
                                        ?.ux_improvement_screen ?? [],
                                  },
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Why (UX 근거)</Label>
                            <Textarea
                              rows={2}
                              className="text-sm"
                              value={it.ux_issue_screen_why}
                              onChange={(e) => {
                                const arr = [
                                  ...(draft.ux_audit_layer_screen
                                    ?.ux_issue_screen ?? []),
                                ];
                                arr[i] = {
                                  ...it,
                                  ux_issue_screen_why: e.target.value,
                                };
                                pushDraft({
                                  ...draft,
                                  ux_audit_layer_screen: {
                                    ux_issue_screen: arr,
                                    ux_improvement_screen:
                                      draft.ux_audit_layer_screen
                                        ?.ux_improvement_screen ?? [],
                                  },
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">이론 메모 (선택)</Label>
                            <Textarea
                              rows={2}
                              className="text-sm"
                              value={it.ux_issue_screen_theory_note ?? ""}
                              onChange={(e) => {
                                const arr = [
                                  ...(draft.ux_audit_layer_screen
                                    ?.ux_issue_screen ?? []),
                                ];
                                arr[i] = {
                                  ...it,
                                  ux_issue_screen_theory_note:
                                    e.target.value || undefined,
                                };
                                pushDraft({
                                  ...draft,
                                  ux_audit_layer_screen: {
                                    ux_issue_screen: arr,
                                    ux_improvement_screen:
                                      draft.ux_audit_layer_screen
                                        ?.ux_improvement_screen ?? [],
                                  },
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">심각도</Label>
                            <Select
                              value={it.ux_issue_screen_severity ?? "none"}
                              onValueChange={(v) => {
                                const arr = [
                                  ...(draft.ux_audit_layer_screen
                                    ?.ux_issue_screen ?? []),
                                ];
                                arr[i] = {
                                  ...it,
                                  ux_issue_screen_severity:
                                    v === "none"
                                      ? undefined
                                      : (v as "high" | "medium" | "low"),
                                };
                                pushDraft({
                                  ...draft,
                                  ux_audit_layer_screen: {
                                    ux_issue_screen: arr,
                                    ux_improvement_screen:
                                      draft.ux_audit_layer_screen
                                        ?.ux_improvement_screen ?? [],
                                  },
                                });
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">(없음)</SelectItem>
                                <SelectItem value="high">높음</SelectItem>
                                <SelectItem value="medium">중간</SelectItem>
                                <SelectItem value="low">낮음</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </ScreenLayerStepSyncFrame>
                    );
                  }
                )}
                {(draft.ux_audit_layer_screen?.ux_issue_screen ?? []).length ===
                  0 && (
                  <p className="text-sm text-muted-foreground">
                    이 레이어에 대한 문제점이 없습니다. 새 분석에서 모델이 채우거나
                    상단 플로우/전략 탭을 확인하세요.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  개선 포인트 · ux_improvement_screen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {(
                  draft.ux_audit_layer_screen?.ux_improvement_screen ?? []
                ).map((it, i) => {
                  const screenIssues =
                    draft.ux_audit_layer_screen?.ux_issue_screen ?? [];
                  const maxIdx = screenStepSync?.maxStepIndex ?? 0;
                  const resolvedRaw = resolveImprovementScreenStep(
                    it,
                    screenIssues,
                    i
                  );
                  const stepOwn = clampStepToMax(it.ux_step_index, maxIdx);
                  const stepEffective =
                    stepOwn ?? clampStepToMax(resolvedRaw, maxIdx);
                  const stepForSync =
                    screenScrollSyncEnabled && stepEffective != null
                      ? stepEffective
                      : null;
                  const isStepHi =
                    screenStepSync != null &&
                    stepForSync != null &&
                    screenStepSync.activeStepIndex === stepForSync;

                  return (
                    <ScreenLayerStepSyncFrame
                      key={it.ux_improvement_screen_id ?? `s-imp-${i}`}
                      stepIndex={stepForSync}
                      syncEnabled={screenScrollSyncEnabled}
                      isHighlighted={isStepHi}
                      reportBandHeight={reportBandHeight}
                      onPointerActivate={activateFlowStep}
                    >
                      <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
                        {!screenStepSync &&
                          (it.ux_step_index != null || resolvedRaw != null) && (
                            <p className="text-[10px] font-mono text-muted-foreground">
                              ux_step_index:{" "}
                              {it.ux_step_index != null
                                ? it.ux_step_index
                                : `(문제 카드 기준 ≈ ${resolvedRaw})`}
                            </p>
                          )}
                        {screenStepSync && (
                          <div className="space-y-1">
                            <Label className="text-xs">
                              플로우 단계 (ux_step_index)
                            </Label>
                            <Select
                              value={
                                it.ux_step_index == null
                                  ? "inherit"
                                  : String(
                                      clampStepToMax(
                                        it.ux_step_index,
                                        screenStepSync.maxStepIndex
                                      ) ?? "inherit"
                                    )
                              }
                              onValueChange={(v) => {
                                const arr = [
                                  ...(draft.ux_audit_layer_screen
                                    ?.ux_improvement_screen ?? []),
                                ];
                                const nextStep =
                                  v === "inherit"
                                    ? undefined
                                    : clampStepToMax(
                                        Number(v),
                                        screenStepSync.maxStepIndex
                                      );
                                arr[i] = {
                                  ...it,
                                  ux_step_index: nextStep,
                                };
                                pushDraft({
                                  ...draft,
                                  ux_audit_layer_screen: {
                                    ux_issue_screen:
                                      draft.ux_audit_layer_screen
                                        ?.ux_issue_screen ?? [],
                                    ux_improvement_screen: arr,
                                  },
                                });
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="단계" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inherit">
                                  연결 문제와 동일 (인덱스 상속)
                                </SelectItem>
                                {Array.from(
                                  {
                                    length: screenStepSync.maxStepIndex + 1,
                                  },
                                  (_, s) => (
                                    <SelectItem key={s} value={String(s)}>
                                      화면 #{s} (고정)
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            {it.ux_step_index == null &&
                              resolvedRaw != null && (
                                <p className="text-[10px] text-muted-foreground">
                                  상속: 화면 #{resolvedRaw}
                                </p>
                              )}
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">실행 액션</Label>
                          <Textarea
                            rows={2}
                            className="text-sm"
                            value={it.ux_improvement_screen_action}
                            onChange={(e) => {
                              const arr = [
                                ...(draft.ux_audit_layer_screen
                                  ?.ux_improvement_screen ?? []),
                              ];
                              arr[i] = {
                                ...it,
                                ux_improvement_screen_action: e.target.value,
                              };
                              pushDraft({
                                ...draft,
                                ux_audit_layer_screen: {
                                  ux_issue_screen:
                                    draft.ux_audit_layer_screen
                                      ?.ux_issue_screen ?? [],
                                  ux_improvement_screen: arr,
                                },
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">기대 효과 (Impact)</Label>
                          <Textarea
                            rows={2}
                            className="text-sm"
                            value={it.ux_improvement_screen_impact}
                            onChange={(e) => {
                              const arr = [
                                ...(draft.ux_audit_layer_screen
                                  ?.ux_improvement_screen ?? []),
                              ];
                              arr[i] = {
                                ...it,
                                ux_improvement_screen_impact: e.target.value,
                              };
                              pushDraft({
                                ...draft,
                                ux_audit_layer_screen: {
                                  ux_issue_screen:
                                    draft.ux_audit_layer_screen
                                      ?.ux_issue_screen ?? [],
                                  ux_improvement_screen: arr,
                                },
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            와이어프레임 메모 (선택)
                          </Label>
                          <Textarea
                            rows={2}
                            className="text-sm"
                            value={
                              it.ux_improvement_screen_wireframe_note ?? ""
                            }
                            onChange={(e) => {
                              const arr = [
                                ...(draft.ux_audit_layer_screen
                                  ?.ux_improvement_screen ?? []),
                              ];
                              arr[i] = {
                                ...it,
                                ux_improvement_screen_wireframe_note:
                                  e.target.value || undefined,
                              };
                              pushDraft({
                                ...draft,
                                ux_audit_layer_screen: {
                                  ux_issue_screen:
                                    draft.ux_audit_layer_screen
                                      ?.ux_issue_screen ?? [],
                                  ux_improvement_screen: arr,
                                },
                              });
                            }}
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => {
                              const issues =
                                draft.ux_audit_layer_screen?.ux_issue_screen ??
                                [];
                              const rel = it.ux_issue_screen_related_id;
                              const iss = rel
                                ? issues.find(
                                    (x) => x.ux_issue_screen_id === rel
                                  )
                                : issues[i];
                              void copyGuide(
                                buildFigmaGuideScreen({
                                  improvementAction:
                                    it.ux_improvement_screen_action,
                                  improvementImpact:
                                    it.ux_improvement_screen_impact,
                                  improvementWireframe:
                                    it.ux_improvement_screen_wireframe_note,
                                  issueSummary: iss?.ux_issue_screen_summary,
                                  issueWhy: iss?.ux_issue_screen_why,
                                  issueTheory: iss?.ux_issue_screen_theory_note,
                                })
                              );
                            }}
                          >
                            <Copy className="h-3 w-3" />
                            피그마 가이드 복사
                          </Button>
                        </div>
                      </div>
                    </ScreenLayerStepSyncFrame>
                  );
                })}
                {(
                  draft.ux_audit_layer_screen?.ux_improvement_screen ?? []
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    개선안이 비어 있습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "flow" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">문제점 · ux_issue_flow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {(draft.ux_audit_layer_flow?.ux_issue_flow ?? []).map(
                  (it, i) => (
                    <div
                      key={it.ux_issue_flow_id ?? `f-iss-${i}`}
                      className="rounded-lg border border-border bg-muted/10 p-3 space-y-2"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">요약</Label>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          value={it.ux_issue_flow_summary}
                          onChange={(e) => {
                            const arr = [
                              ...(draft.ux_audit_layer_flow?.ux_issue_flow ??
                                []),
                            ];
                            arr[i] = {
                              ...it,
                              ux_issue_flow_summary: e.target.value,
                            };
                            pushDraft({
                              ...draft,
                              ux_audit_layer_flow: {
                                ux_issue_flow: arr,
                                ux_improvement_flow:
                                  draft.ux_audit_layer_flow
                                    ?.ux_improvement_flow ?? [],
                              },
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Why</Label>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          value={it.ux_issue_flow_why}
                          onChange={(e) => {
                            const arr = [
                              ...(draft.ux_audit_layer_flow?.ux_issue_flow ??
                                []),
                            ];
                            arr[i] = { ...it, ux_issue_flow_why: e.target.value };
                            pushDraft({
                              ...draft,
                              ux_audit_layer_flow: {
                                ux_issue_flow: arr,
                                ux_improvement_flow:
                                  draft.ux_audit_layer_flow
                                    ?.ux_improvement_flow ?? [],
                              },
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">이론 메모 (선택)</Label>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          value={it.ux_issue_flow_theory_note ?? ""}
                          onChange={(e) => {
                            const arr = [
                              ...(draft.ux_audit_layer_flow?.ux_issue_flow ??
                                []),
                            ];
                            arr[i] = {
                              ...it,
                              ux_issue_flow_theory_note:
                                e.target.value || undefined,
                            };
                            pushDraft({
                              ...draft,
                              ux_audit_layer_flow: {
                                ux_issue_flow: arr,
                                ux_improvement_flow:
                                  draft.ux_audit_layer_flow
                                    ?.ux_improvement_flow ?? [],
                              },
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">전환 맥락 (선택)</Label>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          value={it.ux_issue_flow_transition_hint ?? ""}
                          onChange={(e) => {
                            const arr = [
                              ...(draft.ux_audit_layer_flow?.ux_issue_flow ??
                                []),
                            ];
                            arr[i] = {
                              ...it,
                              ux_issue_flow_transition_hint:
                                e.target.value || undefined,
                            };
                            pushDraft({
                              ...draft,
                              ux_audit_layer_flow: {
                                ux_issue_flow: arr,
                                ux_improvement_flow:
                                  draft.ux_audit_layer_flow
                                    ?.ux_improvement_flow ?? [],
                              },
                            });
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
                {(draft.ux_audit_layer_flow?.ux_issue_flow ?? []).length ===
                  0 && (
                  <p className="text-sm text-muted-foreground">
                    플로우 레이어 이슈가 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  개선 포인트 · ux_improvement_flow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {(
                  draft.ux_audit_layer_flow?.ux_improvement_flow ?? []
                ).map((it, i) => (
                  <div
                    key={it.ux_improvement_flow_id ?? `f-imp-${i}`}
                    className="rounded-lg border border-border bg-muted/10 p-3 space-y-2"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">실행 액션</Label>
                      <Textarea
                        rows={2}
                        className="text-sm"
                        value={it.ux_improvement_flow_action}
                        onChange={(e) => {
                          const arr = [
                            ...(draft.ux_audit_layer_flow?.ux_improvement_flow ??
                              []),
                          ];
                          arr[i] = {
                            ...it,
                            ux_improvement_flow_action: e.target.value,
                          };
                          pushDraft({
                            ...draft,
                            ux_audit_layer_flow: {
                              ux_issue_flow:
                                draft.ux_audit_layer_flow?.ux_issue_flow ?? [],
                              ux_improvement_flow: arr,
                            },
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Impact</Label>
                      <Textarea
                        rows={2}
                        className="text-sm"
                        value={it.ux_improvement_flow_impact}
                        onChange={(e) => {
                          const arr = [
                            ...(draft.ux_audit_layer_flow?.ux_improvement_flow ??
                              []),
                          ];
                          arr[i] = {
                            ...it,
                            ux_improvement_flow_impact: e.target.value,
                          };
                          pushDraft({
                            ...draft,
                            ux_audit_layer_flow: {
                              ux_issue_flow:
                                draft.ux_audit_layer_flow?.ux_issue_flow ?? [],
                              ux_improvement_flow: arr,
                            },
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">네비/구조 메모 (선택)</Label>
                      <Textarea
                        rows={2}
                        className="text-sm"
                        value={it.ux_improvement_flow_nav_note ?? ""}
                        onChange={(e) => {
                          const arr = [
                            ...(draft.ux_audit_layer_flow?.ux_improvement_flow ??
                              []),
                          ];
                          arr[i] = {
                            ...it,
                            ux_improvement_flow_nav_note:
                              e.target.value || undefined,
                          };
                          pushDraft({
                            ...draft,
                            ux_audit_layer_flow: {
                              ux_issue_flow:
                                draft.ux_audit_layer_flow?.ux_issue_flow ?? [],
                              ux_improvement_flow: arr,
                            },
                          });
                        }}
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => {
                          const issues =
                            draft.ux_audit_layer_flow?.ux_issue_flow ?? [];
                          const rel = it.ux_issue_flow_related_id;
                          const iss = rel
                            ? issues.find((x) => x.ux_issue_flow_id === rel)
                            : issues[i];
                          void copyGuide(
                            buildFigmaGuideFlow({
                              improvementAction: it.ux_improvement_flow_action,
                              improvementImpact: it.ux_improvement_flow_impact,
                              navNote: it.ux_improvement_flow_nav_note,
                              issueSummary: iss?.ux_issue_flow_summary,
                              issueWhy: iss?.ux_issue_flow_why,
                              issueTheory: iss?.ux_issue_flow_theory_note,
                            })
                          );
                        }}
                      >
                        <Copy className="h-3 w-3" />
                        피그마 가이드 복사
                      </Button>
                    </div>
                  </div>
                ))}
                {(
                  draft.ux_audit_layer_flow?.ux_improvement_flow ?? []
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    플로우 개선안이 비어 있습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "system" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">문제점 · ux_issue_total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {(draft.ux_audit_layer_system?.ux_issue_total ?? []).map(
                  (it, i) => (
                    <div
                      key={it.ux_issue_total_id ?? `t-iss-${i}`}
                      className="rounded-lg border border-border bg-muted/10 p-3 space-y-2"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">요약</Label>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          value={it.ux_issue_total_summary}
                          onChange={(e) => {
                            const arr = [
                              ...(draft.ux_audit_layer_system?.ux_issue_total ??
                                []),
                            ];
                            arr[i] = {
                              ...it,
                              ux_issue_total_summary: e.target.value,
                            };
                            pushDraft({
                              ...draft,
                              ux_audit_layer_system: {
                                ux_issue_total: arr,
                                ux_improvement_total:
                                  draft.ux_audit_layer_system
                                    ?.ux_improvement_total ?? [],
                              },
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Why</Label>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          value={it.ux_issue_total_why}
                          onChange={(e) => {
                            const arr = [
                              ...(draft.ux_audit_layer_system?.ux_issue_total ??
                                []),
                            ];
                            arr[i] = {
                              ...it,
                              ux_issue_total_why: e.target.value,
                            };
                            pushDraft({
                              ...draft,
                              ux_audit_layer_system: {
                                ux_issue_total: arr,
                                ux_improvement_total:
                                  draft.ux_audit_layer_system
                                    ?.ux_improvement_total ?? [],
                              },
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">이론 메모 (선택)</Label>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          value={it.ux_issue_total_theory_note ?? ""}
                          onChange={(e) => {
                            const arr = [
                              ...(draft.ux_audit_layer_system?.ux_issue_total ??
                                []),
                            ];
                            arr[i] = {
                              ...it,
                              ux_issue_total_theory_note:
                                e.target.value || undefined,
                            };
                            pushDraft({
                              ...draft,
                              ux_audit_layer_system: {
                                ux_issue_total: arr,
                                ux_improvement_total:
                                  draft.ux_audit_layer_system
                                    ?.ux_improvement_total ?? [],
                              },
                            });
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
                {(draft.ux_audit_layer_system?.ux_issue_total ?? []).length ===
                  0 && (
                  <p className="text-sm text-muted-foreground">
                    전략 레이어 이슈가 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  개선 포인트 · ux_improvement_total
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {(
                  draft.ux_audit_layer_system?.ux_improvement_total ?? []
                ).map((it, i) => (
                  <div
                    key={it.ux_improvement_total_id ?? `t-imp-${i}`}
                    className="rounded-lg border border-border bg-muted/10 p-3 space-y-2"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">실행 액션</Label>
                      <Textarea
                        rows={2}
                        className="text-sm"
                        value={it.ux_improvement_total_action}
                        onChange={(e) => {
                          const arr = [
                            ...(draft.ux_audit_layer_system
                              ?.ux_improvement_total ?? []),
                          ];
                          arr[i] = {
                            ...it,
                            ux_improvement_total_action: e.target.value,
                          };
                          pushDraft({
                            ...draft,
                            ux_audit_layer_system: {
                              ux_issue_total:
                                draft.ux_audit_layer_system?.ux_issue_total ??
                                [],
                              ux_improvement_total: arr,
                            },
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Impact</Label>
                      <Textarea
                        rows={2}
                        className="text-sm"
                        value={it.ux_improvement_total_impact}
                        onChange={(e) => {
                          const arr = [
                            ...(draft.ux_audit_layer_system
                              ?.ux_improvement_total ?? []),
                          ];
                          arr[i] = {
                            ...it,
                            ux_improvement_total_impact: e.target.value,
                          };
                          pushDraft({
                            ...draft,
                            ux_audit_layer_system: {
                              ux_issue_total:
                                draft.ux_audit_layer_system?.ux_issue_total ??
                                [],
                              ux_improvement_total: arr,
                            },
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">전략 메모 (선택)</Label>
                      <Textarea
                        rows={2}
                        className="text-sm"
                        value={it.ux_improvement_total_strategy_note ?? ""}
                        onChange={(e) => {
                          const arr = [
                            ...(draft.ux_audit_layer_system
                              ?.ux_improvement_total ?? []),
                          ];
                          arr[i] = {
                            ...it,
                            ux_improvement_total_strategy_note:
                              e.target.value || undefined,
                          };
                          pushDraft({
                            ...draft,
                            ux_audit_layer_system: {
                              ux_issue_total:
                                draft.ux_audit_layer_system?.ux_issue_total ??
                                [],
                              ux_improvement_total: arr,
                            },
                          });
                        }}
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => {
                          const issues =
                            draft.ux_audit_layer_system?.ux_issue_total ?? [];
                          const rel = it.ux_issue_total_related_id;
                          const iss = rel
                            ? issues.find((x) => x.ux_issue_total_id === rel)
                            : issues[i];
                          void copyGuide(
                            buildFigmaGuideTotal({
                              improvementAction: it.ux_improvement_total_action,
                              improvementImpact: it.ux_improvement_total_impact,
                              strategyNote: it.ux_improvement_total_strategy_note,
                              issueSummary: iss?.ux_issue_total_summary,
                              issueWhy: iss?.ux_issue_total_why,
                              issueTheory: iss?.ux_issue_total_theory_note,
                            })
                          );
                        }}
                      >
                        <Copy className="h-3 w-3" />
                        피그마 가이드 복사
                      </Button>
                    </div>
                  </div>
                ))}
                {(
                  draft.ux_audit_layer_system?.ux_improvement_total ?? []
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    전략 개선안이 비어 있습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-border/80 bg-muted/5 p-3">
          <Label className="text-xs font-medium">전문가 메모 (내보내기에 포함)</Label>
          <Textarea
            rows={3}
            className="text-sm"
            placeholder="감사 총평, 내부 공유 메모 등…"
            value={expertNote}
            onChange={(e) => setExpertNote(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
