"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type ScreenLayerStepSyncFrameProps = {
  /** 뷰포트 중앙 밴드와 겹칠 때 스크롤 동기화에 참여할 단계; null 이면 관찰하지 않음 */
  stepIndex: number | null;
  syncEnabled: boolean;
  isHighlighted: boolean;
  reportBandHeight: (step: number, height: number) => void;
  onPointerActivate?: (step: number) => void;
  children: ReactNode;
  className?: string;
};

/**
 * Layer 1 카드가 뷰포트 중앙(읽기 구역)에 들어오면 부모로 밴드 교차 높이를 보고해,
 * 플로우 단계 썸네일 하이라이트와 맞춥니다. 포인터/포커스 시에도 즉시 동기화합니다.
 */
export function ScreenLayerStepSyncFrame({
  stepIndex,
  syncEnabled,
  isHighlighted,
  reportBandHeight,
  onPointerActivate,
  children,
  className,
}: ScreenLayerStepSyncFrameProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!syncEnabled || stepIndex == null) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const h = entry.isIntersecting ? entry.intersectionRect.height : 0;
        reportBandHeight(stepIndex, h);
      },
      {
        root: null,
        rootMargin: "-36% 0px -36% 0px",
        threshold: [0, 0.05, 0.12, 0.25, 0.5, 0.75, 1],
      }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      reportBandHeight(stepIndex, 0);
    };
  }, [syncEnabled, stepIndex, reportBandHeight]);

  return (
    <div
      ref={ref}
      tabIndex={stepIndex != null && syncEnabled ? 0 : undefined}
      className={cn(
        "rounded-lg outline-none transition-[box-shadow,ring-color]",
        stepIndex != null &&
          syncEnabled &&
          "focus-visible:ring-2 focus-visible:ring-primary/40",
        isHighlighted && stepIndex != null && "ring-2 ring-primary/50 shadow-sm",
        className
      )}
      onPointerDownCapture={() => {
        if (stepIndex != null && onPointerActivate) onPointerActivate(stepIndex);
      }}
      onFocus={() => {
        if (stepIndex != null && onPointerActivate) onPointerActivate(stepIndex);
      }}
    >
      {children}
    </div>
  );
}
