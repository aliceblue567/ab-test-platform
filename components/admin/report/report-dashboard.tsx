"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { ReportSummaryCards } from "./report-summary-cards";
import { ConversionComparisonChart } from "./conversion-comparison-chart";
import { FunnelComparisonChart } from "./funnel-comparison-chart";
import { ReportDecisionNote } from "./report-decision-note";
import type { ReportApiResponse } from "@/types/report";

export function ReportDashboard({ experimentId }: { experimentId: string }) {
  const [data, setData] = useState<ReportApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reports/${experimentId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("리포트를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [experimentId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/admin/planner/${experimentId}`}>플래너로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/planner/${experimentId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{data.experiment.name}</h1>
            <p className="text-muted-foreground">{data.experiment.key}</p>
          </div>
        </div>
        <Badge
          variant={
            data.experiment.status === "running" ? "success" : "secondary"
          }
        >
          {data.experiment.status}
        </Badge>
      </div>

      <ReportSummaryCards summary={data.summary} />

      <Card>
        <CardHeader>
          <CardTitle>A/B Conversion Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">
            Card Click Rate, Detail View Rate, CTA Click Rate 비교
          </p>
        </CardHeader>
        <CardContent>
          <ConversionComparisonChart
            variantA={data.variants.A}
            variantB={data.variants.B}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funnel Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">
            Landing → Card Click → Detail View → CTA Click (unique users)
          </p>
        </CardHeader>
        <CardContent>
          <FunnelComparisonChart
            variantA={data.variants.A}
            variantB={data.variants.B}
          />
        </CardContent>
      </Card>

      <ReportDecisionNote summary={data.summary} />
    </div>
  );
}
