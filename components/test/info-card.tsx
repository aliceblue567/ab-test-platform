"use client";

import { useState } from "react";
import type { InfoCardPayload } from "@/types/test-payload";

type InfoCardProps = {
  card: InfoCardPayload;
  onCardClick?: (cardId: string) => void;
  onDetailView?: (cardId: string) => void;
};

export function InfoCard({ card, onCardClick, onDetailView }: InfoCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const handleClick = () => {
    onCardClick?.(card.id);
    setShowDetail(true);
    onDetailView?.(card.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/50 cursor-pointer"
    >
      <h3 className="font-semibold">{card.title}</h3>
      {card.description && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {card.description}
        </p>
      )}
      {showDetail && (
        <div className="mt-3 rounded bg-muted/50 p-3 text-sm">
          {card.description}
        </div>
      )}
    </div>
  );
}
