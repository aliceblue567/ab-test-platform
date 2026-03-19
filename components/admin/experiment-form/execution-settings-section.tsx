"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreateExperimentFormValues } from "./experiment-form-schema";

export function ExecutionSettingsSection() {
  const { register } = useFormContext<CreateExperimentFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">실행 설정</CardTitle>
        <p className="text-sm text-muted-foreground">
          실험에 참여할 사용자 비율을 설정합니다.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="trafficAllocation">사용자 노출 비율 (%)</Label>
          <Input
            id="trafficAllocation"
            type="number"
            {...register("trafficAllocation")}
            min={0}
            max={100}
            placeholder="100"
          />
          <p className="text-xs text-muted-foreground">
            전체 사용자 중 이 실험에 노출할 비율 (0~100%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
