"use client";

import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BasicInfoEditSection } from "./basic-info-edit-section";
import { VariantEditSection } from "./variant-edit-section";
import { PrimaryGoalEditSection } from "./primary-goal-edit-section";
import { ExecutionSettingsEditSection } from "./execution-settings-edit-section";
import { VariantPreviewEditSection } from "./variant-preview-edit-section";
import { EventCollectionStatus } from "@/components/admin/event-collection-status";
import { ResultInterpretationSection } from "@/components/admin/result-interpretation-section";
import { ExperimentStatusBadge } from "@/components/admin/experiment-status-badge";
import {
  editExperimentFormSchema,
  type EditExperimentFormValues,
} from "./experiment-edit-form-schema";
import { useWorkspaceBasePath } from "@/components/workspace/workspace-base-context";

const VALID_GOAL_KEYS = [
  "cta_click_rate",
  "card_click_rate",
  "detail_view_rate",
  "bounce_reduction",
  "custom",
] as const;

type Experiment = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  primaryGoalKey: string | null;
  primaryGoalCustom: string | null;
  status: string;
  trafficAllocation: number;
  requireParticipantLinkToken: boolean;
  variants: {
    id: string;
    key: string;
    name: string;
    weight: number;
    payload: unknown;
    isControl: boolean;
  }[];
};

