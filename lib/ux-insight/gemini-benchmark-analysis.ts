import { extractJsonObjectFromModelText } from "@/lib/ux-insight/parse-model-json";
import { buildUxTheoriesSystemPrompt } from "@/lib/ux-insight/theories-system-prompt";
import { generateUxInsightJson } from "@/lib/ux-insight/gemini-vision";
import {
  UX_BENCHMARK_MULTI_SCHEMA_VERSION,
  parseUxBenchmarkMultiReport,
  type UxBenchmarkMultiV1,
} from "@/lib/ux-insight/benchmark-analysis-multi-v1";

function buildUserPrompt(params: {
  variantLabels: string[];
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  context: string;
}): string {
  const n = params.variantLabels.length;
  const lines = params.variantLabels
    .map((label, i) => `${i + 1}번째 이미지 → **${label}**`)
    .join("\n");

  return `아래 첨부 이미지는 **총 ${n}장**이며, 위에서부터 순서대로 다음 서비스/화면과 **1:1 대응**합니다.

${lines}

동일 페르소나·동일 과업 전제로 **각 화면을 독립 평가**한 뒤, 서로 비교해 요약하세요.

[페르소나]
- 연령: ${params.personaAge}
- 숙련도: ${params.personaProficiency}
- 목적: ${params.personaGoal}

[비교 맥락]
${params.context}

반드시 아래 JSON만 출력 (추가 루트 키 금지):
- ux_benchmark_schema_version: "${UX_BENCHMARK_MULTI_SCHEMA_VERSION}"
- ux_analysis_run_id: null
- ux_comparison_context: 한 문단 비교 요약 (한국어)
- ux_variants: 길이 정확히 ${n}인 배열. i번째 원소는 i번째 이미지에 대응.
  각 원소: {
    "ux_label": 위 목록에서 **해당 순서의 서비스 이름과 완전히 동일한 문자열**,
    "ux_dimension_scores": {
      "usability", "visual_hierarchy", "trust_transparency", "task_efficiency", "consistency", "content_clarity"
      각각 1~5 정수 (5가 더 우수)
    },
    "ux_swot": { "strengths", "weaknesses", "opportunities", "threats" } 각각 문자열 배열 2~5개
  }
- ux_feature_matrix: (강력 권장) {
    "ux_features": 비교할 기능·요소 이름 문자열 배열 6~12개 (예: "필터 저장", "가격 총액 표시"),
    "ux_rows": 길이 ${n}, 각 행 { "ux_label": ux_variants와 동일 라벨, "ux_present": boolean 배열 (ux_features 길이와 동일) }
  }
  화면에서 확실하지 않은 항목은 false.

이론 ID는 문장 끝에 [NH-04] 등으로 넣을 수 있습니다. JSON 키 이름은 위와 **완전히 동일**하게.`;
}

export type BenchmarkVariantInput = {
  label: string;
  base64: string;
  mediaType: string;
};

/**
 * 단일 Gemini 멀티모달 호출로 N장을 한꺼번에 분석 (토큰·왕복 최소화).
 */
export async function runGeminiBenchmarkAnalysis(params: {
  variants: BenchmarkVariantInput[];
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  context: string;
}): Promise<UxBenchmarkMultiV1> {
  if (params.variants.length < 2 || params.variants.length > 8) {
    throw new Error("벤치마크는 2~8개 화면만 지원합니다.");
  }

  const systemPrompt = buildUxTheoriesSystemPrompt();
  const userPrompt = buildUserPrompt({
    variantLabels: params.variants.map((v) => v.label),
    personaAge: params.personaAge,
    personaProficiency: params.personaProficiency,
    personaGoal: params.personaGoal,
    context: params.context,
  });

  const images = params.variants.map((v) => {
    const mime =
      v.mediaType && v.mediaType !== "application/octet-stream"
        ? v.mediaType
        : "image/png";
    return { mimeType: mime, dataBase64: v.base64 };
  });

  const rawText = await generateUxInsightJson({
    systemInstruction: systemPrompt,
    userText: userPrompt,
    images,
    temperature: 0.25,
    maxOutputTokens: 12_288,
  });

  let data: Record<string, unknown>;
  try {
    data = extractJsonObjectFromModelText(rawText);
  } catch (e) {
    console.error(
      "[ux-bench] model output (truncated):",
      rawText.slice(0, 2000)
    );
    throw new Error(
      e instanceof Error ? e.message : "Invalid model JSON output"
    );
  }

  data.ux_analysis_run_id = data.ux_analysis_run_id ?? crypto.randomUUID();
  data.ux_benchmark_schema_version = UX_BENCHMARK_MULTI_SCHEMA_VERSION;

  const parsed = parseUxBenchmarkMultiReport(data);
  if (!parsed.ok) {
    console.error("[ux-bench] zod:", parsed.error.flatten());
    throw new Error("Model output does not match ux benchmark schema");
  }

  const out = parsed.data;
  if (out.ux_variants.length !== params.variants.length) {
    console.warn(
      `[ux-bench] variant count mismatch: model ${out.ux_variants.length} vs input ${params.variants.length}`
    );
  }

  return out;
}
