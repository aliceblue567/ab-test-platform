"use client";

import Image from "next/image";
import { useRef } from "react";

import type {
  UxFlowAnalysisV1,
  UxFlowHotspotV1,
} from "@/lib/ux-insight/flow-analysis-v1";
import {
  findTransitionIndexForHotspot,
  hotspotStableKey,
} from "@/lib/ux-insight/flow-hotspot-link";
import {
  friction5ToTier,
  tierLabelKo,
  tierPinClasses,
} from "@/lib/ux-insight/flow-friction-visual";
import { cn } from "@/lib/utils";

export type FlowStepOverlayStripProps = {
  steps: {
    stepIndex: number;
    label: string;
    previewUrl: string;
    hotspots: UxFlowHotspotV1[];
  }[];
  transitions: UxFlowAnalysisV1["ux_transitions"];
  /** 핀 클릭 시 연결된 전환 인덱스로 스크롤 */
  onHotspotActivate: (transitionIndex: number | null, hotspotKey: string) => void;
  activeHotspotKey: string | null;
  /** 전환 카드에서 선택 시 해당 핀 강조 */
  highlightedHotspotKeys: Set<string>;
};

/**
 * 분석 화면 위에 핫스팟 핀을 직접 오버레이합니다 (콜아웃).
 */
export function FlowStepOverlayStrip({
  steps,
  transitions,
  onHotspotActivate,
  activeHotspotKey,
  highlightedHotspotKeys,
}: FlowStepOverlayStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          화면별 콜아웃 — 핀을 누르면 아래 전환 리포트로 이동합니다.
        </span>
        <span className="hidden sm:inline">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />{" "}
          1~3 유지
          <span className="mx-2 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />{" "}
          4~6 주의
          <span className="mx-2 inline-block h-2 w-2 rounded-full bg-red-600 align-middle" />{" "}
          7~10 즉시
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-thin"
      >
        {steps.map((s) => (
          <div
            key={s.stepIndex}
            className="w-[min(100vw-2rem,380px)] shrink-0"
          >
            <p className="mb-1 truncate text-xs font-medium text-muted-foreground">
              #{s.stepIndex} {s.label}
            </p>
            <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/20 shadow-sm">
              <Image
                src={s.previewUrl}
                alt=""
                width={760}
                height={560}
                className="h-auto w-full object-contain"
                unoptimized
              />
              {s.hotspots.map((h) => {
                const key = hotspotStableKey(h);
                const tIdx = findTransitionIndexForHotspot(h, transitions);
                const score5 =
                  tIdx != null ? transitions[tIdx]?.ux_friction_score ?? 3 : 3;
                const tier = friction5ToTier(score5);
                const isOn =
                  activeHotspotKey === key || highlightedHotspotKeys.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    title={`${h.ux_note}\n(${tierLabelKo(tier)}, 연결 전환: ${tIdx != null ? `#${tIdx}` : "없음"})`}
                    className={cn(
                      "absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform",
                      tierPinClasses(tier),
                      isOn && "scale-125 ring-4 ring-primary/50 z-30"
                    )}
                    style={{
                      left: `${h.x_pct}%`,
                      top: `${h.y_pct}%`,
                    }}
                    onClick={() =>
                      onHotspotActivate(tIdx, key)
                    }
                  />
                );
              })}
            </div>
            {s.hotspots.length === 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                이 화면에 핫스팟 좌표가 없습니다.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
