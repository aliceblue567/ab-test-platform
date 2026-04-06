"use client";

import { useState } from "react";
import { ChevronDown, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";

import type { UxFlowAnalysisV1 } from "@/lib/ux-insight/flow-analysis-v1";
import { buildFigmaCalloutComment } from "@/lib/ux-insight/figma-guide-copy";
import {
  friction5ToDisplay10,
  friction5ToTier,
  tierBorderClass,
} from "@/lib/ux-insight/flow-friction-visual";
import type { PriorityLevel } from "@/lib/ux-insight/flow-report-derive";
import { priorityLabelKo } from "@/lib/ux-insight/flow-report-derive";
import { humanizeTheoryIdsInText } from "@/lib/ux-insight/ux-theories-lookup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PRIORITY_BADGE: Record<
  PriorityLevel,
  string
> = {
  critical: "bg-red-600 text-white border-red-700",
  high: "bg-orange-600 text-white border-orange-700",
  medium: "bg-amber-500/90 text-black border-amber-600",
  low: "bg-muted text-muted-foreground border-border",
};

export function FlowTransitionUnifiedCard({
  flow,
  transition,
  index,
  priority,
  problemTag,
  headlines,
  problemSummary,
  cause,
  userImpact,
  improvement,
  expectedEffect,
  bullets,
  theoryChips,
  isEditing,
  editBuffer,
  onEditChange,
  onSaveEdit,
  onStartEdit,
  onCancelEdit,
  isFocused,
  onSelect,
  cardRef,
  onStopPropagation,
  dataProvenance,
}: {
  flow: UxFlowAnalysisV1;
  transition: UxFlowAnalysisV1["ux_transitions"][0];
  index: number;
  priority: PriorityLevel;
  problemTag: string;
  headlines: { ux_theory_id: string; ux_theory_label_ko: string }[];
  problemSummary: string;
  cause: string;
  userImpact: string;
  improvement: string;
  expectedEffect: string;
  bullets: string[];
  theoryChips: React.ReactNode;
  isEditing: boolean;
  editBuffer: string;
  onEditChange: (v: string) => void;
  onSaveEdit: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  isFocused: boolean;
  onSelect: () => void;
  cardRef: (el: HTMLDivElement | null) => void;
  onStopPropagation: (e: React.MouseEvent) => void;
  dataProvenance: string;
}) {
  const [openDetail, setOpenDetail] = useState(false);
  const t = transition;
  const d = t.ux_psychological_dimensions;
  const tier = friction5ToTier(t.ux_friction_score);
  const d10 = friction5ToDisplay10(t.ux_friction_score);
  const stepLabel = `${t.ux_from_step + 1}→${t.ux_to_step + 1}단계`;

  const jiraBody = [
    `요약: ${problemSummary}`,
    `원인: ${cause}`,
    `개선: ${improvement}`,
    `기대효과: ${expectedEffect}`,
  ].join("\n");

  return (
    <div
      ref={cardRef}
      className={cn(
        "rounded-xl transition-shadow",
        isFocused && "ring-2 ring-primary/45 shadow-md"
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <Card className={cn("border-l-4 py-0 shadow-none", tierBorderClass(tier))}>
        <CardHeader className="space-y-2 px-3 pb-2 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
              {stepLabel}
            </Badge>
            <Badge
              className={cn("h-5 border px-1.5 text-[10px]", PRIORITY_BADGE[priority])}
            >
              {priorityLabelKo(priority)}
            </Badge>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {problemTag}
            </Badge>
            <Badge variant="outline" className="h-5 px-1.5 text-[9px] text-muted-foreground">
              {dataProvenance}
            </Badge>
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
              체감 {d10}/10
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b border-emerald-500/20 pb-2">
            <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
              개선 액션
            </span>
            <CardTitle className="text-sm font-semibold leading-snug text-emerald-900 dark:text-emerald-100">
              {humanizeTheoryIdsInText(improvement)}
            </CardTitle>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              문제 요약
            </p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">
              {humanizeTheoryIdsInText(problemSummary)}
            </p>
            {!openDetail && headlines.length > 0 && (
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {headlines.map((h) => h.ux_theory_label_ko).join(" · ")}
              </p>
            )}
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1 text-left text-[11px] font-medium text-foreground hover:bg-muted/60"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDetail((o) => !o);
            }}
          >
            <span>{openDetail ? "상세 접기" : "원인·영향·지표 펼치기"}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform",
                openDetail && "rotate-180"
              )}
            />
          </button>

          {openDetail && (
            <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-2 text-[11px] leading-relaxed">
              <div>
                <p className="font-semibold text-foreground">발생 원인</p>
                <p className="mt-0.5 text-muted-foreground">
                  {humanizeTheoryIdsInText(cause)}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">사용자 영향</p>
                <p className="mt-0.5 text-muted-foreground">
                  {userImpact}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">심각도·심리 지표</p>
                <p className="mt-0.5 tabular-nums text-muted-foreground">
                  마찰 원점 {t.ux_friction_score}/5 · 기대괴리 {d.ux_expectation_gap}{" "}
                  · 인지 {d.ux_cognitive_spike} · 정서 {d.ux_emotional_friction}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">관련 단계</p>
                <p className="mt-0.5 text-muted-foreground">{stepLabel}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">기대 효과</p>
                <p className="mt-0.5 text-muted-foreground">
                  {humanizeTheoryIdsInText(expectedEffect)}
                </p>
              </div>
              {bullets.length > 0 && (
                <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                  {bullets.map((b, bi) => (
                    <li key={bi}>{humanizeTheoryIdsInText(b)}</li>
                  ))}
                </ul>
              )}
              {theoryChips}
            </div>
          )}

          <div className="flex flex-wrap gap-1 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[10px]"
              onClick={(e) => {
                onStopPropagation(e);
                if (isEditing) onCancelEdit();
                else onStartEdit();
              }}
            >
              <Pencil className="h-3 w-3" />
              {isEditing ? "닫기" : "편집"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 gap-1 text-[10px]"
              onClick={(e) => {
                onStopPropagation(e);
                void (async () => {
                  const text = buildFigmaCalloutComment({
                    ux_position_pct: `전환 ${stepLabel}`,
                    ux_issue_summary: problemSummary,
                    ux_improvement_guide: [improvement, ...bullets]
                      .filter(Boolean)
                      .join("\n"),
                  });
                  try {
                    await navigator.clipboard.writeText(text);
                    toast.success("피그마 코멘트 복사됨");
                  } catch {
                    toast.error("복사 실패");
                  }
                })();
              }}
            >
              <Copy className="h-3 w-3" />
              Figma
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-[10px]"
              onClick={(e) => {
                onStopPropagation(e);
                void (async () => {
                  const text = `[UX] ${flow.ux_flow_title}\n${jiraBody}`;
                  try {
                    await navigator.clipboard.writeText(text);
                    toast.success("Jira 붙여넣기용 초안 복사");
                  } catch {
                    toast.error("복사 실패");
                  }
                })();
              }}
            >
              Jira 초안
            </Button>
          </div>

          {isEditing && (
            <div className="space-y-2" onClick={onStopPropagation}>
                    <Textarea
                      rows={4}
                      value={editBuffer}
                      onChange={(e) => onEditChange(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={onSaveEdit}>
                        저장
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
                        취소
                      </Button>
                    </div>
                  </div>
          )}
        </CardHeader>
        {!isEditing && (
          <CardContent className="px-3 pb-3 pt-0" onClick={onStopPropagation}>
            <p className="text-[10px] text-muted-foreground">
              Before/After 비교는 추후 버전에서 스크린 페어 뷰로 제공 예정입니다.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
