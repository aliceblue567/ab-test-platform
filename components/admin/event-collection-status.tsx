"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

const EVENT_ITEMS = [
  { key: "view_landing", label: "랜딩 진입" },
  { key: "card_click", label: "카드 클릭" },
  { key: "detail_view", label: "상세 확인" },
  { key: "cta_click", label: "CTA 클릭" },
] as const;

type EventCollectionStatusProps = {
  experimentId?: string | null;
  /** 추후 report API 연동 시 사용 */
  eventCounts?: Record<string, number>;
};

export function EventCollectionStatus({
  experimentId,
  eventCounts,
}: EventCollectionStatusProps) {
  const hasData = eventCounts && Object.keys(eventCounts).length > 0;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">이벤트 수집 상태</h3>
        <p className="text-sm text-muted-foreground">
          실험이 시작되면 사용자 행동 데이터가 이 영역에 집계됩니다.
        </p>
      </CardHeader>
      <CardContent>
        {!experimentId ? (
          <p className="text-sm text-muted-foreground py-4">
            실험을 먼저 생성하고 실행하면 데이터가 표시됩니다.
          </p>
        ) : hasData ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {EVENT_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-muted-foreground">
                  {eventCounts[item.key] ?? 0}건
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {EVENT_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3 animate-pulse"
              >
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-12 rounded bg-muted" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              데이터 수집 중이거나 아직 이벤트가 없습니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
