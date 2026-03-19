"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const ITEMS = [
  "CTA 클릭률 비교",
  "퍼널 전환 비교",
  "승자 시안 판단",
  "의사결정 메모",
] as const;

export function ResultInterpretationSection() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">결과에서 확인할 항목</h3>
        <p className="text-sm text-muted-foreground">
          실험 종료 후 리포트에서 아래 항목들을 확인할 수 있습니다.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500/70" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          리포트 페이지에서 상세 분석 결과를 확인하세요.
        </p>
      </CardContent>
    </Card>
  );
}
