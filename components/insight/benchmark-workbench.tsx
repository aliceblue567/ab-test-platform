"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { UxBenchmarkMultiV1 } from "@/lib/ux-insight/benchmark-analysis-multi-v1";
import { BENCHMARK_DATA_PROVENANCE } from "@/lib/ux-insight/benchmark-report-derive";
import { prepareImageFileForUxInsightApi } from "@/lib/ux-insight/client-image-prep";
import { applyPrivacyMaskToImageFile } from "@/lib/ux-insight/image-privacy-mask";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BenchmarkResultPanel,
  fmtBenchSlotDate,
  statusBadgeClassForSlot,
  type BenchSlotDisplay,
} from "@/components/insight/benchmark-result-panel";

type BenchSlot = {
  id: string;
  label: string;
  file: File | null;
  urlDraft: string;
  serviceCategory: string;
  mainTarget: string;
  strengthsSummary: string;
  comparisonPurpose: string;
  /** 쉼표로 구분 → 핵심 특징 배지 */
  featureTagsStr: string;
  capturedAtMs: number | null;
  lastUpdatedMs: number | null;
};

function newSlotId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createBenchSlot(label: string): BenchSlot {
  return {
    id: newSlotId(),
    label,
    file: null,
    urlDraft: "",
    serviceCategory: "",
    mainTarget: "",
    strengthsSummary: "",
    comparisonPurpose: "",
    featureTagsStr: "",
    capturedAtMs: null,
    lastUpdatedMs: null,
  };
}

function base64ToFile(base64: string, mime: string, name: string): File {
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return new File([arr], name, { type: mime });
}

function filledFingerprint(slots: BenchSlot[]): string {
  return slots
    .filter((s) => s.file)
    .map((s) => `${s.id}:${s.file!.size}:${s.file!.lastModified}`)
    .join("|");
}

