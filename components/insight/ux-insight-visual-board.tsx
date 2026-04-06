"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  UxGoodPracticeV1,
  UxUsabilityIssueV1,
} from "@/lib/ux-insight/screen-analysis-v1";
import type { UxExpertPinV1 } from "@/components/insight/ux-image-pin-overlay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PinOverrideMap = Record<
  string,
  { ux_pin_x_pct: number; ux_pin_y_pct: number }
>;

export function issueVisualKey(issue: UxUsabilityIssueV1, index: number) {
  return issue.ux_issue_id ?? `issue-${index}`;
}

export function goodVisualKey(index: number) {
  return `good-${index}`;
}

function newExpertPinId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `ux_pin_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  }
  return `ux_pin_${Date.now()}`;
}

function issuePinColor(sev: UxUsabilityIssueV1["ux_severity"]) {
  if (sev === "high") return "bg-red-500 ring-red-200";
  if (sev === "medium") return "bg-amber-500 ring-amber-200";
  if (sev === "low") return "bg-yellow-400 ring-yellow-100 text-black";
  return "bg-amber-500/90 ring-amber-200";
}

type DragState =
  | { kind: "issue"; key: string }
  | { kind: "good"; key: string }
  | { kind: "expert"; id: string }
  | null;

export function UxInsightVisualBoard({
  imageUrl,
  issues,
  goodPractices,
  severityFilter,
  expertMode,
  expertPins,
  onExpertPinsChange,
  adjustAiPins,
  pinOverrides,
  onPinPositionChange,
  highlightedKey,
  onHighlightKey,
  className,
}: {
  imageUrl: string;
  issues: UxUsabilityIssueV1[];
  goodPractices: UxGoodPracticeV1[];
  severityFilter: "all" | "high" | "medium" | "low";
  expertMode: boolean;
  expertPins: UxExpertPinV1[];
  onExpertPinsChange: (next: UxExpertPinV1[]) => void;
  adjustAiPins: boolean;
  pinOverrides: PinOverrideMap;
  onPinPositionChange: (
    key: string,
    xPct: number,
    yPct: number
  ) => void;
  highlightedKey?: string | null;
  onHighlightKey?: (key: string | null) => void;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const expertRef = useRef(expertPins);
  useEffect(() => {
    expertRef.current = expertPins;
  }, [expertPins]);

  const setExpertPct = useCallback(
    (id: string, x: number, y: number) => {
      const next = expertRef.current.map((p) =>
        p.ux_pin_id === id
          ? {
              ...p,
              ux_x_pct: Math.min(100, Math.max(0, x)),
              ux_y_pct: Math.min(100, Math.max(0, y)),
            }
          : p
      );
      expertRef.current = next;
      onExpertPinsChange(next);
    },
    [onExpertPinsChange]
  );

  const pointerToPct = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const rect = wrap.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!expertMode || drag) return;
    e.stopPropagation();
    const { x, y } = pointerToPct(e.clientX, e.clientY);
    const next = [
      ...expertRef.current,
      {
        ux_pin_id: newExpertPinId(),
        ux_x_pct: x,
        ux_y_pct: y,
        ux_note: "",
      },
    ];
    expertRef.current = next;
    onExpertPinsChange(next);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !wrapRef.current) return;
    const { x, y } = pointerToPct(e.clientX, e.clientY);
    if (drag.kind === "expert") {
      setExpertPct(drag.id, x, y);
    } else {
      onPinPositionChange(drag.key, x, y);
    }
  };

  const endDrag = () => setDrag(null);

  const canDragAi = adjustAiPins;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative inline-block max-w-full select-none [contain:layout_paint]",
        expertMode && "cursor-crosshair",
        className
      )}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="분석 캔버스"
        onClick={onImageClick}
        className="max-h-[min(76vh,900px)] w-auto max-w-full rounded-xl border border-border bg-muted/15 object-contain shadow-sm"
        draggable={false}
        style={{ transform: "translateZ(0)" }}
      />

      {goodPractices.map((g, idx) => {
        const k = goodVisualKey(idx);
        const ov = pinOverrides[k];
        const px = ov?.ux_pin_x_pct ?? g.ux_pin_x_pct;
        const py = ov?.ux_pin_y_pct ?? g.ux_pin_y_pct;
        if (px === undefined || py === undefined) return null;
        const hi = highlightedKey === k;
        return (
          <button
            key={k}
            type="button"
            title={g.ux_good_summary}
            className={cn(
              "absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background shadow-lg ring-2 ring-offset-2 ring-offset-background/80 transition-transform [will-change:transform]",
              "bg-emerald-500 ring-emerald-200",
              hi && "scale-125 ring-primary"
            )}
            style={{
              left: `${px}%`,
              top: `${py}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onHighlightKey?.(hi ? null : k);
            }}
            onPointerDown={(e) => {
              if (!canDragAi) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ kind: "good", key: k });
            }}
          >
            <span className="text-[10px] font-bold text-white">G</span>
          </button>
        );
      })}

      {issues.map((issue, idx) => {
        const k = issueVisualKey(issue, idx);
        if (
          severityFilter !== "all" &&
          issue.ux_severity !== severityFilter
        ) {
          return null;
        }
        const ov = pinOverrides[k];
        const px = ov?.ux_pin_x_pct ?? issue.ux_pin_x_pct;
        const py = ov?.ux_pin_y_pct ?? issue.ux_pin_y_pct;
        if (px === undefined || py === undefined) return null;
        const hi = highlightedKey === k;
        return (
          <button
            key={k}
            type="button"
            title={issue.ux_issue_summary}
            className={cn(
              "absolute z-[21] flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background shadow-lg ring-2 ring-offset-2 ring-offset-background/80 transition-transform [will-change:transform]",
              issuePinColor(issue.ux_severity),
              hi && "scale-125 ring-primary"
            )}
            style={{
              left: `${px}%`,
              top: `${py}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onHighlightKey?.(hi ? null : k);
            }}
            onPointerDown={(e) => {
              if (!canDragAi) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setDrag({ kind: "issue", key: k });
            }}
          >
            <span className="text-[10px] font-bold text-background">!</span>
          </button>
        );
      })}

      {expertPins.map((p) => (
        <div
          key={p.ux_pin_id}
          data-ux-pin
          className="absolute z-[25] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${p.ux_x_pct}%`, top: `${p.ux_y_pct}%` }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (!expertMode) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setDrag({ kind: "expert", id: p.ux_pin_id });
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span
              title={p.ux_note || "전문가 핀"}
              className={cn(
                "h-4 w-4 rounded-full border-2 border-background shadow-md ring-2 [will-change:transform]",
                expertMode
                  ? "bg-violet-500 ring-violet-200"
                  : "bg-violet-600/90 ring-violet-300"
              )}
            />
            {expertMode && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpertPinsChange(
                    expertPins.filter((x) => x.ux_pin_id !== p.ux_pin_id)
                  );
                }}
              >
                ×
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
