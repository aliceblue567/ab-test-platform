"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LandingRenderer } from "@/components/test/landing-renderer";
import type { LandingPayload } from "@/types/test-payload";
import type { EditExperimentFormValues } from "./experiment-edit-form-schema";

function getVariantLabel(index: number): string {
  return index === 0 ? "시안 A" : index === 1 ? "시안 B" : `시안 ${index + 1}`;
}

function payloadForRenderer(payloadJson: string): LandingPayload {
  let p: Record<string, unknown> = {};
  try {
    p = JSON.parse(payloadJson || "{}");
  } catch {
    return {};
  }
  const ctaLabel = p.ctaLabel as string | undefined;
  const cta = p.cta as { label?: string } | undefined;
  const label = (cta?.label ?? ctaLabel) ?? "";
  return {
    title: (p.title as string) ?? "Welcome",
    subtitle: p.subtitle as string | undefined,
    cards: Array.isArray(p.cards) ? p.cards : undefined,
    cta: label ? { label } : undefined,
  };
}

export function VariantPreviewEditSection() {
  const { watch } = useFormContext<EditExperimentFormValues>();
  const variants = watch("variants");
  const [activeIndex, setActiveIndex] = useState(0);

  if (!variants?.length) return null;

  const payload = payloadForRenderer(variants[activeIndex]?.payloadJson ?? "{}");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">사용자 화면 미리보기</h3>
            <p className="text-sm text-muted-foreground">
              입력한 내용이 실제로 어떻게 보이는지 확인하세요.
            </p>
          </div>
          <div className="flex gap-2">
            {variants.map((_, i) => (
              <Button
                key={i}
                type="button"
                variant={activeIndex === i ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveIndex(i)}
              >
                {getVariantLabel(i)} 미리보기
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-card/50 p-6 min-h-[200px]">
          <LandingRenderer payload={payload} />
        </div>
      </CardContent>
    </Card>
  );
}