function parseFeatureTags(s: string): string[] {
  return s
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function BenchmarkWorkbench() {
  const [slots, setSlots] = useState<BenchSlot[]>([
    createBenchSlot("자사 (기준)"),
    createBenchSlot("타사 A"),
  ]);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const [context, setContext] = useState(
    "동일 과업(예: 항공 검색 결과) 화면 비교"
  );
  const [personaAge, setPersonaAge] = useState("30대");
  const [personaProficiency, setPersonaProficiency] = useState("중급");
  const [personaGoal, setPersonaGoal] = useState(
    "최저가 일정을 빠르게 고른다"
  );
  const [privacyMaskBeforeApi, setPrivacyMaskBeforeApi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [capturingSlotId, setCapturingSlotId] = useState<string | null>(null);
  const [report, setReport] = useState<UxBenchmarkMultiV1 | null>(null);
  /** 마지막 성공 분석 시 첨부 파일 지문(순서대로 filled 슬롯) */
  const [analyzeFingerprint, setAnalyzeFingerprint] = useState<string | null>(
    null
  );
  const [analysisCompletedAt, setAnalysisCompletedAt] = useState<number | null>(
    null
  );

  const fileSig = useMemo(
    () =>
      slots
        .map((s) => `${s.id}:${s.file?.size ?? 0}:${s.file?.lastModified ?? 0}`)
        .join("|"),
    [slots]
  );

  const currentFingerprint = useMemo(() => filledFingerprint(slots), [slots]);

  const reportMatchesInputs =
    !!report &&
    !!analyzeFingerprint &&
    analyzeFingerprint.length > 0 &&
    analyzeFingerprint === currentFingerprint;

  const slotDisplays: BenchSlotDisplay[] = useMemo(
    () =>
      slots.map((s, index) => {
        const hasImage = !!s.file;
        let analysisStatus: BenchSlotDisplay["analysisStatus"] = "대기";
        if (hasImage) {
          analysisStatus = reportMatchesInputs ? "완료" : "준비됨";
        }
        return {
          id: s.id,
          label: s.label,
          index,
          hasImage,
          serviceCategory: s.serviceCategory,
          mainTarget: s.mainTarget,
          strengthsSummary: s.strengthsSummary,
          comparisonPurpose: s.comparisonPurpose || context,
          featureHighlights: parseFeatureTags(s.featureTagsStr),
          capturedAt: s.capturedAtMs,
          lastUpdatedAt: s.lastUpdatedMs,
          analysisStatus,
        };
      }),
    [slots, context, reportMatchesInputs]
  );

  useEffect(() => {
    const map: Record<string, string> = {};
    const urls: string[] = [];
    for (const s of slots) {
      if (s.file) {
        const u = URL.createObjectURL(s.file);
        map[s.id] = u;
        urls.push(u);
      }
    }
    setPreviews(map);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [fileSig, slots]);

  const addSlot = () => {
    if (slots.length >= 8) {
      toast.message("비교 슬롯은 최대 8개까지입니다.");
      return;
    }
    setSlots((prev) => [...prev, createBenchSlot(`서비스 ${prev.length + 1}`)]);
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => {
      if (prev.length <= 2) {
        toast.message("최소 2개 슬롯이 필요합니다.");
        return prev;
      }
      return prev.filter((s) => s.id !== id);
    });
  };

  const touchFile = (slot: BenchSlot, file: File): BenchSlot => {
    const now = Date.now();
    return {
      ...slot,
      file,
      capturedAtMs: slot.capturedAtMs ?? now,
      lastUpdatedMs: now,
    };
  };

  const onDropOnSlot = (slotId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("image/")) {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? touchFile(s, f) : s))
      );
    }
  };

  const captureUrl = async (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    const raw = slot?.urlDraft?.trim();
    if (!raw) {
      toast.error("URL을 입력해 주세요.");
      return;
    }
    setCapturingSlotId(slotId);
    try {
      const res = await fetch("/api/ux-insight/capture-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        imageBase64?: string;
        mimeType?: string;
        title?: string;
        description?: string | null;
      };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "캡처 실패");
        return;
      }
      const mime = data.mimeType || "image/png";
      const file = base64ToFile(
        data.imageBase64 ?? "",
        mime,
        `capture_${Date.now()}.png`
      );
      const metaTitle = (data.title || raw).slice(0, 80);
      const metaDesc = data.description?.trim();
      const nextLabel = metaDesc
        ? `${metaTitle}`.slice(0, 64)
        : metaTitle.slice(0, 64);
      const now = Date.now();
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                file,
                label: nextLabel || s.label,
                urlDraft: raw,
                capturedAtMs: s.capturedAtMs ?? now,
                lastUpdatedMs: now,
              }
            : s
        )
      );
      toast.success("페이지를 캡처했습니다. 제목·설명을 슬롯 이름으로 반영했습니다.");
    } catch {
      toast.error("캡처 요청 실패");
    } finally {
      setCapturingSlotId(null);
    }
  };

  const analyze = async () => {
    const filled = slots.filter((s) => s.file);
    if (filled.length < 2) {
      toast.error("이미지가 첨부된 슬롯이 2개 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const fp = filled
        .map((s) => `${s.id}:${s.file!.size}:${s.file!.lastModified}`)
        .join("|");
      const budget = Math.floor(3_400_000 / filled.length);
      let files: File[] = [];
      for (const s of filled) {
        let f = s.file!;
        f = await prepareImageFileForUxInsightApi(f, { maxBytes: budget });
        if (privacyMaskBeforeApi) {
          try {
            f = await applyPrivacyMaskToImageFile(f);
            f = await prepareImageFileForUxInsightApi(f, { maxBytes: budget });
          } catch {
            toast.message("로컬 블러에 실패해 압축만 적용한 전송으로 진행합니다.");
            f = await prepareImageFileForUxInsightApi(s.file!, {
              maxBytes: budget,
            });
          }
        }
        files.push(f);
      }

      const fd = new FormData();
      fd.append("variant_count", String(filled.length));
      filled.forEach((s, i) => {
        fd.append(`label_${i}`, s.label.trim() || `화면 ${i + 1}`);
        fd.append(`image_${i}`, files[i]!);
      });
      fd.append("comparison_context", context);
      fd.append("persona_age", personaAge);
      fd.append("persona_proficiency", personaProficiency);
      fd.append("persona_goal", personaGoal);

      const res = await fetch("/api/ux-insight/analyze-benchmark", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<UxBenchmarkMultiV1>;
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "분석 실패");
        return;
      }
      setReport(data as UxBenchmarkMultiV1);
      setAnalyzeFingerprint(fp);
      setAnalysisCompletedAt(Date.now());
      toast.success("벤치마크 분석이 완료되었습니다.");
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  const filledCount = slots.filter((s) => s.file).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">벤치마킹</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          비교 대상을 등록한 뒤 분석하면{" "}
          <strong className="text-foreground">
            핵심 차이 → 레이더·Gap → 기능 매트릭스 → 우선 과제 → SWOT·전략
          </strong>
          순으로 볼 수 있습니다. 모든 수치·태그는{" "}
          <strong className="text-foreground">AI 화면 분석·추정</strong>입니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] font-normal">
          {BENCHMARK_DATA_PROVENANCE}
        </Badge>
        {analysisCompletedAt != null && reportMatchesInputs && (
          <span className="text-[11px] text-muted-foreground">
            최근 분석일: {fmtBenchSlotDate(analysisCompletedAt)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={addSlot}
        >
          <Plus className="h-4 w-4" />
          비교 대상 추가
        </Button>
        <span className="text-xs text-muted-foreground">
          2~8 슬롯 · 이미지가 있는 슬롯만 전송
        </span>
      </div>

      {/* 1. 비교 대상 등록 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot, idx) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            display={slotDisplays[idx]!}
            previewUrl={previews[slot.id] ?? null}
            canRemove={slots.length > 2}
            capturing={capturingSlotId === slot.id}
            onLabelChange={(v) =>
              setSlots((p) =>
                p.map((s) => (s.id === slot.id ? { ...s, label: v } : s))
              )
            }
            onUrlDraftChange={(v) =>
              setSlots((p) =>
                p.map((s) => (s.id === slot.id ? { ...s, urlDraft: v } : s))
              )
            }
            onMetaChange={(patch) =>
              setSlots((p) =>
                p.map((s) => (s.id === slot.id ? { ...s, ...patch } : s))
              )
            }
            onPickFile={(f) =>
              setSlots((p) =>
                p.map((s) => (s.id === slot.id ? touchFile(s, f) : s))
              )
            }
            onClearFile={() =>
              setSlots((p) =>
                p.map((s) =>
                  s.id === slot.id
                    ? {
                        ...s,
                        file: null,
                        capturedAtMs: null,
                        lastUpdatedMs: null,
                      }
                    : s
                )
              )
            }
            onDrop={(e) => onDropOnSlot(slot.id, e)}
            onCapture={() => captureUrl(slot.id)}
            onRemove={() => removeSlot(slot.id)}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">비교 맥락 · 페르소나</CardTitle>
          <CardDescription className="text-xs">
            슬롯별 &quot;비교 목적&quot;이 비어 있으면 아래 맥락 문구를 기본으로
            표시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>비교 맥락</Label>
            <Textarea
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/15 px-3 py-2 md:col-span-2">
            <div>
              <Label className="text-sm">API 전송 전 로컬 블러</Label>
              <p className="text-xs text-muted-foreground">
                캡처·업로드 이미지에만 적용(완전 삭제 아님).
              </p>
            </div>
            <Switch
              checked={privacyMaskBeforeApi}
              onCheckedChange={setPrivacyMaskBeforeApi}
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
          <div className="space-y-2 md:col-span-2">
            <Label>목적</Label>
            <Textarea
              rows={2}
              value={personaGoal}
              onChange={(e) => setPersonaGoal(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button
              type="button"
              className="gap-2"
              disabled={loading || filledCount < 2}
              onClick={analyze}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
              N-Way 벤치마크 분석 (배치 1회)
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          비교 분석 중…
        </div>
      )}

      {report && !loading && (
        <BenchmarkResultPanel report={report} selfIndex={0} />
      )}
    </div>
  );
}

function SlotCard({
  slot,
  display,
  previewUrl,
  canRemove,
  capturing,
  onLabelChange,
  onUrlDraftChange,
  onMetaChange,
  onPickFile,
  onClearFile,
  onDrop,
  onCapture,
  onRemove,
}: {
  slot: BenchSlot;
  display: BenchSlotDisplay;
  previewUrl: string | null;
  canRemove: boolean;
  capturing: boolean;
  onLabelChange: (v: string) => void;
  onUrlDraftChange: (v: string) => void;
  onMetaChange: (patch: Partial<BenchSlot>) => void;
  onPickFile: (f: File) => void;
  onClearFile: () => void;
  onDrop: (e: React.DragEvent) => void;
  onCapture: () => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tags = parseFeatureTags(slot.featureTagsStr);

  return (
    <div className="flex min-h-[320px] flex-col rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-mono text-muted-foreground">
          #{display.index + 1}
        </span>
        <Input
          className="h-8 max-w-[180px] flex-1 text-sm"
          value={slot.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="서비스 이름"
        />
        <Badge
          className={cn("text-[10px]", statusBadgeClassForSlot(display.analysisStatus))}
        >
          {display.analysisStatus}
        </Badge>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div
        className="relative flex flex-1 flex-col gap-2 p-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f?.type.startsWith("image/")) onPickFile(f);
            e.target.value = "";
          }}
        />
        {previewUrl ? (
          <>
            <div className="relative mx-auto flex max-h-[180px] w-full max-w-md items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
              <Image
                src={previewUrl}
                alt={slot.label}
                width={640}
                height={480}
                className="h-auto max-h-[180px] w-full object-contain"
                unoptimized
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFile}
            >
              이미지 제거
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[120px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-muted/30"
          >
            <ImagePlus className="h-9 w-9" />
            클릭 또는 드래그로 이미지
          </button>
        )}

        <div className="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2 text-xs">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">
                서비스 카테고리
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder="예: OTA 항공"
                value={slot.serviceCategory}
                onChange={(e) =>
                  onMetaChange({ serviceCategory: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">
                주요 타겟
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder="예: 20~30대 자유여행"
                value={slot.mainTarget}
                onChange={(e) => onMetaChange({ mainTarget: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px] text-muted-foreground">
                강점 요약
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder="예: 빠른 탐색, 개인화"
                value={slot.strengthsSummary}
                onChange={(e) =>
                  onMetaChange({ strengthsSummary: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px] text-muted-foreground">
                비교 목적 (슬롯)
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder="비어 있으면 전체 맥락 사용"
                value={slot.comparisonPurpose}
                onChange={(e) =>
                  onMetaChange({ comparisonPurpose: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px] text-muted-foreground">
                핵심 특징 (쉼표 구분)
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder="빠른 탐색, 개인화 추천, 후기 중심"
                value={slot.featureTagsStr}
                onChange={(e) =>
                  onMetaChange({ featureTagsStr: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border/40 pt-1.5 text-[10px] text-muted-foreground">
            <span>
              캡처·반영: {fmtBenchSlotDate(display.capturedAt)}
            </span>
            <span>업데이트: {fmtBenchSlotDate(display.lastUpdatedAt)}</span>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="text-[10px] font-normal"
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1 rounded-md border border-border/60 bg-muted/10 p-2">
          <Label className="text-[10px] text-muted-foreground">URL 캡처</Label>
          <div className="flex gap-1">
            <Input
              className="h-8 flex-1 text-xs"
              placeholder="https://…"
              value={slot.urlDraft}
              onChange={(e) => onUrlDraftChange(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 gap-1 px-2"
              disabled={capturing}
              onClick={onCapture}
            >
              {capturing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
