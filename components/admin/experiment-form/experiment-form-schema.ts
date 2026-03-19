import { z } from "zod";

const variantPayloadSchema = z
  .record(z.unknown())
  .refine((obj) => Object.keys(obj).length <= 50, "Payload has too many keys")
  .refine(
    (obj) => JSON.stringify(obj).length <= 50_000,
    "Payload exceeds size limit"
  );

const primaryGoalKeySchema = z.enum([
  "cta_click_rate",
  "card_click_rate",
  "detail_view_rate",
  "bounce_reduction",
  "custom",
]);

export const createExperimentFormSchema = z.object({
  key: z
    .string()
    .min(1, "key는 필수입니다")
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/, "영문, 숫자, _, - 만 사용 가능합니다"),
  name: z.string().min(1, "실험 이름은 필수입니다").max(256),
  description: z.string().max(2000).optional(),
  primaryGoalKey: primaryGoalKeySchema.optional(),
  primaryGoalCustom: z.string().max(256).optional(),
  trafficAllocation: z.coerce.number().min(0).max(100).default(100),
  variants: z
    .array(
      z.object({
        key: z.enum(["control", "variant_a", "variant_b"]),
        name: z.string().min(1, "시안 이름은 필수입니다").max(128),
        weight: z.coerce.number().min(0).max(100),
        payloadJson: z.string().refine(
          (s) => {
            try {
              const parsed = JSON.parse(s);
              return typeof parsed === "object" && parsed !== null;
            } catch {
              return false;
            }
          },
          { message: "유효한 JSON을 입력하세요" }
        ),
        isControl: z.boolean().default(false),
      })
    )
    .min(1, "최소 1개의 시안이 필요합니다")
    .max(10),
});

export type CreateExperimentFormValues = z.infer<typeof createExperimentFormSchema>;
