"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { DerivedStepJourney } from "@/lib/ux-insight/flow-report-derive";
import { connectorStrokeForFriction } from "@/lib/ux-insight/flow-report-derive";
import type { UxFlowAnalysisV1 } from "@/lib/ux-insight/flow-analysis-v1";

type Props = {
  journey: DerivedStepJourney[];
  previewUrls: string[];
  flow: UxFlowAnalysisV1;
  className?: string;
};

export function FlowStepJourneyEnhanced({
  journey,
  previewUrls,
  flow,
  className,
}: Props) {
  /** 썸네일 개수와 무관하게 단계 카드는 항상 표시 (URL 없으면 플레이스홀더) */
  const n = journey.length;

  return (
    <div
      className={cn(
        "overflow-x-auto pb-2 [scrollbar-width:thin]",
        className
      )}
    >
      <div className="flex min-w-max items-stretch gap-0 px-1">
        {journey.slice(0, n).map((step, i) => {
          const url = previewUrls[i] ?? null;
          const nextStep = journey[i + 1];
          const outTr = nextStep
            ? flow.ux_transitions.find(
                (t) =>
                  t.ux_from_step === step.stepIndex &&
                  t.ux_to_step === nextStep.stepIndex
              )
            : undefined;
          const friction = outTr?.ux_friction_score ?? 1;
          const stroke = connectorStrokeForFriction(friction);

          const statusRing =
            step.status === "problem"
              ? "ring-2 ring-red-500/70 bg-red-500/5"
              : step.status === "watch"
                ? "ring-2 ring-amber-500/60 bg-amber-500/5"
                : "ring-1 ring-emerald-500/40 bg-emerald-500/[0.03]";

          return (
            <div key={step.stepIndex} className="flex items-stretch">
              <div
                className={cn(
                  "flex w-[200px] shrink-0 flex-col rounded-lg border border-border/60 p-2.5 shadow-sm transition-shadow",
                  statusRing
                )}
                title={step.hoverDetail}
              >
                <div className="mb-2 text-[10px] font-mono text-muted-foreground">
                  {step.stepIndex + 1}단계
                </div>
                <div className="relative mb-2 h-14 w-full overflow-hidden rounded-md bg-muted/50">
                  {url ? (
                    <Image
                      src={url}
                      alt=""
                      width={200}
                      height={80}
                      className="h-full w-full object-cover object-top"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-1 text-center text-[9px] leading-tight text-muted-foreground">
                      썸네일 없음
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
                  {step.label}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {step.keyAction}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      step.status === "problem"
                        ? "bg-red-500/20 text-red-700 dark:text-red-300"
                        : step.status === "watch"
                          ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                          : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                    )}
                  >
                    {step.statusLabelKo}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    이탈 위험 {step.churnLabelKo}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  문제 발생률 추정: {step.problemRateLabel}
                </p>
                <details className="mt-2 border-t border-border/40 pt-1">
                  <summary className="cursor-pointer text-[10px] font-medium text-primary underline-offset-2 hover:underline">
                    단계 상세 설명
                  </summary>
                  <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-[10px] leading-snug text-muted-foreground">
                    {step.hoverDetail}
                  </pre>
                </details>
              </div>
              {i < n - 1 && (
                <div className="flex w-10 shrink-0 flex-col items-center justify-center self-center px-0.5">
                  <div
                    className="h-0.5 w-full rounded-full"
                    style={{ backgroundColor: stroke }}
                  />
                  <span
                    className="mt-1 text-[9px] font-mono tabular-nums"
                    style={{ color: stroke }}
                  >
                    {friction}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        카드에 마우스를 올리면 툴팁으로 요약을 볼 수 있고, &quot;단계 상세 설명&quot;을
        펼치면 전체 텍스트가 보입니다. 연결선은 다음 단계로의 마찰이 클수록 붉어집니다.
      </p>
    </div>
  );
}