export function ExperimentEditForm({ experimentId }: { experimentId: string }) {
  const base = useWorkspaceBasePath();
  const router = useRouter();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [tokenToggleLoading, setTokenToggleLoading] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);
  const [mintUrl, setMintUrl] = useState<string | null>(null);
  const [mintExpires, setMintExpires] = useState<string | null>(null);

  const form = useForm<EditExperimentFormValues>({
    resolver: zodResolver(editExperimentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      primaryGoalKey: null,
      primaryGoalCustom: null,
      trafficAllocation: 100,
      variants: [],
    },
  });

  useEffect(() => {
    fetch(`/api/experiments/${experimentId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: Experiment) => {
        setExperiment({
          ...data,
          requireParticipantLinkToken: data.requireParticipantLinkToken === true,
        });
        form.reset({
          name: data.name,
          description: data.description ?? "",
          primaryGoalKey:
            data.primaryGoalKey && VALID_GOAL_KEYS.includes(data.primaryGoalKey as (typeof VALID_GOAL_KEYS)[number])
              ? (data.primaryGoalKey as (typeof VALID_GOAL_KEYS)[number])
              : null,
          primaryGoalCustom: data.primaryGoalCustom ?? null,
          trafficAllocation: data.trafficAllocation,
          variants: data.variants.map((v) => ({
            id: v.id,
            key: v.key as "control" | "variant_a" | "variant_b",
            name: v.name,
            weight: v.weight,
            payloadJson: JSON.stringify(v.payload, null, 2),
            isControl: v.isControl,
          })),
        });
      })
      .catch(() => setExperiment(null))
      .finally(() => setLoading(false));
  }, [experimentId, form]);

  const updateStatus = async (status: string) => {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/experiments/${experimentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Experiment;
        setExperiment(updated);
      }
    } finally {
      setStatusLoading(false);
    }
  };

  const onSubmit = async (data: EditExperimentFormValues) => {
    const res = await fetch(`/api/experiments/${experimentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        description: data.description || null,
        primaryGoalKey: data.primaryGoalKey ?? null,
        primaryGoalCustom: data.primaryGoalCustom ?? null,
        trafficAllocation: data.trafficAllocation,
        variants: data.variants
          .filter((v) => v.id)
          .map((v) => ({
            id: v.id,
            name: v.name,
            weight: v.weight,
            payload: JSON.parse(v.payloadJson) as Record<string, unknown>,
          })),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      form.setError("root", { message: err.error ?? "저장에 실패했습니다." });
      return;
    }

    router.refresh();
  };

  if (loading) return <div className="p-6 text-muted-foreground">로딩 중...</div>;
  if (!experiment) return <div className="p-6 text-destructive">실험을 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{experiment.name}</h1>
          <p className="text-muted-foreground">{experiment.key}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExperimentStatusBadge status={experiment.status} />
          {experiment.status === "draft" && (
            <Button
              size="sm"
              onClick={() => updateStatus("running")}
              disabled={statusLoading}
            >
              실행하기
            </Button>
          )}
          {experiment.status === "running" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus("paused")}
                disabled={statusLoading}
              >
                일시정지
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus("completed")}
                disabled={statusLoading}
              >
                완료
              </Button>
            </>
          )}
          {experiment.status === "paused" && (
            <Button
              size="sm"
              onClick={() => updateStatus("running")}
              disabled={statusLoading}
            >
              재개
            </Button>
          )}
        </div>
      </div>

      <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {form.formState.errors.root && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        <BasicInfoEditSection />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">외부 참가 링크</CardTitle>
            <p className="text-sm text-muted-foreground">
              2차 보호를 켜면 <code className="rounded bg-muted px-1">/test/실험키</code>만으로는
              참가할 수 없고, 아래에서 발급한 주소(토큰 포함)만 유효합니다. 발급할 때마다 새
              토큰이 붙습니다. 모든 실험에 강제하려면 배포 환경에{" "}
              <code className="rounded bg-muted px-1">PARTICIPANT_LINK_REQUIRED=true</code>를
              설정하세요.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="req-participant-token">참가 링크 2차 보호</Label>
                <p className="text-xs text-muted-foreground">
                  외부 테스터에게는「새 참가 링크 발급」으로 만든 URL만 공유
                </p>
              </div>
              <Switch
                id="req-participant-token"
                className="shrink-0"
                checked={experiment.requireParticipantLinkToken}
                disabled={tokenToggleLoading}
                onCheckedChange={async (v) => {
                  setTokenToggleLoading(true);
                  try {
                    const res = await fetch(`/api/experiments/${experimentId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ requireParticipantLinkToken: v }),
                    });
                    if (res.ok) {
                      const u = (await res.json()) as Experiment;
                      setExperiment((prev) =>
                        prev ? { ...prev, requireParticipantLinkToken: u.requireParticipantLinkToken } : null
                      );
                    }
                  } finally {
                    setTokenToggleLoading(false);
                  }
                }}
              />
            </div>
            {experiment.status === "running" && (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={mintLoading}
                  onClick={async () => {
                    setMintLoading(true);
                    try {
                      const res = await fetch(
                        `/api/experiments/${experimentId}/participant-link`,
                        { method: "POST" }
                      );
                      const data = (await res.json()) as {
                        url?: string;
                        expiresAt?: string;
                        error?: string;
                      };
                      if (res.ok && data.url) {
                        setMintUrl(data.url);
                        setMintExpires(data.expiresAt ?? null);
                      }
                    } finally {
                      setMintLoading(false);
                    }
                  }}
                >
                  {mintLoading ? "발급 중…" : "새 참가 링크 발급"}
                </Button>
                {mintUrl && (
                  <div className="space-y-2">
                    <Label>
                      방금 발급한 링크
                      {mintExpires && (
                        <span className="ml-2 font-normal text-muted-foreground">
                          (만료 {new Date(mintExpires).toLocaleString()})
                        </span>
                      )}
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input readOnly value={mintUrl} className="font-mono text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => void navigator.clipboard.writeText(mintUrl)}
                      >
                        복사
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">비교할 시안</CardTitle>
            <p className="text-sm text-muted-foreground">
              각 시안의 설정과 화면 구성을 수정할 수 있습니다.
            </p>
          </CardHeader>
          <CardContent>
            <VariantEditSection />
          </CardContent>
        </Card>

        <PrimaryGoalEditSection />

        <ExecutionSettingsEditSection />

        <VariantPreviewEditSection />

        <EventCollectionStatus experimentId={experimentId} />

        <ResultInterpretationSection />

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "저장 중..." : "저장"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={`${base}/report/${experimentId}`}>리포트 보기</a>
          </Button>
        </div>
      </form>
      </FormProvider>
    </div>
  );
}
