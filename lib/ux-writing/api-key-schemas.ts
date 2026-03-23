import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1, "이름을 입력하세요").max(200),
});

export const updateApiKeySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "수정할 필드가 없습니다.",
  });
