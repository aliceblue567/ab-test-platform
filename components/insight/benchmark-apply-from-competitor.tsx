"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Copy, Lightbulb } from "lucide-react";
import { toast } from "sonner";

import {
  BENCHMARK_DATA_PROVENANCE,
  type CompetitorApplyBeforeAfter,
  type CompetitorApplyIdea,
  type IdeaPriorityBand,
} from "@/lib/ux-insight/benchmark-report-derive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const PRIORITY_STYLE: Record<
  IdeaPriorityBand,
  { className: string; label: string }
> = {
  Critical: {
    className: "bg-red-600 text-white border-red-700",
    label: "Critical",
  },
  High: {
    className: "bg-orange-600 text-white border-orange-700",
    label: "High",
  },
  Medium: {
    className: "bg-amber-500/90 text-black border-amber-600",
    label: "Medium",
  },
  Low: {
    className: "bg-muted text-muted-foreground border-border",
    label: "Low",
  },
};

export function BeforeAfterCompareCard({
  ideaTitle,
  priority,
  relatedScreen,
  kpis,
  beforeAfter,
  difficulty,
  estimatedResource,
  quickWin,
  highKpiImpact,
  devRisk,
}: {
  ideaTitle: string;
  priority: IdeaPriorityBand;
  relatedScreen: string;
  kpis: string[];
  beforeAfter: CompetitorApplyBeforeAfter;
  difficulty: "상" | "중" | "하";
  estimatedResource: string;
  quickWin: boolean;
  highKpiImpact: boolean;
  devRisk: boolean;
}) {
  const ps = PRIORITY_STYLE[priority];

  return (
    <div className="mt-4 rounded-xl border border-border/80 bg-muted/[0.08] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          개선 전 / 개선 후 비교
        </span>
        {quickWin && (
          <Badge className="bg-emerald-600 text-[10px] text-white">
            빠른 적용 가능
          </Badge>
        )}
        {highKpiImpact && (
          <Badge className="bg-orange-500 text-[10px] text-black">
            효과 큼
          </Badge>
        )}
        {devRisk && (
          <Badge variant="outline" className="border-red-500/70 text-[10px] text-red-700">
            개발 리스크 있음
          </Badge>
        )}
      </div>
      <p className="mb-3 text-[11px] font-medium text-primary" title={beforeAfter.whyImportant}>
        왜 중요한가: {beforeAfter.whyImportant}
      </p>
      <div className="mb-3 grid gap-2 md:grid-cols-2">
        <div
          className="rounded-lg border border-red-500/25 bg-red-500/[0.04] p-3 transition-colors hover:bg-red-500/[0.07]"
          title="현재(개선 전) 화면에서의 UX 상태입니다."
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
            Before
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">
            {beforeAfter.beforeSummary}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            하이라이트: 사용자가 느끼는 마찰·누락 정보
          </p>
        </div>
        <div
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3 transition-colors hover:bg-emerald-500/[0.09]"
          title="권장 개선 방향(개선 후)입니다."
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            After
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">
            {beforeAfter.afterSummary}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            하이라이트: 달라지는 UI·정보 노출
          </p>
        </div>
      </div>
      <div className="space-y-2 rounded-lg border border-border/60 bg-card/50 p-2.5 text-[11px]">
        <div>
          <span className="font-semibold text-foreground">변화 포인트</span>
          <ul className="mt-1 list-inside list-disc text-muted-foreground">
            {beforeAfter.changePoints.map((c, j) => (
              <li key={j}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border/50 pt-2 text-muted-foreground">
          <span>
            <span className="text-foreground/90">과제:</span> {ideaTitle}
          </span>
          <span className={cn("rounded px-1", ps.className)}>{ps.label}</span>
          <span>
            <span className="text-foreground/90">화면:</span> {relatedScreen}
          </span>
        </div>
        <div>
          <span className="font-semibold text-foreground">관련 KPI</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {kpis.map((k) => (
              <Badge key={k} variant="secondary" className="text-[10px] font-normal">
                {k}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <span>
            <span className="text-foreground/90">구현 난이도:</span> {difficulty}
          </span>
          <span>
            <span className="text-foreground/90">예상 개발 기간:</span>{" "}
            {estimatedResource}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          실제 스크린샷 Diff·변경 영역 오버레이는 추후 슬롯 캡처와 연동해
          추가할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

export function CompetitorApplyIdeasSection({
  ideas,
}: {
  ideas: CompetitorApplyIdea[];
}) {
  const [filters, setFilters] = useState({
    highOnly: false,
    quickOnly: false,
    exploreOnly: false,
    personalizeOnly: false,
    kpiHighOnly: false,
  });

  const filtered = useMemo(() => {
    return ideas.filter((i) => {
      if (filters.highOnly && i.priority !== "High" && i.priority !== "Critical") {
        return false;
      }
      if (filters.quickOnly && !i.quickWin) return false;
      if (
        filters.exploreOnly &&
        !i.tags.some((t) =>
          ["탐색", "필터", "정보 구조"].includes(t)
        )
      ) {
        return false;
      }
      if (
        filters.personalizeOnly &&
        !i.tags.some((t) => ["개인화", "추천"].includes(t))
      ) {
        return false;
      }
      if (filters.kpiHighOnly && !i.highKpiImpact) return false;
      return true;
    });
  }, [ideas, filters]);

  const copyCard = async (idea: CompetitorApplyIdea) => {
    const text = [
      `[${idea.priority}] ${idea.relatedScreen}`,
      `타사 강점: ${idea.competitorStrength}`,
      `자사: ${idea.ourCurrentState}`,
      `문제: ${idea.problem}`,
      `적용: ${idea.applicationIdea}`,
      `Before: ${idea.beforeAfter.beforeSummary}`,
      `After: ${idea.beforeAfter.afterSummary}`,
      `KPI: ${idea.relatedKpis.join(", ")}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("카드 요약을 복사했습니다.");
    } catch {
      toast.error("복사 실패");
    }
  };

  if (ideas.length === 0) {
    return null;
  }

  return (
    <Card className="border-sky-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-sky-600" />
          타사 강점 → 자사 적용 아이디어
        </CardTitle>
        <CardDescription className="text-xs">
          Gap이 큰 축부터 자동 정렬 · 레이더/Gap 표와 연결 ·{" "}
          {BENCHMARK_DATA_PROVENANCE}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex items-center gap-2">
            <Switch
              id="ap-high"
              checked={filters.highOnly}
              onCheckedChange={(v) =>
                setFilters((f) => ({ ...f, highOnly: v }))
              }
            />
            <Label htmlFor="ap-high" className="text-xs">
              High·Critical만
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="ap-quick"
              checked={filters.quickOnly}
              onCheckedChange={(v) =>
                setFilters((f) => ({ ...f, quickOnly: v }))
              }
            />
            <Label htmlFor="ap-quick" className="text-xs">
              빠르게 적용 가능만
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="ap-exp"
              checked={filters.exploreOnly}
              onCheckedChange={(v) =>
                setFilters((f) => ({ ...f, exploreOnly: v }))
              }
            />
            <Label htmlFor="ap-exp" className="text-xs">
              탐색·필터·정보구조 관련
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="ap-pers"
              checked={filters.personalizeOnly}
              onCheckedChange={(v) =>
                setFilters((f) => ({ ...f, personalizeOnly: v }))
              }
            />
            <Label htmlFor="ap-pers" className="text-xs">
              개인화·추천 관련
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="ap-kpi"
              checked={filters.kpiHighOnly}
              onCheckedChange={(v) =>
                setFilters((f) => ({ ...f, kpiHighOnly: v }))
              }
            />
            <Label htmlFor="ap-kpi" className="text-xs">
              KPI 영향 큼만
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              조건에 맞는 카드가 없습니다. 필터를 완화해 보세요.
            </p>
          )}
          {filtered.map((idea) => {
            const ps = PRIORITY_STYLE[idea.priority];
            return (
              <div
                key={idea.id}
                className="rounded-xl border border-border/80 bg-card p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={cn("text-[10px]", ps.className)}>
                      {ps.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Gap #{idea.gapRank}
                    </Badge>
                    {idea.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[10px]"
                    onClick={() => void copyCard(idea)}
                  >
                    <Copy className="h-3 w-3" />
                    요약 복사
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    화면: {idea.relatedScreen}
                  </Badge>
                  {idea.relatedKpis.slice(0, 4).map((k) => (
                    <Badge key={k} variant="outline" className="text-[10px]">
                      KPI: {k}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      타사 강점
                    </p>
                    <p className="mt-1 text-sm leading-snug text-foreground">
                      {idea.competitorStrength}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      자사 현재 상태
                    </p>
                    <p className="mt-1 text-sm leading-snug text-foreground">
                      {idea.ourCurrentState}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      문제점
                    </p>
                    <p className="mt-1 text-sm leading-snug text-foreground">
                      {idea.problem}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                  <p className="text-[10px] font-semibold uppercase text-emerald-800 dark:text-emerald-200">
                    적용 아이디어
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug text-foreground">
                    {idea.applicationIdea}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
                    예상 효과
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {idea.expectedEffects.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">구현 난이도</span>{" "}
                      {idea.difficulty}
                    </span>
                    <span>
                      <span className="font-medium text-foreground">
                        예상 개발 리소스
                      </span>{" "}
                      {idea.estimatedResource}
                    </span>
                  </div>
                </div>

                <BeforeAfterCompareCard
                  ideaTitle={`${idea.competitorLabelSample} 대비 · ${idea.dimensionLabel}`}
                  priority={idea.priority}
                  relatedScreen={idea.relatedScreen}
                  kpis={idea.relatedKpis}
                  beforeAfter={idea.beforeAfter}
                  difficulty={idea.difficulty}
                  estimatedResource={idea.estimatedResource}
                  quickWin={idea.quickWin}
                  highKpiImpact={idea.highKpiImpact}
                  devRisk={idea.devRisk}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
