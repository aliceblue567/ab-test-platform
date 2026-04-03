import { extractJsonObjectFromModelText } from "@/lib/ux-insight/parse-model-json";
import { buildUxTheoriesSystemPrompt } from "@/lib/ux-insight/theories-system-prompt";
import { generateUxInsightJson } from "@/lib/ux-insight/gemini-vision";
import {
  parseUxScreenAnalysisV1,
  type UxScreenAnalysisV1,
  UX_SCREEN_ANALYSIS_SCHEMA_VERSION,
} from "@/lib/ux-insight/screen-analysis-v1";

const UX_SCHEMA_VERSION = UX_SCREEN_ANALYSIS_SCHEMA_VERSION;

function buildUserPrompt(params: {
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  screenId: string;
  screenName: string;
  urlOrPath: string;
}): string {
  return `다음 페르소나 관점에서 첨부 스크린샷(또는 UI 이미지)을 분석하세요.

[페르소나]
- 연령: ${params.personaAge}
- 디지털 숙련도: ${params.personaProficiency}
- 목적/맥락: ${params.personaGoal}

[화면 메타]
- screen_id: ${params.screenId}
- screen_name: ${params.screenName}
- url_or_path: ${params.urlOrPath}

반드시 아래 JSON 객체만 반환하세요. 키 이름과 중첩 구조를 정확히 지키세요.
- ux_schema_version: "${UX_SCHEMA_VERSION}"
- ux_analysis_run_id, ux_lens_id 는 null 로 두세요 (서버가 채움).
- screen_id, screen_name, url_or_path 는 위 메타 값을 그대로 사용하세요.
- visual_analysis: { "layout", "color", "font" } 각각 문자열로 전문가 톤 서술.
- usability_issues: 배열. 각 원소는 ux_issue_summary 필수, 선택적으로 ux_issue_detail, ux_severity(high|medium|low), ux_category, ux_evidence, ux_issue_id.
- user_pain_points: 배열. 반드시 1개 이상 원소. 첫 원소는 위 페르소나를 요약한 ux_persona_label 과 해당 관점의 ux_pain_points(문자열 배열).
- improvement_suggestions: 배열. 각 원소는 ux_suggestion 필수, 선택 ux_rationale, ux_priority, ux_related_issue_id.

근거 라이브러리의 ID를 ux_issue_detail 또는 ux_evidence 안에 (예: [NH-05,TP-05]) 형태로 인용하세요.`;
}

export async function runGeminiScreenAnalysis(params: {
  imageBase64: string;
  imageMediaType: string;
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  screenId: string;
  screenName: string;
  urlOrPath: string;
}): Promise<UxScreenAnalysisV1> {
  const systemPrompt = buildUxTheoriesSystemPrompt();
  const userPrompt = buildUserPrompt({
    personaAge: params.personaAge,
    personaProficiency: params.personaProficiency,
    personaGoal: params.personaGoal,
    screenId: params.screenId,
    screenName: params.screenName,
    urlOrPath: params.urlOrPath,
  });

  const rawText = await generateUxInsightJson({
    systemInstruction: systemPrompt,
    userText: userPrompt,
    images: [
      {
        mimeType: params.imageMediaType,
        dataBase64: params.imageBase64,
      },
    ],
  });

  let data: Record<string, unknown>;
  try {
    data = extractJsonObjectFromModelText(rawText);
  } catch (e) {
    console.error("[ux-insight] Gemini output (truncated):", rawText.slice(0, 2000));
    throw new Error(
      e instanceof Error ? e.message : "Invalid model JSON output"
    );
  }

  const runId = crypto.randomUUID();
  data.ux_analysis_run_id = data.ux_analysis_run_id ?? runId;
  data.ux_schema_version = UX_SCHEMA_VERSION;
  data.screen_id = params.screenId;
  data.screen_name = params.screenName;
  data.url_or_path = params.urlOrPath;

  const parsed = parseUxScreenAnalysisV1(data);
  if (!parsed.ok) {
    console.error("[ux-insight] zod:", parsed.error.flatten());
    throw new Error("Model output does not match ux screen analysis schema");
  }
  return parsed.data;
}
