"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  running: "진행 중",
  paused: "일시 중지",
  completed: "완료",
};

const STATUS_VARIANTS: Record<string, "secondary" | "success" | "warning" | "outline"> = {
  draft: "secondary",
  running: "success",
  paused: "warning",
  completed: "outline",
};

type ExperimentStatusBadgeProps = {
  status: string;
};

export function ExperimentStatusBadge({ status }: ExperimentStatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status;
  const variant = STATUS_VARIANTS[status] ?? "secondary";

  return <Badge variant={variant}>{label}</Badge>;
}
