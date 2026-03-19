"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { ReportSummary } from "@/types/report";

type ReportDecisionNoteProps = {
  summary: ReportSummary;
};

export function ReportDecisionNote({ summary }: ReportDecisionNoteProps) {
  const getNote = (): { title: string; description: string } => {
    if (summary.winner === "inconclusive") {
      return {
        title: "결과 불명확",
        description:
          "A와 B의 CTA 클릭률이 동일합니다. 더 많은 트래픽을 확보하거나 실험 기간을 연장한 후 다시 분석해 보세요.",
      };
    }

    if (summary.uplift > 0) {
      return {
        title: `Variant ${summary.winner} 권장`,
        description: `Variant ${summary.winner}가 CTA 클릭률에서 ${(summary.uplift * 100).toFixed(1)}% 높은 성과를 보였습니다. 통계적 유의성 검정을 추가로 수행하면 의사결정 신뢰도가 향상됩니다.`,
      };
    }

    return {
      title: "Variant A 유지 권장",
      description:
        "Variant B가 A보다 낮은 성과를 보였습니다. 현재 Variant A를 유지하는 것을 권장합니다.",
    };
  };

  const note = getNote();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium">Decision Note</span>
      </CardHeader>
      <CardContent>
        <h4 className="font-semibold mb-2">{note.title}</h4>
        <p className="text-sm text-muted-foreground">{note.description}</p>
      </CardContent>
    </Card>
  );
}
