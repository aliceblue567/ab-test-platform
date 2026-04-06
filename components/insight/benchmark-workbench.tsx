"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Building2,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Scale,
  Sparkles,
  Table2,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  RADAR_SLOT_COLORS,
  toRadarChartRowsMulti,
  type UxBenchmarkMultiV1,
} from "@/lib/ux-insight/benchmark-analysis-multi-v1";
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
import { cn } from "@/lib/utils";

type BenchSlot = {
  id: string;
  label: string;
  file: File | null;
  urlDraft: string;
};

function newSlotId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function base64ToFile(base64: string, mime: string, name: string): File {
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return new File([arr], name, { type: mime });
}

function SwotBlock({
  title,
  items,
  className,
}: {
  title: string;
  items: string[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border p-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm leading-snug">
        {items.length === 0 && (
          <li className="text-muted-foreground">—</li>
        )}
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BenchmarkWorkbench() {
  const [slots, setSlots] = useState<BenchSlot[]>([
    { id: newSlotId(), label: "자사 (기준)", file: null, urlDraft: "" },
    { id: newSlotId(), label: "타사 A", file: null, urlDraft: "" },
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
  const [swotTab, setSwotTab] = useState(0);

  const fileSig = useMemo(
    () =>
      slots
        .map((s) => `${s.id}:${s.file?.size ?? 0}:${s.file?.lastModified ?? 0}`)
        .join("|"),
    [slots]
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
    setSlots((prev) => [
      ...prev,
      {
        id: newSlotId(),
        label: `서비스 ${prev.length + 1}`,
        file: null,
        urlDraft: "",
      },
    ]);
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

  const onDropOnSlot = (slotId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("image/")) {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, file: f } : s))
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
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, file, label: nextLabel || s.label, urlDraft: raw }
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
      setSwotTab(0);
      toast.success("벤치마크 분석이 완료되었습니다.");
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  const radar = report ? toRadarChartRowsMulti(report) : null;
  const filledCount = slots.filter((s) => s.file).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">벤치마킹</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          슬롯을 추가해 N개 서비스를 한 번에 비교합니다. URL 캡처·드래그 업로드·단일
          API 배치 분석을 지원합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addSlot}>
          <Plus className="h-4 w-4" />
          비교 대상 추가
        </Button>
        <span className="text-xs text-muted-foreground">2~8 슬롯 · 이미지가 있는 슬롯만 전송</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot, idx) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            index={idx}
            previewUrl={previews[slot.id] ?? null}
            canRemove={slots.length > 2}
            capturing={capturingSlotId === slot.id}
            onLabelChange={(v) =>
              setSlots((p) => p.map((s) => (s.id === slot.id ? { ...s, label: v } : s)))
            }
            onUrlDraftChange={(v) =>
              setSlots((p) => p.map((s) => (s.id === slot.id ? { ...s, urlDraft: v } : s)))
            }
            onPickFile={(f) =>
              setSlots((p) => p.map((s) => (s.id === slot.id ? { ...s, file: f } : s)))
            }
            onClearFile={() =>
              setSlots((p) => p.map((s) => (s.id === slot.id ? { ...s, file: null } : s)))
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
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>비교 맥락</Label>
            <Textarea rows={2} value={context} onChange={(e) => setContext(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/15 px-3 py-2 md:col-span-2">
            <div>
              <Label className="text-sm">API 전송 전 로컬 블러</Label>
              <p className="text-xs text-muted-foreground">캡처·업로드 이미지에만 적용(완전 삭제 아님).</p>
            </div>
            <Switch checked={privacyMaskBeforeApi} onCheckedChange={setPrivacyMaskBeforeApi} />
          </div>
          <div className="space-y-2">
            <Label>연령</Label>
            <Input value={personaAge} onChange={(e) => setPersonaAge(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>숙련도</Label>
            <Input value={personaProficiency} onChange={(e) => setPersonaProficiency(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>목적</Label>
            <Textarea rows={2} value={personaGoal} onChange={(e) => setPersonaGoal(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Button type="button" className="gap-2" disabled={loading || filledCount < 2} onClick={analyze}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
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

      {report && !loading && radar && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                비교 요약
              </CardTitle>
              <CardDescription>{report.ux_comparison_context}</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">멀티 레이더 (1~5, 높을수록 우수)</CardTitle>
              <CardDescription>{report.ux_variants.length}개 서비스 오버레이</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radar.rows}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} />
                    {radar.slotKeys.map((sk, i) => (
                      <Radar
                        key={sk}
                        name={radar.labels[i] ?? sk}
                        dataKey={sk}
                        stroke={RADAR_SLOT_COLORS[i % RADAR_SLOT_COLORS.length]}
                        fill={RADAR_SLOT_COLORS[i % RADAR_SLOT_COLORS.length]}
                        fillOpacity={0.22}
                      />
                    ))}
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {report.ux_feature_matrix &&
            report.ux_feature_matrix.ux_rows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Table2 className="h-4 w-4" />
                    기능 매트릭스
                  </CardTitle>
                  <CardDescription>화면별 기능 유무 (모델 추정)</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="bg-muted/30 px-3 py-2 text-left font-medium">기능</th>
                        {report.ux_variants.map((v) => (
                          <th key={v.ux_label} className="px-3 py-2 text-center font-medium">
                            {v.ux_label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.ux_feature_matrix.ux_features.map((feat, fi) => (
                        <tr key={feat} className="border-b border-border/60">
                          <td className="px-3 py-2">{feat}</td>
                          {report.ux_feature_matrix!.ux_rows.map((row) => (
                            <td key={row.ux_label + fi} className="px-3 py-2 text-center tabular-nums">
                              {row.ux_present[fi] ? "✓" : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5" />
              SWOT 비교
            </h2>
            <div className="mb-3 flex flex-wrap gap-1">
              {report.ux_variants.map((v, i) => (
                <Button
                  key={v.ux_label}
                  type="button"
                  size="sm"
                  variant={swotTab === i ? "default" : "outline"}
                  className="h-8"
                  onClick={() => setSwotTab(i)}
                >
                  {v.ux_label}
                </Button>
              ))}
            </div>
            {report.ux_variants[swotTab] && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    {report.ux_variants[swotTab]!.ux_label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <SwotBlock
                    title="Strengths"
                    items={report.ux_variants[swotTab]!.ux_swot.strengths}
                    className="border-emerald-500/20 bg-emerald-500/5"
                  />
                  <SwotBlock
                    title="Weaknesses"
                    items={report.ux_variants[swotTab]!.ux_swot.weaknesses}
                    className="border-rose-500/20 bg-rose-500/5"
                  />
                  <SwotBlock
                    title="Opportunities"
                    items={report.ux_variants[swotTab]!.ux_swot.opportunities}
                    className="border-sky-500/20 bg-sky-500/5"
                  />
                  <SwotBlock
                    title="Threats"
                    items={report.ux_variants[swotTab]!.ux_swot.threats}
                    className="border-amber-500/20 bg-amber-500/5"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  index,
  previewUrl,
  canRemove,
  capturing,
  onLabelChange,
  onUrlDraftChange,
  onPickFile,
  onClearFile,
  onDrop,
  onCapture,
  onRemove,
}: {
  slot: BenchSlot;
  index: number;
  previewUrl: string | null;
  canRemove: boolean;
  capturing: boolean;
  onLabelChange: (v: string) => void;
  onUrlDraftChange: (v: string) => void;
  onPickFile: (f: File) => void;
  onClearFile: () => void;
  onDrop: (e: React.DragEvent) => void;
  onCapture: () => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-h-[280px] flex-col rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
        <Input
          className="h-8 max-w-[200px] flex-1 text-sm"
          value={slot.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="슬롯 이름"
        />
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
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
            <div className="relative mx-auto flex max-h-[220px] w-full max-w-md items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
              <Image
                src={previewUrl}
                alt={slot.label}
                width={640}
                height={480}
                className="h-auto max-h-[200px] w-full object-contain"
                unoptimized
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onClearFile}>
              이미지 제거
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[160px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-muted/30"
          >
            <ImagePlus className="h-9 w-9" />
            클릭 또는 드래그로 이미지
          </button>
        )}
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
              {capturing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
