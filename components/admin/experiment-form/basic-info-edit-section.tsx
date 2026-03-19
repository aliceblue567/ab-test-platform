"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EditExperimentFormValues } from "./experiment-edit-form-schema";

export function BasicInfoEditSection() {
  const { register, formState: { errors } } =
    useFormContext<EditExperimentFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">실험 이름</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">실험 목적</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="이 실험으로 무엇을 확인하고 싶은지 간단히 적어주세요."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
