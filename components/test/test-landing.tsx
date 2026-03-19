"use client";

import { useEffect, useState, useCallback } from "react";
import { getOrCreateUserKey, getOrCreateSessionKey } from "@/lib/test/user-key";
import { trackEvent } from "@/lib/test/event-sender";
import { LandingRenderer } from "./landing-renderer";
import type { LandingPayload } from "@/types/test-payload";

type AssignmentResult = {
  experimentId: string;
  variantId: string;
  variantKey: string;
  payload: LandingPayload;
};

type TestLandingProps = {
  experimentSlug: string;
};

export function TestLanding({ experimentSlug }: TestLandingProps) {
  const [assignment, setAssignment] = useState<AssignmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  useEffect(() => {
    const uKey = getOrCreateUserKey();
    const sKey = getOrCreateSessionKey();
    setUserKey(uKey);
    setSessionKey(sKey);

    fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experimentKey: experimentSlug,
        userKey: uKey,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("실험을 찾을 수 없습니다.");
          if (res.status === 409) throw new Error("실험이 실행 중이 아닙니다.");
          throw new Error("할당에 실패했습니다.");
        }
        return res.json();
      })
      .then((data) => {
        setAssignment({
          experimentId: data.experimentId,
          variantId: data.variantId,
          variantKey: data.variantKey,
          payload: (data.payload ?? {}) as LandingPayload,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "오류가 발생했습니다."));
  }, [experimentSlug]);

  useEffect(() => {
    if (!assignment || !userKey) return;

    trackEvent({
      experimentId: assignment.experimentId,
      variantKey: assignment.variantKey,
      userKey,
      sessionKey: sessionKey ?? undefined,
      eventName: "view_landing",
    });
  }, [assignment, userKey, sessionKey]);

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!assignment || !userKey) return;
      trackEvent({
        experimentId: assignment.experimentId,
        variantKey: assignment.variantKey,
        userKey,
        sessionKey: sessionKey ?? undefined,
        eventName: "card_click",
        metadata: { cardId },
      });
    },
    [assignment, userKey, sessionKey]
  );

  const handleDetailView = useCallback(
    (cardId: string) => {
      if (!assignment || !userKey) return;
      trackEvent({
        experimentId: assignment.experimentId,
        variantKey: assignment.variantKey,
        userKey,
        sessionKey: sessionKey ?? undefined,
        eventName: "detail_view",
        metadata: { cardId },
      });
    },
    [assignment, userKey, sessionKey]
  );

  const handleCtaClick = useCallback(() => {
    if (!assignment || !userKey) return;
    trackEvent({
      experimentId: assignment.experimentId,
      variantKey: assignment.variantKey,
      userKey,
      sessionKey: sessionKey ?? undefined,
      eventName: "cta_click",
    });
  }, [assignment, userKey, sessionKey]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <LandingRenderer
      payload={assignment.payload}
      onCardClick={handleCardClick}
      onDetailView={handleDetailView}
      onCtaClick={handleCtaClick}
    />
  );
}
