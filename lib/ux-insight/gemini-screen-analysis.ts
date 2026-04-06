import { coerceUxScreenAnalysisRaw } from "@/lib/ux-insight/coerce-ux-screen-analysis";
import { extractJsonObjectFromModelText } from "@/lib/ux-insight/parse-model-json";
import { buildUxTheoriesSystemPrompt } from "@/lib/ux-insight/theories-system-prompt";
import { generateUxInsightJson } from "@/lib/ux-insight/gemini-vision";
import { getUxScreenAnalysisGeminiJsonSchema } from "@/lib/ux-insight/ux-screen-analysis-response-schema";
import { buildLayeredAuditJsonBlock } from "@/lib/ux-insight/layered-audit-prompt";
import { parseUxAuditLayers } from "@/lib/ux-insight/layered-audit-v1";
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
- ux_analysis_run_id, ux_lens_id 는 생략하거나 null 로 두세요 (서버가 채움).
- screen_id, screen_name, url_or_path 는 위 메타 값을 그대로 사용하세요.
- visual_analysis: { "layout", "color", "font" } 각각 문자열로 전문가 톤 서술.
- usability_issues: 배열. 각 원소는 ux_issue_summary 필수. **반드시** 문제가 두드러지는 UI 요소에 대해 ux_pin_x_pct, ux_pin_y_pct 를 0~100(화면 표시 박스 기준, 좌상단 원점)으로 포함.
- 각 이슈는 서술 순서를 지키세요: (1) ux_issue_as_is 현재 문제 (2) ux_theory_explained 는 NH-03 같은 코드 없이 한글로 이론 설명 (3) ux_to_be_hint 목표 개선 방향. 기존 ux_issue_detail·ux_evidence에 근거 ID를 괄호로 넣어도 됨(후처리 시 이름으로 치환됨).
- ux_good_practices: 배열(1개 이상 권장). 잘된 UI/라이팅에 녹색 핀. 각 원소: ux_good_summary, ux_pin_x_pct, ux_pin_y_pct(필수), 선택 ux_good_detail, ux_good_id.
- user_pain_points: 배열. 반드시 1개 이상 원소. 첫 원소는 위 페르소나를 요약한 ux_persona_label 과 해당 관점의 ux_pain_points(문자열 배열).
- improvement_suggestions: 배열. 각 원소는 ux_suggestion 필수, 선택 ux_rationale, ux_priority, ux_related_issue_id.

근거 라이브러리 ID는 내부 추적용으로 ux_issue_detail·ux_evidence에 (예: NH-05) 병기 가능하나, ux_theory_explained에는 **코드 없이** 사용자가 읽을 문장만 쓰세요.

${buildLayeredAuditJsonBlock("screen")}`;
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

  let rawText: string;
  try {
    rawText = await generateUxInsightJson({
      systemInstruction: systemPrompt,
      userText: userPrompt,
      images: [
        {
          mimeType: params.imageMediaType,
          dataBase64: params.imageBase64,
        },
      ],
      responseJsonSchema: getUxScreenAnalysisGeminiJsonSchema(),
      maxOutputTokens: 12288,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const m = msg.toLowerCase();
    const schemaLikelyRejected =
      m.includes("schema") ||
      m.includes("invalid_argument") ||
      m.includes("invalidargument");
    if (schemaLikelyRejected) {
      console.warn(
        "[ux-insight] Gemini call with responseJsonSchema failed, retrying without schema:",
        msg
      );
      rawText = await generateUxInsightJson({
        systemInstruction: systemPrompt,
        userText: userPrompt,
        images: [
          {
            mimeType: params.imageMediaType,
            dataBase64: params.imageBase64,
          },
        ],
        maxOutputTokens: 12288,
      });
    } else {
      throw e;
    }
  }

  let extracted: Record<string, unknown>;
  try {
    extracted = extractJsonObjectFromModelText(rawText);
  } catch (e) {
    console.error("[ux-insight] Gemini output (truncated):", rawText.slice(0, 2000));
    throw new Error(
      e instanceof Error ? e.message : "Invalid model JSON output"
    );
  }

  let data: Record<string, unknown>;
  try {
    data = coerceUxScreenAnalysisRaw(extracted);
  } catch (e) {
    console.error("[ux-insight] coerce failed, raw keys:", Object.keys(extracted));
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

  const layersRaw = data["ux_audit_layers"];
  delete data["ux_audit_layers"];

  const parsed = parseUxScreenAnalysisV1(data);
  if (!parsed.ok) {
    const flat = parsed.error.flatten();
    console.error("[ux-insight] zod:", flat);
    const fieldKeys = Object.keys(flat.fieldErrors).filter(
      (k) => (flat.fieldErrors[k]?.length ?? 0) > 0
    );
    const hint =
      fieldKeys.length > 0
        ? ` (필드: ${fieldKeys.slice(0, 6).join(", ")})`
        : "";
    throw new Error(
      `AI 응답 JSON이 규격과 맞지 않습니다.${hint} 잠시 후 다시 시도하거나 이미지를 줄여 보세요.`
    );
  }

  let out: UxScreenAnalysisV1 = { ...parsed.data };
  if (layersRaw !== undefined) {
    const lp = parseUxAuditLayers(layersRaw);
    if (lp.ok) {
      out = { ...out, ux_audit_layers: lp.data };
    } else {
      console.warn("[ux-insight] ux_audit_layers parse skipped:", lp.error.flatten());
    }
  }
  return out;
}
