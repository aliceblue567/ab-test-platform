import { extractJsonObjectFromModelText } from "@/lib/ux-insight/parse-model-json";
import { buildUxTheoriesSystemPrompt } from "@/lib/ux-insight/theories-system-prompt";
import { generateUxInsightJson } from "@/lib/ux-insight/gemini-vision";
import {
  UX_FLOW_SCHEMA_VERSION,
  parseUxFlowAnalysisV1,
  type UxFlowAnalysisV1,
} from "@/lib/ux-insight/flow-analysis-v1";

function buildUserPrompt(params: {
  stepCount: number;
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  flowTitle: string;
}): string {
  return `첨부 이미지는 시간 순서대로 **한 유저 플로우의 연속 화면**입니다. 왼쪽부터 0번이 첫 화면, ${params.stepCount - 1}번이 마지막입니다.

[페르소나]
- 연령: ${params.personaAge}
- 디지털 숙련도: ${params.personaProficiency}
- 목적: ${params.personaGoal}

[플로우 제목]
${params.flowTitle}

반드시 아래 JSON만 출력하세요.

스키마 (추가 키 금지):
- ux_flow_schema_version: "${UX_FLOW_SCHEMA_VERSION}"
- ux_analysis_run_id: null
- ux_flow_title: 짧은 플로우 이름
- ux_steps: 길이 ${params.stepCount}, 각 원소 {{ ux_step_index: 0..${params.stepCount - 1}, ux_step_label, ux_one_line_summary }}
- ux_transitions: 길이 ${params.stepCount - 1}, i번째는 {{ ux_from_step: i, ux_to_step: i+1, ux_friction_summary, ux_friction_score(1~5, 5가 가장 심한 마찰), ux_psychological_dimensions: {{ ux_expectation_gap, ux_cognitive_spike, ux_emotional_friction }} 각 1~5(5가 문제 심각), ux_theory_note(선택) }}
- ux_flow_metrics: {{ ux_seamlessness_index: 0~100(높을수록 매끄러움), ux_worst_transition_to_step: 마찰 최대 구간의 to_step 정수 또는 null, ux_executive_summary }}

이론 ID는 friction_summary나 theory_note에 [NH-01,LUX-HICK] 형태로 넣으세요.`;
}

export async function runGeminiFlowAnalysis(params: {
  images: { base64: string; mediaType: string }[];
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  flowTitle: string;
}): Promise<UxFlowAnalysisV1> {
  if (params.images.length < 2) {
    throw new Error("At least 2 images required for flow analysis");
  }
  if (params.images.length > 8) {
    throw new Error("Maximum 8 images per flow");
  }

  const systemPrompt = buildUxTheoriesSystemPrompt();
  const userPrompt = buildUserPrompt({
    stepCount: params.images.length,
    personaAge: params.personaAge,
    personaProficiency: params.personaProficiency,
    personaGoal: params.personaGoal,
    flowTitle: params.flowTitle,
  });

  const images = params.images.map((img) => {
    const mime =
      img.mediaType && img.mediaType !== "application/octet-stream"
        ? img.mediaType
        : "image/png";
    return { mimeType: mime, dataBase64: img.base64 };
  });

  const rawText = await generateUxInsightJson({
    systemInstruction: systemPrompt,
    userText: userPrompt,
    images,
    temperature: 0.25,
    maxOutputTokens: 8192,
  });

  let data: Record<string, unknown>;
  try {
    data = extractJsonObjectFromModelText(rawText);
  } catch (e) {
    console.error("[ux-flow] model output (truncated):", rawText.slice(0, 2000));
    throw new Error(
      e instanceof Error ? e.message : "Invalid model JSON output"
    );
  }

  data.ux_analysis_run_id = data.ux_analysis_run_id ?? crypto.randomUUID();
  data.ux_flow_schema_version = UX_FLOW_SCHEMA_VERSION;

  const parsed = parseUxFlowAnalysisV1(data);
  if (!parsed.ok) {
    console.error("[ux-flow] zod:", parsed.error.flatten());
    throw new Error("Model output does not match ux flow analysis schema");
  }
  return parsed.data;
}
