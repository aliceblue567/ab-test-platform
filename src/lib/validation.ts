/**
 * Zod 스키마 - variant payload, event input 검증
 */
import { z } from "zod";

// ============ Variant Payload ============

/** JSON payload 내부 필드 제한 (XSS, 인젝션 방지) */
const payloadString = z
  .string()
  .max(10_000)
  .refine((s) => !/<script|javascript:|on\w+=/i.test(s), {
    message: "Invalid payload: potentially unsafe content",
  });

const payloadNumber = z.number().finite();
const payloadBoolean = z.boolean();
const payloadNull = z.null();

const payloadValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    payloadString,
    payloadNumber,
    payloadBoolean,
    payloadNull,
    z.array(payloadValue).max(100),
    z
      .record(z.string().max(100), payloadValue)
      .refine((obj) => Object.keys(obj).length <= 50, {
        message: "Payload object has too many keys",
      }),
  ])
);

/** Variant UI 렌더링용 JSON payload 스키마 */
export const variantPayloadSchema = z
  .record(z.string().max(100), payloadValue)
  .refine((obj) => Object.keys(obj).length <= 50, {
    message: "Payload has too many top-level keys",
  })
  .refine(
    (obj) => {
      const str = JSON.stringify(obj);
      return str.length <= 50_000;
    },
    { message: "Payload exceeds size limit" }
  );

export type VariantPayload = z.infer<typeof variantPayloadSchema>;

// ============ Event Input ============

const variantKeySchema = z.enum(["control", "variant_a", "variant_b"]);

export const eventInputSchema = z.object({
  experimentId: z.string().cuid(),
  variantKey: variantKeySchema,
  userKey: z
    .string()
    .min(1, "userKey is required")
    .max(256)
    .regex(/^[a-zA-Z0-9_-]+$/, "userKey contains invalid characters"),
  eventName: z
    .string()
    .min(1, "eventName is required")
    .max(128)
    .regex(/^[a-zA-Z0-9_.-]+$/, "eventName contains invalid characters"),
  eventValue: z.number().finite().optional(),
  sessionKey: z.string().max(256).optional(),
  metadata: z
    .record(z.string().max(64), z.union([z.string(), z.number(), z.boolean()]))
    .refine((obj) => Object.keys(obj).length <= 20, {
      message: "metadata has too many keys",
    })
    .optional(),
});

export type EventInput = z.infer<typeof eventInputSchema>;

// ============ Assignment Input ============

export const assignmentInputSchema = z.object({
  experimentKey: z.string().min(1).max(128),
  userKey: z
    .string()
    .min(1, "userKey is required")
    .max(256)
    .regex(/^[a-zA-Z0-9_-]+$/, "userKey contains invalid characters"),
  /** 외부 참가 링크 2차 보호 — 실험 또는 PARTICIPANT_LINK_REQUIRED 시 필수 */
  participantToken: z.string().min(1).max(4096).optional(),
});

export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

// ============ Experiment ============

const primaryGoalKeySchema = z.enum([
  "cta_click_rate",
  "card_click_rate",
  "detail_view_rate",
  "bounce_reduction",
  "custom",
]);

export const createExperimentSchema = z.object({
  key: z
    .string()
    .min(1, "key is required")
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/, "key contains invalid characters"),
  name: z.string().min(1, "name is required").max(256),
  description: z.string().max(2000).optional(),
  primaryGoalKey: primaryGoalKeySchema.optional(),
  primaryGoalCustom: z.string().max(256).optional(),
  trafficAllocation: z.number().min(0).max(100).optional(),
  requireParticipantLinkToken: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        key: z.enum(["control", "variant_a", "variant_b"]),
        name: z.string().min(1).max(128),
        weight: z.number().min(0).max(100),
        payload: variantPayloadSchema,
        isControl: z.boolean().optional(),
      })
    )
    .min(1, "at least one variant required")
    .max(10),
});

export const updateExperimentSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(2000).optional().nullable(),
  primaryGoalKey: primaryGoalKeySchema.optional().nullable(),
  primaryGoalCustom: z.string().max(256).optional().nullable(),
  trafficAllocation: z.number().min(0).max(100).optional(),
  requireParticipantLinkToken: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(128).optional(),
        weight: z.number().min(0).max(100).optional(),
        payload: variantPayloadSchema.optional(),
      })
    )
    .optional(),
});

export const experimentStatusSchema = z.object({
  status: z.enum(["draft", "running", "paused", "completed"]),
});

export const assignmentQuerySchema = z.object({
  experimentId: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().cuid().optional()
  ),
  userKey: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().min(1).max(256).optional()
  ),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const reportQuerySchema = z.object({
  event: z.string().min(1).max(128).optional(),
});
