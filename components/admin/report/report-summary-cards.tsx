"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Target } from "lucide-react";
import type { ReportSummary } from "@/types/report";

type ReportSummaryCardsProps = {
  summary: ReportSummary;
};

export function ReportSummaryCards({ summary }: ReportSummaryCardsProps) {
  const upliftPercent = (summary.uplift * 100).toFixed(1);
  const upliftSign = summary.uplift >= 0 ? "+" : "";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="text-sm font-medium">Winner</span>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {summary.winner === "inconclusive" ? (
              <span className="text-2xl font-bold text-muted-foreground">
                Inconclusive
              </span>
            ) : (
              <Badge
                variant={summary.winner === "B" ? "success" : "secondary"}
                className="text-lg px-3 py-1"
              >
                Variant {summary.winner}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="text-sm font-medium">Uplift</span>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <span
            className={`text-2xl font-bold ${
              summary.uplift > 0
                ? "text-emerald-500"
                : summary.uplift < 0
                  ? "text-amber-500"
                  : "text-muted-foreground"
            }`}
          >
            {upliftSign}{upliftPercent}%
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            (B vs A) cta_click_rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <span className="text-sm font-medium">Primary Metric</span>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <span className="text-lg font-semibold">{summary.primaryMetric}</span>
        </CardContent>
      </Card>
    </div>
  );
}
