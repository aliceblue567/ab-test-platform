"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UxExpertPinV1 = {
  ux_pin_id: string;
  ux_x_pct: number;
  ux_y_pct: number;
  ux_note: string;
};

function newPinId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `ux_pin_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  }
  return `ux_pin_${Date.now()}`;
}

export function UxImagePinOverlay({
  imageUrl,
  expertMode,
  pins,
  onPinsChange,
  className,
}: {
  imageUrl: string;
  expertMode: boolean;
  pins: UxExpertPinV1[];
  onPinsChange: (next: UxExpertPinV1[]) => void;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef(pins);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    pinsRef.current = pins;
  }, [pins]);

  const setPct = useCallback(
    (id: string, x: number, y: number) => {
      const next = pinsRef.current.map((p) =>
        p.ux_pin_id === id
          ? {
              ...p,
              ux_x_pct: Math.min(100, Math.max(0, x)),
              ux_y_pct: Math.min(100, Math.max(0, y)),
            }
          : p
      );
      pinsRef.current = next;
      onPinsChange(next);
    },
    [onPinsChange]
  );

  const onImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!expertMode || dragId) return;
    e.stopPropagation();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const next = [
      ...pinsRef.current,
      {
        ux_pin_id: newPinId(),
        ux_x_pct: x,
        ux_y_pct: y,
        ux_note: "",
      },
    ];
    pinsRef.current = next;
    onPinsChange(next);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId || !expertMode || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPct(dragId, x, y);
  };

  const endDrag = () => setDragId(null);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative inline-block max-w-full select-none",
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
        alt="분석 대상 화면"
        onClick={onImageClick}
        className="max-h-[min(72vh,880px)] w-auto max-w-full rounded-lg border border-border bg-muted/20 object-contain"
        draggable={false}
      />
      {pins.map((p) => (
        <div
          key={p.ux_pin_id}
          data-ux-pin
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${p.ux_x_pct}%`, top: `${p.ux_y_pct}%` }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (!expertMode) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragId(p.ux_pin_id);
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span
              title={p.ux_note || "전문가 핀"}
              className={cn(
                "h-4 w-4 rounded-full border-2 border-background shadow-md ring-2",
                expertMode
                  ? "bg-amber-500 ring-amber-300/80"
                  : "bg-primary ring-primary/30"
              )}
            />
            {expertMode && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-6 w-6 opacity-90"
                onClick={(e) => {
                  e.stopPropagation();
                  onPinsChange(pins.filter((x) => x.ux_pin_id !== p.ux_pin_id));
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
