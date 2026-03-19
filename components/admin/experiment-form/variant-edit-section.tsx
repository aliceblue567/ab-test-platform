"use client";

import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { EditExperimentFormValues } from "./experiment-edit-form-schema";

function getVariantLabel(index: number): string {
  return index === 0 ? "시안 A" : index === 1 ? "시안 B" : `시안 ${index + 1}`;
}

function VariantEditCard({ index }: { index: number }) {
  const { register, watch, setValue, formState: { errors } } =
    useFormContext<EditExperimentFormValues>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const payloadJson = watch(`variants.${index}.payloadJson`);
  let payload: { title?: string; subtitle?: string; ctaLabel?: string } = {};
  try {
    payload = JSON.parse(payloadJson || "{}");
  } catch {
    // ignore
  }

  const updatePayloadFromFields = (
    field: "title" | "subtitle" | "ctaLabel",
    value: string
  ) => {
    try {
      const parsed = JSON.parse(payloadJson || "{}");
      parsed[field] = value;
      setValue(`variants.${index}.payloadJson`, JSON.stringify(parsed, null, 2));
    } catch {
      setValue(
        `variants.${index}.payloadJson`,
        JSON.stringify({ [field]: value })
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <span className="font-semibold text-base">{getVariantLabel(index)}</span>
      </CardHeader>
      <CardContent className="space-y-5">
        <input type="hidden" {...register(`variants.${index}.key`)} />
        <div className="space-y-2">
          <Label>시안 이름</Label>
          <Input {...register(`variants.${index}.name`)} />
          {errors.variants?.[index]?.name && (
            <p className="text-sm text-destructive">
              {errors.variants[index]?.name?.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`control-${index}`}>기준 시안</Label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id={`control-${index}`}
              {...register(`variants.${index}.isControl`)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">이 시안을 기준 시안으로 사용</span>
          </label>
        </div>

        <div className="space-y-2">
          <Label>노출 비율 (%)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              {...register(`variants.${index}.weight`)}
              min={0}
              max={100}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>

        <div className="border-t pt-5 space-y-4">
          <h4 className="text-sm font-medium">화면 구성</h4>
          <div className="space-y-2">
            <Label className="text-muted-foreground">화면 제목</Label>
            <Input
              placeholder="예: 환영합니다"
              value={payload.title ?? ""}
              onChange={(e) => updatePayloadFromFields("title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">안내 문구</Label>
            <Input
              placeholder="예: 서비스를 이용해 보세요"
              value={payload.subtitle ?? ""}
              onChange={(e) => updatePayloadFromFields("subtitle", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">버튼 문구</Label>
            <Input
              placeholder="예: 시작하기"
              value={payload.ctaLabel ?? ""}
              onChange={(e) => updatePayloadFromFields("ctaLabel", e.target.value)}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            고급 설정 (화면 구성 데이터)
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-2">
              <Label className="text-muted-foreground">JSON 데이터</Label>
              <Textarea
                {...register(`variants.${index}.payloadJson`)}
                className="min-h-[100px] font-mono text-xs"
              />
              {errors.variants?.[index]?.payloadJson && (
                <p className="text-sm text-destructive">
                  {errors.variants[index]?.payloadJson?.message}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function VariantEditSection() {
  const { control } = useFormContext<EditExperimentFormValues>();
  const { fields } = useFieldArray({ control, name: "variants" });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {fields.map((field, index) => (
          <VariantEditCard key={field.id} index={index} />
        ))}
      </div>
    </div>
  );
}
