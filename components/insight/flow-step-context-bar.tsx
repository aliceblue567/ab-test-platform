"use client";

import Image from "next/image";
import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";

export type FlowStepThumb = {
  index: number;
  label: string;
  previewUrl: string;
};

export type FlowStepContextBarProps = {
  steps: FlowStepThumb[];
  /** null = 전체 플로우 맥락 (강조 없음) */
  activeStepIndex: number | null;
  onSelectStep: (index: number | null) => void;
  className?: string;
};

/**
 * 멀티 스크린 플로우에서 레이어드 리포트를 읽을 때, 각 단계 화면을 썸네일로 상시 표시합니다.
 * (단계 ↔ 카드 자동 동기화는 스키마 확장 시 연동 가능)
 */
export function FlowStepContextBar({
  steps,
  activeStepIndex,
  onSelectStep,
  className,
}: FlowStepContextBarProps) {
  if (steps.length <= 1) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
        <span>
          단계 맥락 — 보고 있는 화면을 선택하면 해당 썸네일이 강조됩니다.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectStep(null)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            activeStepIndex === null
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          전체
        </button>
        {steps.map((s) => {
          const active = activeStepIndex === s.index;
          return (
            <button
              key={s.index}
              type="button"
              onClick={() => onSelectStep(s.index)}
              title={s.label}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-1 pr-2 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className="relative h-10 w-[52px] shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={s.previewUrl}
                  alt=""
                  width={104}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0 max-w-[120px]">
                <p className="font-mono text-[10px] text-muted-foreground">
                  #{s.index}
                </p>
                <p className="truncate text-xs font-medium leading-tight">
                  {s.label || `단계 ${s.index}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
