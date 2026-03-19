"use client";

import Link from "next/link";
import type { CTAPayload } from "@/types/test-payload";

type CTASectionProps = {
  cta: CTAPayload;
  onCtaClick?: () => void;
};

/**
 * CTA는 payload.cta.enabled, payload.cta.visible 규칙에 따라 활성화
 * - enabled: false → 비활성화 (클릭 불가)
 * - visible: false → 숨김
 * - 둘 다 없으면 기본 활성화
 */
export function CTASection({ cta, onCtaClick }: CTASectionProps) {
  const isVisible = cta.visible !== false;
  const isEnabled = cta.enabled !== false;

  if (!isVisible) return null;

  const content = (
    <span
      className={`inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors ${
        isEnabled
          ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
      }`}
    >
      {cta.label}
    </span>
  );

  if (isEnabled && cta.url) {
    return (
      <Link href={cta.url} onClick={onCtaClick}>
        {content}
      </Link>
    );
  }

  if (isEnabled) {
    return (
      <button type="button" onClick={onCtaClick}>
        {content}
      </button>
    );
  }

  return <div>{content}</div>;
}
