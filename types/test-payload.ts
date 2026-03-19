/**
 * Variant payload 타입 (Landing UI)
 */

export type InfoCardPayload = {
  id: string;
  title: string;
  description?: string;
  [key: string]: unknown;
};

export type CTAPayload = {
  label: string;
  enabled?: boolean;
  visible?: boolean;
  url?: string;
  [key: string]: unknown;
};

export type LandingPayload = {
  title?: string;
  subtitle?: string;
  cards?: InfoCardPayload[];
  cta?: CTAPayload;
  [key: string]: unknown;
};
