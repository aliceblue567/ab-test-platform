import { extractJsonObjectFromModelText } from "@/lib/ux-insight/parse-model-json";
import { buildUxTheoriesSystemPrompt } from "@/lib/ux-insight/theories-system-prompt";
import { generateUxInsightJson } from "@/lib/ux-insight/gemini-vision";
import {
  UX_BENCHMARK_SCHEMA_VERSION,
  parseUxBenchmarkAnalysisV1,
  type UxBenchmarkAnalysisV1,
} from "@/lib/ux-insight/benchmark-analysis-v1";

function buildUserPrompt(params: {
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  context: string;
}): string {
  return `두 이미지를 비교합니다.
**첫 번째 첨부 이미지 = 자사(Our)** 제품 화면, **두 번째 첨부 이미지 = 타사(Competitor)** 제품 화면입니다. 동일한 페르소나 기준으로 평가하세요.

[페르소나]
- 연령: ${params.personaAge}
- 숙련도: ${params.personaProficiency}
- 목적: ${params.personaGoal}

[비교 맥락]
${params.context}

반드시 아래 JSON만 출력 (추가 키 금지):
- ux_benchmark_schema_version: "${UX_BENCHMARK_SCHEMA_VERSION}"
- ux_analysis_run_id: null
- ux_comparison_context: 한 문단 요약
- ux_dimension_scores: 각 키마다 {{ ux_ours, ux_competitor }} 1~5 정수 (5가 더 우수)
  키 목록: usability, visual_hierarchy, trust_transparency, task_efficiency, consistency, content_clarity
- ux_swot: {{ ux_ours: {{ strengths, weaknesses, opportunities, threats }} 각 문자열 배열 2~5개 권장, ux_competitor: 동일 구조 }}

SWOT은 **자사 vs 타사**를 대비해 실질적인 전략 문장으로 쓰세요.
이론 ID는 context나 항목 문장 끝에 [NH-04,TP-05] 형태로 넣을 수 있습니다.`;
}

export async function runGeminiBenchmarkAnalysis(params: {
  oursBase64: string;
  oursMediaType: string;
  competitorBase64: string;
  competitorMediaType: string;
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  context: string;
}): Promise<UxBenchmarkAnalysisV1> {
  const systemPrompt = buildUxTheoriesSystemPrompt();
  const userPrompt = buildUserPrompt({
    personaAge: params.personaAge,
    personaProficiency: params.personaProficiency,
    personaGoal: params.personaGoal,
    context: params.context,
  });

  const mimeO =
    params.oursMediaType && params.oursMediaType !== "application/octet-stream"
      ? params.oursMediaType
      : "image/png";
  const mimeC =
    params.competitorMediaType &&
    params.competitorMediaType !== "application/octet-stream"
      ? params.competitorMediaType
      : "image/png";

  const rawText = await generateUxInsightJson({
    systemInstruction: systemPrompt,
    userText: userPrompt,
    images: [
      { mimeType: mimeO, dataBase64: params.oursBase64 },
      { mimeType: mimeC, dataBase64: params.competitorBase64 },
    ],
    temperature: 0.25,
    maxOutputTokens: 8192,
  });

  let data: Record<string, unknown>;
  try {
    data = extractJsonObjectFromModelText(rawText);
  } catch (e) {
    console.error("[ux-bench] model output (truncated):", rawText.slice(0, 2000));
    throw new Error(
      e instanceof Error ? e.message : "Invalid model JSON output"
    );
  }

  data.ux_analysis_run_id = data.ux_analysis_run_id ?? crypto.randomUUID();
  data.ux_benchmark_schema_version = UX_BENCHMARK_SCHEMA_VERSION;

  const parsed = parseUxBenchmarkAnalysisV1(data);
  if (!parsed.ok) {
    console.error("[ux-bench] zod:", parsed.error.flatten());
    throw new Error("Model output does not match ux benchmark schema");
  }
  return parsed.data;
}
