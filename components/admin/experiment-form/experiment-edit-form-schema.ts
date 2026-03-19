import { z } from "zod";

const primaryGoalKeySchema = z.enum([
  "cta_click_rate",
  "card_click_rate",
  "detail_view_rate",
  "bounce_reduction",
  "custom",
]);

export const editExperimentFormSchema = z.object({
  name: z.string().min(1, "실험 이름은 필수입니다").max(256),
  description: z.string().max(2000).optional(),
  primaryGoalKey: primaryGoalKeySchema.optional().nullable(),
  primaryGoalCustom: z.string().max(256).optional().nullable(),
  trafficAllocation: z.coerce.number().min(0).max(100),
  variants: z.array(
    z.object({
      id: z.string(),
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
      isControl: z.boolean(),
    })
  ),
});

export type EditExperimentFormValues = z.infer<typeof editExperimentFormSchema>;
