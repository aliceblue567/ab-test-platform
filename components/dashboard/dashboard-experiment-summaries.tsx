"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExperimentStatusBadge } from "@/components/admin/experiment-status-badge";

type Row = {
  id: string;
  key: string;
  name: string;
  status: string;
  updatedAt: string;
};

type SummaryResponse = {
  running: Row[];
  recentOther: Row[];
  runningCount: number;
};

function formatUpdated(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function DashboardExperimentSummaries({
  basePath,
}: {
  basePath: "/admin" | "/workspace";
}) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/summary")
      .then((res) => {
        if (res.status === 401) throw new Error("로그인이 필요합니다.");
        if (!res.ok) throw new Error("불러오지 못했습니다.");
        return res.json() as Promise<SummaryResponse>;
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const RowLink = ({ row }: { row: Row }) => (
    <Link
      href={`${basePath}/planner/${row.id}`}
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{row.name}</p>
        <p className="truncate text-xs text-muted-foreground">{row.key}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ExperimentStatusBadge status={row.status} />
        <span className="text-xs text-muted-foreground">
          {formatUpdated(row.updatedAt)}
        </span>
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">실험 현황</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => load()}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          새로고침
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                진행 중{" "}
                <span className="font-normal text-muted-foreground">
                  ({data.runningCount}개)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.running.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  실행 중인 실험이 없습니다. 새 실험을 만들거나 초안에서 실행해
                  보세요.
                </p>
              ) : (
                data.running.map((row) => <RowLink key={row.id} row={row} />)
              )}
              <Button variant="link" className="h-auto px-0 pt-1" asChild>
                <Link href={`${basePath}/experiments`}>실험 목록 전체 →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                최근 업데이트{" "}
                <span className="font-normal text-muted-foreground">
                  (진행 중 제외)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recentOther.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  초안·일시정지·완료된 실험이 아직 없거나 모두 진행 중입니다.
                </p>
              ) : (
                data.recentOther.map((row) => <RowLink key={row.id} row={row} />)
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-16 rounded bg-muted" />
                <div className="h-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
