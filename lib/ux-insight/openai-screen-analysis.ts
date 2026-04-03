import OpenAI from "openai";
import uxTheories from "@/constants/ux_theories.json";
import {
  parseUxScreenAnalysisV1,
  type UxScreenAnalysisV1,
  UX_SCREEN_ANALYSIS_SCHEMA_VERSION,
} from "@/lib/ux-insight/screen-analysis-v1";

const UX_SCHEMA_VERSION = UX_SCREEN_ANALYSIS_SCHEMA_VERSION;

function buildSystemPrompt(theoriesJson: string): string {
  return `당신은 시니어 UX 컨설턴트이자 여행·디지털 제품 사용성 연구원입니다.
아래 JSON은 팀 근거 라이브러리(닐슨 휴리스틱, Laws of UX, 행동경제 편향, 여행 심리, 확장 UX 이론)입니다. 분석 시 이 정의·analysis_criteria에 맞춰 판단하고, 근거 ID를 텍스트 안에 명시하세요.

인용 가능한 ID 예시:
- 닐슨: NH-01 … NH-10
- Laws of UX: LUX-JAKOB, LUX-FITTS, LUX-HICK, LUX-MILLER
- 행동편향: BE-SOCIAL-PROOF, BE-LOSS-AVERSION 등
- 여행 심리: TP-01 … TP-08
- 확장 UX: UXT-01 … UXT-07

출력 JSON에는 스키마에 정의된 키만 사용합니다. 추가 루트 키 금지.
usability_issues[].ux_issue_detail 또는 ux_evidence 끝에 [NH-05,TP-05]처럼 근거 ID를 붙이세요.

===== BEGIN UX_THEORIES_JSON =====
${theoriesJson}
===== END UX_THEORIES_JSON =====

응답은 순수 JSON 한 덩어리만 출력합니다. 마크다운 코드펜스·전후 설명 문장 금지.`;
}

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

function extractJsonObject(text: string): Record<string, unknown> {
  let s = text.trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(s.slice(start, end + 1)) as Record<string, unknown>;
  }
  throw new Error("No JSON object found in model output");
}

export async function runOpenAiScreenAnalysis(params: {
  imageBase64: string;
  imageMediaType: string;
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  screenId: string;
  screenName: string;
  urlOrPath: string;
}): Promise<UxScreenAnalysisV1> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o";
  const client = new OpenAI({ apiKey });

  const theoriesJson = JSON.stringify(uxTheories);
  const systemPrompt = buildSystemPrompt(theoriesJson);
  const userPrompt = buildUserPrompt({
    personaAge: params.personaAge,
    personaProficiency: params.personaProficiency,
    personaGoal: params.personaGoal,
    screenId: params.screenId,
    screenName: params.screenName,
    urlOrPath: params.urlOrPath,
  });

  const mime =
    params.imageMediaType && params.imageMediaType !== "application/octet-stream"
      ? params.imageMediaType
      : "image/png";
  const dataUrl = `data:${mime};base64,${params.imageBase64}`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const rawText = completion.choices[0]?.message?.content ?? "";
  let data: Record<string, unknown>;
  try {
    data = extractJsonObject(rawText);
  } catch (e) {
    console.error("[ux-insight] model output (truncated):", rawText.slice(0, 2000));
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
