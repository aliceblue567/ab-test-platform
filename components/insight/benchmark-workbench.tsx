"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Building2,
  ImagePlus,
  Loader2,
  Scale,
  Sparkles,
  Target,
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

import type { UxBenchmarkAnalysisV1 } from "@/lib/ux-insight/benchmark-analysis-v1";
import { toRadarChartRows } from "@/lib/ux-insight/benchmark-analysis-v1";
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
import { cn } from "@/lib/utils";

function DropSlot({
  label,
  sub,
  previewUrl,
  onPick,
  onClear,
}: {
  label: string;
  sub: string;
  previewUrl: string | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex min-h-[220px] flex-1 flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="relative flex flex-1 flex-col p-2">
        {previewUrl ? (
          <>
            <div className="relative mx-auto flex max-h-[280px] w-full max-w-md items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
              <Image
                src={previewUrl}
                alt={label}
                width={640}
                height={480}
                className="h-auto max-h-[260px] w-full object-contain"
                unoptimized
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onClear}
            >
              이미지 바꾸기
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={onPick}
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-muted/30"
          >
            <ImagePlus className="h-10 w-10" />
            클릭하여 업로드
          </button>
        )}
      </div>
    </div>
  );
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
  const [oursFile, setOursFile] = useState<File | null>(null);
  const [compFile, setCompFile] = useState<File | null>(null);
  const [oursUrl, setOursUrl] = useState<string | null>(null);
  const [compUrl, setCompUrl] = useState<string | null>(null);
  const [context, setContext] = useState(
    "동일 과업(예: 항공 검색 결과) 화면 비교"
  );
  const [personaAge, setPersonaAge] = useState("30대");
  const [personaProficiency, setPersonaProficiency] = useState("중급");
  const [personaGoal, setPersonaGoal] = useState(
    "최저가 일정을 빠르게 고른다"
  );
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<UxBenchmarkAnalysisV1 | null>(null);
  const oursRef = useRef<HTMLInputElement>(null);
  const compRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!oursFile) {
      setOursUrl(null);
      return;
    }
    const u = URL.createObjectURL(oursFile);
    setOursUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [oursFile]);

  useEffect(() => {
    if (!compFile) {
      setCompUrl(null);
      return;
    }
    const u = URL.createObjectURL(compFile);
    setCompUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [compFile]);

  const analyze = async () => {
    if (!oursFile || !compFile) {
      toast.error("자사·타사 이미지를 각각 업로드해 주세요.");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const fd = new FormData();
      fd.append("image_ours", oursFile);
      fd.append("image_competitor", compFile);
      fd.append("comparison_context", context);
      fd.append("persona_age", personaAge);
      fd.append("persona_proficiency", personaProficiency);
      fd.append("persona_goal", personaGoal);

      const res = await fetch("/api/ux-insight/analyze-benchmark", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "분석 실패");
        return;
      }
      setReport(data as UxBenchmarkAnalysisV1);
      toast.success("벤치마크 분석이 완료되었습니다.");
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  const radarRows = report ? toRadarChartRows(report) : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">벤치마킹</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          자사와 타사 화면을 같은 기준으로 점수화하고, 레이더 차트와 SWOT으로
          요약합니다.
        </p>
      </div>

      <input
        ref={oursRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f?.type.startsWith("image/")) setOursFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={compRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f?.type.startsWith("image/")) setCompFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <DropSlot
          label="자사 (Our)"
          sub="왼쪽 비교 기준"
          previewUrl={oursUrl}
          onPick={() => oursRef.current?.click()}
          onClear={() => setOursFile(null)}
        />
        <DropSlot
          label="타사 (Competitor)"
          sub="오른쪽 비교 대상"
          previewUrl={compUrl}
          onPick={() => compRef.current?.click()}
          onClear={() => setCompFile(null)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">비교 맥락 · 페르소나</CardTitle>
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
          <div className="space-y-2">
            <Label>연령</Label>
            <Input value={personaAge} onChange={(e) => setPersonaAge(e.target.value)} />
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
              disabled={loading || !oursFile || !compFile}
              onClick={analyze}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
              동일 기준 벤치마크 분석
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
              <CardTitle className="text-base">6축 점수 (1~5, 높을수록 우수)</CardTitle>
              <CardDescription>동일 페르소나·동일 과업 기준</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[380px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarRows}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} />
                    <Radar
                      name="자사"
                      dataKey="자사"
                      stroke="hsl(217 91% 60%)"
                      fill="hsl(217 91% 60%)"
                      fillOpacity={0.35}
                    />
                    <Radar
                      name="타사"
                      dataKey="타사"
                      stroke="hsl(142 71% 45%)"
                      fill="hsl(142 71% 45%)"
                      fillOpacity={0.3}
                    />
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

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5" />
              SWOT 요약
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-blue-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    자사 SWOT
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <SwotBlock
                    title="Strengths"
                    items={report.ux_swot.ux_ours.strengths}
                    className="border-emerald-500/20 bg-emerald-500/5"
                  />
                  <SwotBlock
                    title="Weaknesses"
                    items={report.ux_swot.ux_ours.weaknesses}
                    className="border-rose-500/20 bg-rose-500/5"
                  />
                  <SwotBlock
                    title="Opportunities"
                    items={report.ux_swot.ux_ours.opportunities}
                    className="border-sky-500/20 bg-sky-500/5"
                  />
                  <SwotBlock
                    title="Threats"
                    items={report.ux_swot.ux_ours.threats}
                    className="border-amber-500/20 bg-amber-500/5"
                  />
                </CardContent>
              </Card>

              <Card className="border-emerald-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-emerald-400" />
                    타사 SWOT
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <SwotBlock
                    title="Strengths"
                    items={report.ux_swot.ux_competitor.strengths}
                    className="border-emerald-500/20 bg-emerald-500/5"
                  />
                  <SwotBlock
                    title="Weaknesses"
                    items={report.ux_swot.ux_competitor.weaknesses}
                    className="border-rose-500/20 bg-rose-500/5"
                  />
                  <SwotBlock
                    title="Opportunities"
                    items={report.ux_swot.ux_competitor.opportunities}
                    className="border-sky-500/20 bg-sky-500/5"
                  />
                  <SwotBlock
                    title="Threats"
                    items={report.ux_swot.ux_competitor.threats}
                    className="border-amber-500/20 bg-amber-500/5"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
