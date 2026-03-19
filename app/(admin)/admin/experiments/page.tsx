"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

type Experiment = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  trafficAllocation: number;
  variants: { id: string; key: string; name: string }[];
  updatedAt: string;
};

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning"> = {
  draft: "secondary",
  running: "success",
  paused: "warning",
  completed: "default",
};

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/experiments")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setExperiments(data))
      .catch(() => setError("실험 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">실험 목록</h1>
        <Button asChild>
          <Link href="/admin/planner">
            <Plus className="h-4 w-4" />
            새 실험
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="text-muted-foreground">로딩 중...</div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && experiments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="mb-4 text-muted-foreground">등록된 실험이 없습니다.</p>
            <Button asChild>
              <Link href="/admin/planner">
                <Plus className="h-4 w-4" />
                첫 실험 만들기
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && experiments.length > 0 && (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <Card key={exp.id} className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">
                    <Link
                      href={`/admin/planner/${exp.id}`}
                      className="hover:underline"
                    >
                      {exp.name}
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{exp.key}</p>
                </div>
                <Badge variant={statusVariant[exp.status] ?? "secondary"}>
                  {exp.status}
                </Badge>
              </CardHeader>
              <CardContent>
                {exp.description && (
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                    {exp.description}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    Variants: {exp.variants.map((v) => v.name).join(", ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    트래픽: {exp.trafficAllocation}%
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/planner/${exp.id}`}>편집</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/report/${exp.id}`}>리포트</Link>
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
