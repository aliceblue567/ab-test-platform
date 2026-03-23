import { z } from "zod";
import { emptyToNull } from "@/lib/ux-writing/guideline-schemas";

export const guidelineImportRowSchema = z.object({
  category: z.string().trim().min(1).max(200),
  rule_name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(8000),
  example_bad: z.union([z.string().max(2000), z.null()]).optional(),
  example_good: z.union([z.string().max(2000), z.null()]).optional(),
});

export const guidelineImportPayloadSchema = z.object({
  items: z.array(guidelineImportRowSchema).min(1).max(2000),
});

export type GuidelineImportRow = z.infer<typeof guidelineImportRowSchema>;

/** 동일 rule_name은 뒤 행이 우선 */
export function dedupeByRuleName(
  items: GuidelineImportRow[]
): GuidelineImportRow[] {
  const map = new Map<string, GuidelineImportRow>();
  for (const item of items) {
    const key = item.rule_name.trim();
    map.set(key, {
      ...item,
      rule_name: key,
      category: item.category.trim(),
      description: item.description.trim(),
    });
  }
  return [...map.values()];
}

export function normalizeImportRow(raw: {
  category?: unknown;
  rule_name?: unknown;
  description?: unknown;
  example_bad?: unknown;
  example_good?: unknown;
}): GuidelineImportRow | null {
  const category = typeof raw.category === "string" ? raw.category.trim() : "";
  const rule_name =
    typeof raw.rule_name === "string" ? raw.rule_name.trim() : "";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  if (!category || !rule_name || !description) return null;

  const eb =
    raw.example_bad === undefined || raw.example_bad === null
      ? undefined
      : String(raw.example_bad);
  const eg =
    raw.example_good === undefined || raw.example_good === null
      ? undefined
      : String(raw.example_good);

  const parsed = guidelineImportRowSchema.safeParse({
    category,
    rule_name,
    description,
    example_bad: eb === undefined ? undefined : emptyToNull(eb),
    example_good: eg === undefined ? undefined : emptyToNull(eg),
  });
  return parsed.success ? parsed.data : null;
}
