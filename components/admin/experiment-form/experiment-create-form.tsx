"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BasicInfoSection } from "./basic-info-section";
import { VariantFormSection } from "./variant-form-section";
import { PrimaryGoalSection } from "./primary-goal-section";
import { ExecutionSettingsSection } from "./execution-settings-section";
import { VariantPreviewSection } from "./variant-preview-section";
import { EventCollectionStatus } from "@/components/admin/event-collection-status";
import { ResultInterpretationSection } from "@/components/admin/result-interpretation-section";
import {
  createExperimentFormSchema,
  type CreateExperimentFormValues,
} from "./experiment-form-schema";

export function ExperimentCreateForm() {
  const router = useRouter();
  const form = useForm<CreateExperimentFormValues>({
    resolver: zodResolver(createExperimentFormSchema),
    defaultValues: {
      key: "experiment",
      name: "",
      description: "",
      primaryGoalKey: undefined,
      primaryGoalCustom: undefined,
      trafficAllocation: 100,
      variants: [
        {
          key: "control",
          name: "기본 화면",
          weight: 50,
          payloadJson: "{}",
          isControl: true,
        },
        {
          key: "variant_a",
          name: "새 시안",
          weight: 50,
          payloadJson: "{}",
          isControl: false,
        },
      ],
    },
  });

  const onSubmit = async (data: CreateExperimentFormValues) => {
    const payload = {
      key: data.key,
      name: data.name,
      description: data.description || undefined,
      primaryGoalKey: data.primaryGoalKey ?? undefined,
      primaryGoalCustom: data.primaryGoalCustom ?? undefined,
      trafficAllocation: data.trafficAllocation,
      variants: data.variants.map((v) => ({
        key: v.key,
        name: v.name,
        weight: v.weight,
        payload: JSON.parse(v.payloadJson) as Record<string, unknown>,
        isControl: v.isControl,
      })),
    };

    const res = await fetch("/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      form.setError("root", {
        message: err.error ?? "저장에 실패했습니다.",
      });
      return;
    }

    const created = await res.json();
    router.push(`/admin/planner/${created.id}`);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {form.formState.errors.root && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {form.formState.errors.root.message}
          </div>
        )}

        <BasicInfoSection />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">비교할 시안</CardTitle>
            <p className="text-sm text-muted-foreground">
              사용자에게 보여줄 두 가지 화면을 설정하고, 각 시안의 노출 비율을 정하세요.
            </p>
          </CardHeader>
          <CardContent>
            <VariantFormSection />
          </CardContent>
        </Card>

        <PrimaryGoalSection />

        <ExecutionSettingsSection />

        <VariantPreviewSection />

        <EventCollectionStatus />

        <ResultInterpretationSection />

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "생성 중..." : "실험 생성하기"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            취소
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
