"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreateExperimentFormValues } from "./experiment-form-schema";

function slugify(text: string): string {
  const result = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
  return result || "experiment";
}

export function BasicInfoSection() {
  const { register, watch, setValue, formState: { errors } } =
    useFormContext<CreateExperimentFormValues>();

  const name = watch("name");
  const key = watch("key");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("key", slugify(value));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">실험 이름</Label>
          <Input
            id="name"
            {...register("name", {
              onChange: (e) =>
                handleNameChange(e as React.ChangeEvent<HTMLInputElement>),
            })}
            placeholder="예: 홈페이지 히어로 A/B 테스트"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="key">실험 코드</Label>
          <Input
            id="key"
            {...register("key")}
            placeholder="자동 생성됨"
            className="bg-muted/50 text-muted-foreground"
            readOnly
          />
          <p className="text-xs text-muted-foreground">
            실험 코드는 내부 식별용으로 실험 이름 기반 자동 생성됩니다.
          </p>
          {errors.key && (
            <p className="text-sm text-destructive">{errors.key.message}</p>
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
