"use client";

import { InfoCard } from "./info-card";
import { CTASection } from "./cta-section";
import type { LandingPayload } from "@/types/test-payload";

type LandingRendererProps = {
  payload: LandingPayload;
  onCardClick?: (cardId: string) => void;
  onDetailView?: (cardId: string) => void;
  onCtaClick?: () => void;
};

/**
 * Variant payload 기반 랜딩 UI 렌더링
 */
export function LandingRenderer({
  payload,
  onCardClick,
  onDetailView,
  onCtaClick,
}: LandingRendererProps) {
  const title = payload.title ?? "Welcome";
  const subtitle = payload.subtitle;
  const cards = Array.isArray(payload.cards) ? payload.cards : [];
  const cta = payload.cta;
  const figmaUrl = payload.figmaUrl;
  const imageUrl = payload.imageUrl;

  const figmaEmbedUrl = figmaUrl
    ? `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(figmaUrl)}`
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        )}
      </header>

      {imageUrl && (
        <section className="flex justify-center">
          <div className="rounded-lg overflow-hidden border border-border w-full max-w-xl">
            <img
              src={imageUrl}
              alt="시안"
              className="w-full h-auto object-contain"
            />
          </div>
        </section>
      )}

      {figmaEmbedUrl && (
        <section className="w-full">
          <div className="rounded-lg overflow-hidden border border-border aspect-video">
            <iframe
              src={figmaEmbedUrl}
              allowFullScreen
              className="w-full h-full min-h-[400px]"
              title="Figma 프로토타입"
            />
          </div>
        </section>
      )}

      {cards.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <InfoCard
              key={card.id}
              card={card}
              onCardClick={onCardClick}
              onDetailView={onDetailView}
            />
          ))}
        </section>
      )}

      {cta && (
        <section className="flex justify-center">
          <CTASection cta={cta} onCtaClick={onCtaClick} />
        </section>
      )}
    </div>
  );
}
