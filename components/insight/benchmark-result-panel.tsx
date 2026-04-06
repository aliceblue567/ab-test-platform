"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Sparkles,
  Table2,
  Target,
  TrendingUp,
} from "lucide-react";
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

import type { UxBenchmarkMultiV1 } from "@/lib/ux-insight/benchmark-analysis-multi-v1";
import {
  RADAR_SLOT_COLORS,
  toRadarChartRowsMulti,
} from "@/lib/ux-insight/benchmark-analysis-multi-v1";
import {
  BENCHMARK_DATA_PROVENANCE,
  BENCHMARK_DIMENSION_HINTS,
  deriveCompetitorApplyIdeas,
  deriveDimensionGaps,
  deriveImprovementTasks,
  deriveSwotStrategyBlocks,
  enrichFeatureMatrix,
  largestGapKey,
  type DimensionGapRow,
  type EnrichedFeatureRow,
} from "@/lib/ux-insight/benchmark-report-derive";
import {
  BeforeAfterCompareCard,
  CompetitorApplyIdeasSection,
} from "@/components/insight/benchmark-apply-from-competitor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type BenchSlotDisplay = {
  id: string;
  label: string;
  index: number;
  hasImage: boolean;
  serviceCategory: string;
  mainTarget: string;
  strengthsSummary: string;
  comparisonPurpose: string;
  featureHighlights: string[];
  capturedAt: number | null;
  lastUpdatedAt: number | null;
  analysisStatus: "대기" | "준비됨" | "완료";
};

export function fmtBenchSlotDate(ms: number | null): string {
  if (ms == null) return "—";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date(ms))
      .replace(/\s/g, "");
  } catch {
    return "—";
  }
}

export function statusBadgeClassForSlot(status: BenchSlotDisplay["analysisStatus"]) {
  if (status === "완료") return "bg-emerald-600/90 text-white border-emerald-700";
  if (status === "준비됨") return "bg-amber-500/90 text-black border-amber-600";
  return "bg-muted text-muted-foreground border-border";
}

function gapStatusBadgeClass(s: DimensionGapRow["status"]) {
  if (s === "strength") return "bg-emerald-600/85 text-white";
  if (s === "parity") return "bg-amber-500/90 text-black";
  return "bg-red-600/90 text-white";
}

function RadarTooltip(
  props: {
    active?: boolean;
    payload?: readonly { payload?: Record<string, unknown> }[];
    label?: string;
    slotKeys: string[];
    labels: string[];
    selfIdx: number;
  }
) {
  const { active, payload, label, slotKeys, labels, selfIdx } = props;
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Record<string, unknown> | undefined;
  const dimKey = row?.key as string | undefined;
  const hint = dimKey ? BENCHMARK_DIMENSION_HINTS[dimKey] : "";
  const others = slotKeys
    .map((sk, i) => {
      const v = row?.[sk];
      return `${labels[i] ?? sk}: ${typeof v === "number" ? v.toFixed(1) : "—"}`;
    })
    .join(" · ");
  const selfSc = row?.[slotKeys[selfIdx]!];
  const peerVals = slotKeys
    .map((sk, i) => (i === selfIdx ? null : row?.[sk]))
    .filter((x): x is number => typeof x === "number");
  const avgOther =
    peerVals.length > 0
      ? peerVals.reduce((a, b) => a + b, 0) / peerVals.length
      : 0;
  const gap =
    typeof selfSc === "number"
      ? Math.round((selfSc - avgOther) * 10) / 10
      : null;

  return (
    <div className="max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{label}</p>
      {hint && (
        <p className="mt-1 leading-snug text-muted-foreground">{hint}</p>
      )}
      <p className="mt-2 font-mono text-[11px] text-foreground">{others}</p>
      {gap != null && (
        <p
          className={cn(
            "mt-1 font-medium",
            gap >= 0 ? "text-emerald-600" : "text-red-600"
          )}
        >
          자사 vs 타 평균 Gap: {gap >= 0 ? "+" : ""}
          {gap.toFixed(1)}
        </p>
      )}
    </div>
  );
}

