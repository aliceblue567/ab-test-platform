"use client";

import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Experiment = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  primaryGoalKey: string | null;
  primaryGoalCustom: string | null;
  status: string;
  trafficAllocation: number;
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
  const router = useRouter();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

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
        setExperiment(data);
        form.reset({
          name: data.name,
          description: data.description ?? "",
          primaryGoalKey: data.primaryGoalKey ?? null,
          primaryGoalCustom: data.primaryGoalCustom ?? null,
          trafficAllocation: data.trafficAllocation,
          variants: data.variants.map((v) => ({
            id: v.id,
            key: v.key,
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
        const updated = await res.json();
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
            <a href={`/admin/report/${experimentId}`}>리포트 보기</a>
          </Button>
        </div>
      </form>
      </FormProvider>
    </div>
  );
}
