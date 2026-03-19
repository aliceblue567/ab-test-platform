/**
 * 이벤트 전송 유틸
 */

export type TrackEventParams = {
  experimentId: string;
  variantKey: string;
  userKey: string;
  sessionKey?: string;
  eventName: string;
  eventValue?: number;
  metadata?: Record<string, string | number | boolean>;
};

export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experimentId: params.experimentId,
        variantKey: params.variantKey,
        userKey: params.userKey,
        sessionKey: params.sessionKey,
        eventName: params.eventName,
        eventValue: params.eventValue,
        metadata: params.metadata,
      }),
    });
  } catch {
    // 실패 시 무시 (분석용)
  }
}