export function BenchmarkResultPanel({
  report,
  selfIndex = 0,
}: {
  report: UxBenchmarkMultiV1;
  /** 기본 0 = 첫 슬롯을 자사로 간주 */
  selfIndex?: number;
}) {
  const [selectedDim, setSelectedDim] = useState<string | null>(null);
  const [matrixFilter, setMatrixFilter] = useState({
    onlyMissing: false,
    highImportance: false,
    quickWin: false,
    category: "all" as EnrichedFeatureRow["category"] | "all",
  });

  const radar = useMemo(() => toRadarChartRowsMulti(report), [report]);
  const gaps = useMemo(
    () => deriveDimensionGaps(report, selfIndex),
    [report, selfIndex]
  );
  const worstKey = useMemo(() => largestGapKey(gaps), [gaps]);
  const tasks = useMemo(
    () => deriveImprovementTasks(report, gaps, selfIndex),
    [report, gaps, selfIndex]
  );
  const applyIdeas = useMemo(
    () => deriveCompetitorApplyIdeas(report, gaps, selfIndex),
    [report, gaps, selfIndex]
  );
  const enriched = useMemo(
    () => enrichFeatureMatrix(report, selfIndex),
    [report, selfIndex]
  );
  const selfVariant = report.ux_variants[selfIndex];
  const swotBlocks = selfVariant
    ? deriveSwotStrategyBlocks(selfVariant.ux_swot)
    : [];

  const filteredFeatures = useMemo(() => {
    if (!enriched) return [];
    return enriched.filter((row) => {
      const selfHas = row.present[selfIndex];
      if (matrixFilter.onlyMissing && selfHas) return false;
      if (matrixFilter.highImportance && row.importance !== "높음")
        return false;
      if (
        matrixFilter.quickWin &&
        !(row.difficulty === "하" && row.badges.includes("빠른 적용 가능"))
      )
        return false;
      if (
        matrixFilter.category !== "all" &&
        row.category !== matrixFilter.category
      )
        return false;
      return true;
    });
  }, [enriched, matrixFilter, selfIndex]);

  const focusKey = selectedDim ?? worstKey;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] font-normal">
          {BENCHMARK_DATA_PROVENANCE}
        </Badge>
      </div>

      {/* 2. 핵심 차이 요약 */}
      <Card className="border-emerald-500/15">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-emerald-600" />
            핵심 차이 요약 (자사 vs 경쟁 평균)
          </CardTitle>
          <CardDescription className="text-xs">
            레이더 6축 기준 · 1~5점 · Gap은 자사 − 경쟁사 평균
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {gaps.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() =>
                  setSelectedDim((d) => (d === g.key ? null : g.key))
                }
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  focusKey === g.key
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/80 bg-card hover:bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {g.label}
                  </p>
                  <Badge
                    className={cn("shrink-0 text-[10px]", gapStatusBadgeClass(g.status))}
                  >
                    {g.statusLabel}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>자사</span>
                  <span className="text-right font-mono text-foreground">
                    {g.selfScore.toFixed(1)}
                  </span>
                  <span>경쟁 평균</span>
                  <span className="text-right font-mono text-foreground">
                    {g.competitorAvg.toFixed(1)}
                  </span>
                  <span>Gap</span>
                  <span
                    className={cn(
                      "text-right font-mono font-medium",
                      g.gap >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {g.gap >= 0 ? "+" : ""}
                    {g.gap.toFixed(1)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 비교 요약 (기존) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">비교 요약</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {report.ux_comparison_context}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 3. 레이더 + Gap 테이블 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">레이더 차트 + Gap 분석</CardTitle>
          <CardDescription className="text-xs">
            축 라벨 아래 숫자는 자사 점수입니다. 테이블 행을 눌러 차트 하이라이트와
            연동됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[min(420px,70vw)] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="72%"
                data={radar.rows}
              >
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={(props) => {
                    const { x, y, payload, index, textAnchor } = props;
                    const row = radar.rows[index];
                    const sk = radar.slotKeys[selfIndex];
                    const sc = row?.[sk!];
                    const isFocus = row?.key === focusKey;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          textAnchor={textAnchor as "start" | "middle" | "end"}
                          fill={
                            isFocus
                              ? "hsl(var(--primary))"
                              : "hsl(var(--muted-foreground))"
                          }
                          fontSize={10}
                        >
                          <tspan x={0} dy={0} fontWeight={isFocus ? 700 : 500}>
                            {payload.value}
                          </tspan>
                          <tspan
                            x={0}
                            dy={11}
                            fill="hsl(var(--foreground))"
                            fontSize={9}
                            fontFamily="ui-monospace"
                          >
                            {typeof sc === "number" ? sc.toFixed(1) : "—"}
                          </tspan>
                        </text>
                      </g>
                    );
                  }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} />
                {radar.slotKeys.map((sk, i) => (
                  <Radar
                    key={sk}
                    name={radar.labels[i] ?? sk}
                    dataKey={sk}
                    stroke={
                      i === selfIndex
                        ? "hsl(220 85% 45%)"
                        : RADAR_SLOT_COLORS[i % RADAR_SLOT_COLORS.length]
                    }
                    fill={
                      i === selfIndex
                        ? "hsl(220 85% 45%)"
                        : RADAR_SLOT_COLORS[i % RADAR_SLOT_COLORS.length]
                    }
                    fillOpacity={i === selfIndex ? 0.28 : 0.12}
                    strokeWidth={i === selfIndex ? 2.5 : 1.2}
                  />
                ))}
                <Tooltip
                  content={(tipProps) => (
                    <RadarTooltip
                      active={tipProps.active}
                      payload={tipProps.payload as readonly { payload?: Record<string, unknown> }[] | undefined}
                      label={String(tipProps.label ?? "")}
                      slotKeys={radar.slotKeys}
                      labels={radar.labels}
                      selfIdx={selfIndex}
                    />
                  )}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Gap Analysis
            </h4>
            <div className="overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs">
                    <th className="px-3 py-2 font-medium">항목</th>
                    <th className="px-3 py-2 font-medium">자사</th>
                    <th className="px-3 py-2 font-medium">경쟁 평균</th>
                    <th className="px-3 py-2 font-medium">Gap</th>
                    <th className="px-3 py-2 font-medium">해석</th>
                    <th className="px-3 py-2 font-medium">개선 우선순위</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g) => (
                    <tr
                      key={g.key}
                      className={cn(
                        "border-b border-border/60 transition-colors",
                        g.key === worstKey && "bg-red-500/[0.06]",
                        focusKey === g.key && "bg-primary/5"
                      )}
                    >
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto justify-start px-1 py-0 text-left font-medium"
                          onClick={() =>
                            setSelectedDim((d) =>
                              d === g.key ? null : g.key
                            )
                          }
                        >
                          {g.label}
                          {g.key === worstKey && (
                            <Badge className="ml-2 bg-red-600 text-[9px] text-white">
                              최대 Gap
                            </Badge>
                          )}
                        </Button>
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums">
                        {g.selfScore.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums">
                        {g.competitorAvg.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums">
                        <span
                          className={
                            g.gap >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }
                        >
                          {g.gap >= 0 ? "+" : ""}
                          {g.gap.toFixed(1)}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-3 py-2 text-xs text-muted-foreground">
                        {g.interpretation}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            g.priorityLevel === "높음" &&
                              "border-red-500/60 text-red-700",
                            g.priorityLevel === "중간" &&
                              "border-amber-500/60 text-amber-800"
                          )}
                        >
                          {g.priorityLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {focusKey && (
            <div
              className="rounded-lg border border-border/80 bg-muted/20 p-3 text-sm"
              id={`bench-insight-${focusKey}`}
            >
              <p className="font-semibold text-foreground">
                선택 축:{" "}
                {gaps.find((x) => x.key === focusKey)?.label ?? focusKey}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {BENCHMARK_DIMENSION_HINTS[focusKey] ??
                  "차트·표에서 다른 항목을 선택해 비교해 보세요."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. 기능 매트릭스 */}
      {enriched && enriched.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="h-4 w-4" />
              기능 매트릭스 (확장)
            </CardTitle>
            <CardDescription className="text-xs">
              유무 외 중요도·영향은 모델+규칙 기반 추정입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="flex items-center gap-2">
                <Switch
                  id="mf-miss"
                  checked={matrixFilter.onlyMissing}
                  onCheckedChange={(v) =>
                    setMatrixFilter((f) => ({ ...f, onlyMissing: v }))
                  }
                />
                <Label htmlFor="mf-miss" className="text-xs">
                  자사에 없는 기능만
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="mf-imp"
                  checked={matrixFilter.highImportance}
                  onCheckedChange={(v) =>
                    setMatrixFilter((f) => ({ ...f, highImportance: v }))
                  }
                />
                <Label htmlFor="mf-imp" className="text-xs">
                  중요도 높음만
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="mf-quick"
                  checked={matrixFilter.quickWin}
                  onCheckedChange={(v) =>
                    setMatrixFilter((f) => ({ ...f, quickWin: v }))
                  }
                />
                <Label htmlFor="mf-quick" className="text-xs">
                  빠른 적용 가능만
                </Label>
              </div>
              <div className="w-full min-w-[160px] max-w-xs">
                <Label className="text-[10px] text-muted-foreground">
                  카테고리
                </Label>
                <Select
                  value={matrixFilter.category}
                  onValueChange={(v) =>
                    setMatrixFilter((f) => ({
                      ...f,
                      category: v as typeof matrixFilter.category,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="개인화">개인화</SelectItem>
                    <SelectItem value="탐색">탐색</SelectItem>
                    <SelectItem value="신뢰">신뢰</SelectItem>
                    <SelectItem value="전환">전환</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs">
                    <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2 font-medium shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                      기능
                    </th>
                    {report.ux_variants.map((v) => (
                      <th key={v.ux_label} className="px-2 py-2 text-center font-medium">
                        {v.ux_label}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium">중요도</th>
                    <th className="px-2 py-2 font-medium">사용자 영향</th>
                    <th className="px-2 py-2 font-medium">경쟁 우위</th>
                    <th className="px-2 py-2 font-medium">도입 필요</th>
                    <th className="px-2 py-2 font-medium">난이도</th>
                    <th className="px-2 py-2 font-medium">예상 효과</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeatures.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-border/60 align-top"
                    >
                      <td className="sticky left-0 z-[1] bg-card px-3 py-2 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                        <p className="font-medium text-foreground">{row.feature}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[9px]">
                            {row.category}
                          </Badge>
                          {row.badges.map((b) => (
                            <Badge
                              key={b}
                              variant="secondary"
                              className="text-[9px] font-normal"
                            >
                              {b}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      {row.present.map((has, vi) => (
                        <td
                          key={vi}
                          className="px-2 py-2 text-center tabular-nums"
                        >
                          {has ? (
                            <span className="text-emerald-600">O</span>
                          ) : (
                            <span className="text-red-500">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-xs">{row.importance}</td>
                      <td className="px-2 py-2 text-xs">{row.userImpact}</td>
                      <td className="px-2 py-2 text-xs">
                        {row.hasCompetitiveEdge ? (
                          <span className="text-emerald-600">있음</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs">{row.adoptionNeed}</td>
                      <td className="px-2 py-2 text-xs">{row.difficulty}</td>
                      <td className="max-w-[200px] px-2 py-2 text-xs text-muted-foreground">
                        <details className="group">
                          <summary className="cursor-pointer list-none text-foreground underline-offset-2 hover:underline">
                            <span className="line-clamp-2 group-open:line-clamp-none">
                              {row.expectedEffect}
                            </span>
                          </summary>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredFeatures.length === 0 && (
              <p className="text-sm text-muted-foreground">
                조건에 맞는 기능이 없습니다. 필터를 완화해 보세요.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <CompetitorApplyIdeasSection ideas={applyIdeas} />

      {/* 5. 자사 우선 개선 과제 */}
      <Card className="border-orange-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-orange-900 dark:text-orange-100">
            <TrendingUp className="h-4 w-4" />
            자사 우선 개선 과제
          </CardTitle>
          <CardDescription className="text-xs">
            Gap·기능 격차를 바탕으로 한 액션 후보 (우선순위는 휴리스틱)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.map((t) => (
            <div
              key={t.rank}
              className="rounded-lg border border-border/80 bg-muted/15 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-orange-600 text-white">{t.rank}순위</Badge>
                <span className="font-semibold text-foreground">
                  {t.title}
                </span>
                {t.dimensionKey && (
                  <Badge variant="outline" className="text-[10px]">
                    {gaps.find((g) => g.key === t.dimensionKey)?.label ??
                      t.dimensionKey}
                  </Badge>
                )}
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground/85">원인:</span>{" "}
                  {t.cause}
                </li>
                <li>
                  <span className="font-medium text-foreground/85">기대:</span>{" "}
                  {t.effect}
                </li>
                <li>
                  <span className="font-medium text-foreground/85">난이도:</span>{" "}
                  {t.difficulty}
                </li>
                <li>
                  <span className="font-medium text-foreground/85">범위:</span>{" "}
                  {t.scope}
                </li>
                <li>
                  <span className="font-medium text-foreground/85">관련 기능:</span>{" "}
                  {t.relatedFeatures}
                </li>
                <li>
                  <span className="font-medium text-foreground/85">
                    예상 KPI:
                  </span>{" "}
                  {t.kpiHint}
                </li>
              </ul>
              {t.dimensionKey &&
                (() => {
                  const m = applyIdeas.find((a) => a.gapKey === t.dimensionKey);
                  if (!m) return null;
                  return (
                    <details className="mt-2 rounded-md border border-border/60 bg-muted/10">
                      <summary className="cursor-pointer px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40">
                        이 과제의 개선 전·후(UI 관점) 보기
                      </summary>
                      <div className="border-t border-border/60 p-2">
                        <BeforeAfterCompareCard
                          ideaTitle={t.title}
                          priority={m.priority}
                          relatedScreen={m.relatedScreen}
                          kpis={m.relatedKpis}
                          beforeAfter={m.beforeAfter}
                          difficulty={m.difficulty}
                          estimatedResource={m.estimatedResource}
                          quickWin={m.quickWin}
                          highKpiImpact={m.highKpiImpact}
                          devRisk={m.devRisk}
                        />
                      </div>
                    </details>
                  );
                })()}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 6. SWOT + 전략 */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5" />
          SWOT · 전략 액션
        </h2>
        <p className="text-xs text-muted-foreground">
          자사 슬롯({selfVariant?.ux_label ?? "기준"}) SWOT — 아래는 각 사분면을
          실행 문장으로 재구성한 초안입니다.
        </p>
        {selfVariant && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  {selfVariant.ux_label}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <StrategySwot title="Strengths" items={selfVariant.ux_swot.strengths} tone="emerald" />
                <StrategySwot title="Weaknesses" items={selfVariant.ux_swot.weaknesses} tone="rose" />
                <StrategySwot title="Opportunities" items={selfVariant.ux_swot.opportunities} tone="sky" />
                <StrategySwot title="Threats" items={selfVariant.ux_swot.threats} tone="amber" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">전략 액션 추천</CardTitle>
                <CardDescription className="text-xs">
                  SWOT 항목을 실행 지향으로 재배치 (편집·티켓화 권장)
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {swotBlocks.map((b) => (
                  <div
                    key={b.title}
                    className={cn("rounded-lg border p-3", b.toneClass)}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {b.title}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm leading-snug">
                      {b.items.length === 0 ? (
                        <li className="text-muted-foreground">—</li>
                      ) : (
                        b.items.map((x, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                            <span>{x.replace(/^·\s*/, "")}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StrategySwot({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "emerald" | "rose" | "sky" | "amber";
}) {
  const ring =
    tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "rose"
        ? "border-rose-500/20 bg-rose-500/5"
        : tone === "sky"
          ? "border-sky-500/20 bg-sky-500/5"
          : "border-amber-500/20 bg-amber-500/5";
  return (
    <div className={cn("rounded-lg border p-3", ring)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm leading-snug">
        {items.length === 0 ? (
          <li className="text-muted-foreground">—</li>
        ) : (
          items.map((x, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
              <span>{x}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
