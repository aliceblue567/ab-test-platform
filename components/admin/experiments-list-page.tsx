"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FlaskConical, RefreshCw } from "lucide-react";
import { ExperimentStatusBadge } from "@/components/admin/experiment-status-badge";
import { useWorkspaceBasePath } from "@/components/workspace/workspace-base-context";

type Experiment = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  trafficAllocation: number;
  requireParticipantLinkToken?: boolean;
  variants: { id: string; key: string; name: string }[];
  updatedAt: string;
};

type ErrorType = "unauthorized" | "server" | "network";

export function ExperimentsListPage() {
  const base = useWorkspaceBasePath();
  const pathname = usePathname() ?? `${base}/experiments`;
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const viewFilter = searchParams.get("view");
  const phaseFilter = searchParams.get("phase");
  const loginHref = `${base === "/workspace" ? "/workspace/login" : "/admin/login"}?callbackUrl=${encodeURIComponent(pathname)}`;
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null);

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/experiments");
      if (res.status === 401) {
        setError({
          type: "unauthorized",
          message: "로그인이 필요합니다. 로그인 후 다시 시도해주세요.",
        });
        return;
      }
      if (!res.ok) {
        setError({
          type: "server",
          message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        });
        return;
      }
      const data = await res.json();
      setExperiments(data);
    } catch {
      setError({
        type: "network",
        message: "네트워크 연결을 확인해주세요. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  const filtered = useMemo(() => {
    let list = experiments;
    if (statusFilter === "completed") {
      list = list.filter((e) => e.status === "completed");
    }
    if (viewFilter === "results") {
      list = list.filter((e) =>
        ["running", "paused", "completed"].includes(e.status)
      );
    }
    if (phaseFilter === "draft") {
      list = list.filter((e) => e.status === "draft");
    }
    return list;
  }, [experiments, statusFilter, viewFilter, phaseFilter]);

  const pageTitle =
    statusFilter === "completed"
      ? "보관된 실험"
      : viewFilter === "results"
        ? "결과 보기"
        : phaseFilter === "draft"
          ? "플래너 (초안)"
          : "실험 목록";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <Button asChild>
          <Link href={`${base}/planner`}>
            <Plus className="h-4 w-4" />
            새 실험
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <RefreshCw className="h-4 w-4 animate-spin" />
          로딩 중...
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-2 text-destructive font-medium">{error.message}</p>
            {error.type !== "unauthorized" && (
              <Button variant="outline" onClick={fetchExperiments} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            )}
            {error.type === "unauthorized" && (
              <Button asChild className="mt-2">
                <Link href={loginHref}>로그인</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && !error && experiments.length > 0 && filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              이 조건에 맞는 실험이 없습니다.
            </p>
            <Button variant="link" asChild className="mt-2">
              <Link href={`${base}/experiments`}>전체 목록 보기</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && experiments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-muted p-4 mb-6">
              <FlaskConical className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">아직 실험이 없어요</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              첫 번째 A/B 테스트 실험을 만들어보세요. 시안을 비교하고 결과를 확인할 수 있습니다.
            </p>
            <Button asChild size="lg">
              <Link href={`${base}/planner`}>
                <Plus className="h-4 w-4 mr-2" />
                첫 실험 만들기
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((exp) => (
            <Card key={exp.id} className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">
                    <Link
                      href={`${base}/planner/${exp.id}`}
                      className="hover:underline"
                    >
                      {exp.name}
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {exp.key}
                    {exp.requireParticipantLinkToken && exp.status === "running" && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-500">
                        · 참가 링크 2차 보호
                      </span>
                    )}
                  </p>
                </div>
                <ExperimentStatusBadge status={exp.status} />
              </CardHeader>
              <CardContent>
                {exp.description && (
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                    {exp.description}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    시안: {exp.variants.map((v) => v.name).join(", ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    트래픽: {exp.trafficAllocation}%
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${base}/planner/${exp.id}`}>편집</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${base}/report/${exp.id}`}>리포트</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
