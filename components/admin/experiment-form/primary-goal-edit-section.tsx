"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EditExperimentFormValues } from "./experiment-edit-form-schema";

const GOAL_OPTIONS = [
  { value: "cta_click_rate", label: "CTA 클릭률 증가" },
  { value: "card_click_rate", label: "카드 클릭률 증가" },
  { value: "detail_view_rate", label: "상세 확인 비율 증가" },
  { value: "bounce_reduction", label: "이탈률 감소" },
  { value: "custom", label: "직접 입력" },
] as const;

export function PrimaryGoalEditSection() {
  const { watch, setValue, register, formState: { errors } } =
    useFormContext<EditExperimentFormValues>();

  const primaryGoalKey = watch("primaryGoalKey");
  const isCustom = primaryGoalKey === "custom";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">핵심 목표</CardTitle>
        <p className="text-sm text-muted-foreground">
          이 실험에서 가장 중요하게 볼 행동 지표를 선택하세요.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>핵심 지표</Label>
          <Select
            value={primaryGoalKey ?? ""}
            onValueChange={(v) =>
              setValue("primaryGoalKey", (v || null) as "cta_click_rate" | "card_click_rate" | "detail_view_rate" | "bounce_reduction" | "custom" | null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="지표 선택" />
            </SelectTrigger>
            <SelectContent>
              {GOAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isCustom && (
          <div className="space-y-2">
            <Label htmlFor="primaryGoalCustom">직접 입력</Label>
            <Input
              id="primaryGoalCustom"
              {...register("primaryGoalCustom")}
              placeholder="예: 구매 전환율 개선"
            />
            {errors.primaryGoalCustom && (
              <p className="text-sm text-destructive">
                {errors.primaryGoalCustom.message}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
