import { z } from "zod";

export function emptyToNull(s: string | null | undefined): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

export const createGuidelineSchema = z.object({
  category: z.string().min(1, "카테고리를 입력하세요").max(200),
  rule_name: z.string().min(1, "규칙 이름을 입력하세요").max(200),
  description: z.string().min(1, "설명을 입력하세요").max(8000),
  example_bad: z.string().max(2000).nullable().optional(),
  example_good: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

export const updateGuidelineSchema = z
  .object({
    category: z.string().min(1).max(200).optional(),
    rule_name: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(8000).optional(),
    example_bad: z.string().max(2000).nullable().optional(),
    example_good: z.string().max(2000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "수정할 필드가 없습니다.",
  });

export type CreateGuidelineInput = z.infer<typeof createGuidelineSchema>;
export type UpdateGuidelineInput = z.infer<typeof updateGuidelineSchema>;

export function normalizeExamples(
  example_bad: string | null | undefined,
  example_good: string | null | undefined
) {
  return {
    example_bad: emptyToNull(example_bad ?? null),
    example_good: emptyToNull(example_good ?? null),
  };
}
