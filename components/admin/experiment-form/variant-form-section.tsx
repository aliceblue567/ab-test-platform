"use client";

import { useState, useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, Link2, ImageIcon } from "lucide-react";
import type { CreateExperimentFormValues } from "./experiment-form-schema";

type PayloadFields = "title" | "subtitle" | "ctaLabel" | "figmaUrl" | "imageUrl";

function getVariantLabel(index: number): string {
  return index === 0 ? "시안 A" : index === 1 ? "시안 B" : `시안 ${index + 1}`;
}

function VariantCard({
  index,
  field,
  onRemove,
  canRemove,
}: {
  index: number;
  field: { id: string };
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { register, watch, setValue, formState: { errors } } =
    useFormContext<CreateExperimentFormValues>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const key = watch(`variants.${index}.key`);
  const payloadJson = watch(`variants.${index}.payloadJson`);

  let payload: {
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    figmaUrl?: string;
    imageUrl?: string;
  } = {};
  try {
    payload = JSON.parse(payloadJson || "{}");
  } catch {
    // ignore
  }

  const displayLabel = getVariantLabel(index);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const updatePayloadFromFields = (field: PayloadFields, value: string) => {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        updatePayloadFromFields("imageUrl", data.url);
        e.target.value = "";
        return;
      }
      if (res.status === 503 && data.code === "BLOB_NOT_CONFIGURED") {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          if (dataUrl.length < 45000 && file.size < 50 * 1024) {
            updatePayloadFromFields("imageUrl", dataUrl);
          } else {
            setUploadError("이미지가 너무 큽니다. 50KB 이하로 줄이거나, Vercel Blob Storage를 설정해주세요.");
          }
          setUploading(false);
        };
        reader.onerror = () => {
          setUploadError("파일 읽기 실패");
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }
      setUploadError(data.error ?? "업로드 실패");
    } catch {
      setUploadError("업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <span className="font-semibold text-base">{displayLabel}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <input type="hidden" {...register(`variants.${index}.key`)} />
        <div className="space-y-2">
          <Label>시안 이름</Label>
          <Input
            {...register(`variants.${index}.name`)}
            placeholder={index === 0 ? "예: 현재 운영 중인 기본 화면" : "예: 새 버튼 문구 시안"}
          />
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
            <span className="text-sm">이 시안을 기준 시안으로 사용 (현재 운영 중인 기본 화면)</span>
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
          {errors.variants?.[index]?.weight && (
            <p className="text-sm text-destructive">
              {errors.variants[index]?.weight?.message}
            </p>
          )}
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

          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Figma 프로토타입
            </Label>
            <Input
              placeholder="예: https://www.figma.com/proto/..."
              value={payload.figmaUrl ?? ""}
              onChange={(e) => updatePayloadFromFields("figmaUrl", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Figma 공유 링크(프로토타입)를 붙여넣으세요.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              시안 이미지
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="이미지 URL 또는 파일 업로드"
                value={payload.imageUrl ?? ""}
                onChange={(e) => {
                  setUploadError(null);
                  updatePayloadFromFields("imageUrl", e.target.value);
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="파일 업로드 (PNG, JPG)"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
            {uploading && (
              <p className="text-xs text-muted-foreground">업로드 중...</p>
            )}
            {payload.imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-border max-w-[200px]">
                <img
                  src={payload.imageUrl}
                  alt="시안 미리보기"
                  className="w-full h-auto object-contain"
                />
              </div>
            )}
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
                placeholder='{"title": "Hello", "subtitle": "..."}'
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

export function VariantFormSection() {
  const { control } = useFormContext<CreateExperimentFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">비교할 시안</h3>
        {fields.length < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                key:
                  fields.length === 0
                    ? "control"
                    : fields.length === 1
                      ? "variant_a"
                      : "variant_b",
                name: "",
                weight: 50,
                payloadJson: "{}",
                isControl: fields.length === 0,
              })
            }
          >
            <Plus className="h-4 w-4" />
            시안 추가
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {fields.map((field, index) => (
          <VariantCard
            key={field.id}
            index={index}
            field={field}
            onRemove={() => remove(index)}
            canRemove={fields.length > 1}
          />
        ))}
      </div>

      {fields.length === 2 && (
        <p className="text-sm text-muted-foreground">
          시안 A와 시안 B의 노출 비율 합계가 100%가 되도록 설정하세요.
        </p>
      )}
    </div>
  );
}
