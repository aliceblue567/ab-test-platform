"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspaceBasePath } from "@/components/workspace/workspace-base-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

type Experiment = {
  id: string;
  key: string;
  name: string;
  status: string;
  requireParticipantLinkToken?: boolean;
};

export function ExperimentUrlsHub() {
  const base = useWorkspaceBasePath();
  const [rows, setRows] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/experiments");
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as Experiment[];
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">참여 URL 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            외부 참가자에게는{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /test/실험키
            </code>{" "}
            주소만 공유하세요. 2차 보호가 켜진 실험은 편집 화면에서 발급한 전체 URL(
            <code className="rounded bg-muted px-1 py-0.5 text-xs">?p=…</code>
            )이 필요합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-muted-foreground py-12 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          불러오는 중…
        </p>
      )}

      {!loading && rows.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            실험이 없습니다.{" "}
            <Link href={`${base}/planner`} className="text-primary underline">
              새 실험 만들기
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-4">
          {rows.map((exp) => {
            const path = `/test/${exp.key}`;
            const full = origin ? `${origin}${path}` : path;
            return (
              <Card key={exp.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="text-lg">{exp.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      키: {exp.key}
                      {exp.requireParticipantLinkToken && exp.status === "running" && (
                        <span className="ml-2 text-amber-600 dark:text-amber-500">
                          · 참가 링크 2차 보호
                        </span>
                      )}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${base}/planner/${exp.id}`}>실험 편집</Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="max-w-full flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">
                      {full}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(full);
                        toast.success("참여 경로를 복사했습니다.");
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      복사
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={path} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        열기
                      </a>
                    </Button>
                  </div>
                  {exp.requireParticipantLinkToken && (
                    <p className="text-xs text-muted-foreground">
                      2차 보호가 켜져 있으면 실험 편집 화면의「참가 링크」에서 서명이 포함된
                      전체 URL을 복사해 배포하세요.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
