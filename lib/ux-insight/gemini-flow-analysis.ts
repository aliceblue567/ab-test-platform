import { buildLayeredAuditJsonBlock } from "@/lib/ux-insight/layered-audit-prompt";
import { parseUxAuditLayers } from "@/lib/ux-insight/layered-audit-v1";
import { coerceUxFlowRaw } from "@/lib/ux-insight/coerce-ux-flow";
import { extractJsonObjectFromModelText } from "@/lib/ux-insight/parse-model-json";
import { buildFlowPsychologyFrameworkPrompt } from "@/lib/ux-insight/flow-psychology-prompt";
import { buildUxTheoriesSystemPrompt } from "@/lib/ux-insight/theories-system-prompt";
import { generateUxInsightJson } from "@/lib/ux-insight/gemini-vision";
import { sanitizePersonaTextForApi } from "@/lib/ux-insight/sanitize-prompt";
import {
  UX_FLOW_SCHEMA_VERSION,
  parseUxFlowAnalysisV1,
  type UxFlowAnalysisV1,
} from "@/lib/ux-insight/flow-analysis-v1";

/** 2단계 분석은 환경 변수로만 켭니다(기본 off — 응답 불안정·잘림 시 실패가 잦음). UX_FLOW_TWO_STEP=true */
const USE_TWO_STEP =
  process.env.UX_FLOW_TWO_STEP === "true" ||
  process.env.UX_FLOW_TWO_STEP === "1";

function buildSystemPrompt(): string {
  return `${buildUxTheoriesSystemPrompt()}

${buildFlowPsychologyFrameworkPrompt()}`;
}

function buildFinalJsonInstructions(params: {
  stepCount: number;
}): string {
  const n = params.stepCount;
  return `반드시 아래 JSON만 출력하세요.

스키마 (추가 루트 키 금지):
- ux_flow_schema_version: "${UX_FLOW_SCHEMA_VERSION}"
- ux_analysis_run_id: null
- ux_project_id: null 또는 생략
- ux_flow_title: 짧은 플로우 이름
- ux_steps: 길이 ${n}, 각 원소 {{ ux_step_index: 0..${n - 1}, ux_step_label, ux_one_line_summary }}
- ux_transitions: 길이 ${n - 1}, i번째는 {{ ux_from_step: i, ux_to_step: i+1, ux_friction_summary, ux_friction_score(1~5, 5가 가장 심한 마찰), ux_psychological_dimensions: {{ ux_expectation_gap, ux_cognitive_spike, ux_emotional_friction }} 각 1~5(5가 문제 심각), ux_theory_note(선택) }}
- ux_flow_metrics: {{ ux_seamlessness_index: 0~100(높을수록 매끄러움), ux_worst_transition_to_step: 마찰 최대 구간의 to_step 정수 또는 null, ux_executive_summary }}
- ux_flow_hotspots(선택): {{ ux_step_index, x_pct, y_pct(0~100), ux_note, ux_related_transition_from?, ux_related_transition_to? }} 배열

이론 ID는 friction_summary나 theory_note에 [NH-01,LUX-HICK] 형태로 넣으세요.

${buildLayeredAuditJsonBlock("flow", { flowStepCount: n })}`;
}

function buildUserPrompt(params: {
  stepCount: number;
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  flowTitle: string;
}): string {
  const stepCount = params.stepCount;
  return `첨부 이미지는 시간 순서대로 **한 유저 플로우의 연속 화면**입니다. 왼쪽부터 0번이 첫 화면, ${stepCount - 1}번이 마지막입니다.

[페르소나]
- 연령: ${params.personaAge}
- 디지털 숙련도: ${params.personaProficiency}
- 목적: ${params.personaGoal}

[플로우 제목]
${params.flowTitle}

${buildFinalJsonInstructions({ stepCount })}`;
}

function buildPrepUserPrompt(params: {
  stepCount: number;
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  flowTitle: string;
}): string {
  const n = params.stepCount;
  return `첨부 이미지는 0..${n - 1} 순서의 한 유저 플로우입니다.

[페르소나] 연령 ${params.personaAge}, 숙련도 ${params.personaProficiency}, 목적: ${params.personaGoal}
[제목] ${params.flowTitle}

**1단계:** 시각 증거만으로 중간 분석 JSON **한 덩어리**만 출력하세요. 루트 키는 정확히:
{
  "ux_prep_version": "1.0",
  "per_screen": [ { "i": 0, "label_guess": "", "one_line": "", "continuity_with_prev": "", "cognitive_load": "" } ... 길이 ${n} ],
  "per_transition": [ { "from": 0, "to": 1, "friction_hypothesis": "", "behavioral_principles": "" } ... 길이 ${n - 1} ],
  "behavioral_paragraph": "Peak-End, Zeigarnik, Knowledge in the World 관점 한 문단"
}
per_screen 요소는 i=0..${n - 1} 각각 하나씩. per_transition은 연속 화면 쌍마다 하나. 마크다운·코드펜스 금지.`;
}

function mergeFlowWithProjectId(
  data: Record<string, unknown>,
  projectId?: string | null
): void {
  data.ux_analysis_run_id = data.ux_analysis_run_id ?? crypto.randomUUID();
  data.ux_flow_schema_version = UX_FLOW_SCHEMA_VERSION;
  if (projectId?.trim()) {
    data.ux_project_id = projectId.trim();
  }
}

export async function runGeminiFlowAnalysis(params: {
  images: { base64: string; mediaType: string }[];
  personaAge: string;
  personaProficiency: string;
  personaGoal: string;
  flowTitle: string;
  uxProjectId?: string | null;
}): Promise<UxFlowAnalysisV1> {
  if (params.images.length < 2) {
    throw new Error("At least 2 images required for flow analysis");
  }
  if (params.images.length > 8) {
    throw new Error("Maximum 8 images per flow");
  }

  const personaAge = sanitizePersonaTextForApi(params.personaAge);
  const personaProficiency = sanitizePersonaTextForApi(
    params.personaProficiency
  );
  const personaGoal = sanitizePersonaTextForApi(params.personaGoal);
  const flowTitle = sanitizePersonaTextForApi(params.flowTitle) || "유저 플로우";

  const systemPrompt = buildSystemPrompt();
  const images = params.images.map((img) => {
    const mime =
      img.mediaType && img.mediaType !== "application/octet-stream"
        ? img.mediaType
        : "image/png";
    return { mimeType: mime, dataBase64: img.base64 };
  });

  const commonUser = {
    stepCount: params.images.length,
    personaAge,
    personaProficiency,
    personaGoal,
    flowTitle,
  };

  let rawText: string;

  if (USE_TWO_STEP) {
    try {
      const prepPrompt = buildPrepUserPrompt(commonUser);
      const prepRaw = await generateUxInsightJson({
        systemInstruction: systemPrompt,
        userText: prepPrompt,
        images,
        temperature: 0.2,
        maxOutputTokens: 8192,
      });
      const prepObj = extractJsonObjectFromModelText(prepRaw);
      const finalizeUser = `${buildFinalJsonInstructions({ stepCount: commonUser.stepCount })}

아래 JSON은 **같은 플로우**에 대한 1단계(이미지 기반) 중간 분석입니다. 이미지는 첨부되지 않았으니 **이 JSON만** 근거로 위 스키마의 최종 결과를 출력하세요.

${JSON.stringify(prepObj)}`;
      rawText = await generateUxInsightJson({
        systemInstruction: systemPrompt,
        userText: finalizeUser,
        images: [],
        temperature: 0.2,
        maxOutputTokens: 16384,
      });
    } catch (e) {
      console.warn("[ux-flow] two-step path failed, one-shot fallback:", e);
      rawText = await generateUxInsightJson({
        systemInstruction: systemPrompt,
        userText: buildUserPrompt(commonUser),
        images,
        temperature: 0.25,
        maxOutputTokens: 16384,
      });
    }
  } else {
    rawText = await generateUxInsightJson({
      systemInstruction: systemPrompt,
      userText: buildUserPrompt(commonUser),
      images,
      temperature: 0.25,
      maxOutputTokens: 16384,
    });
  }

  let extracted: Record<string, unknown>;
  try {
    extracted = extractJsonObjectFromModelText(rawText);
  } catch (e) {
    console.error("[ux-flow] model output (truncated):", rawText.slice(0, 2000));
    throw new Error(
      e instanceof Error ? e.message : "Invalid model JSON output"
    );
  }

  let data: Record<string, unknown>;
  try {
    data = coerceUxFlowRaw(extracted, params.images.length);
  } catch (e) {
    console.error("[ux-flow] coerce failed keys:", Object.keys(extracted));
    throw new Error(
      e instanceof Error ? e.message : "Invalid model JSON output"
    );
  }

  const layersRaw = data["ux_audit_layers"];
  delete data["ux_audit_layers"];

  mergeFlowWithProjectId(data, params.uxProjectId ?? null);

  const parsed = parseUxFlowAnalysisV1(data);
  if (!parsed.ok) {
    const flat = parsed.error.flatten();
    console.error("[ux-flow] zod:", flat);
    const keys = Object.keys(flat.fieldErrors).filter(
      (k) => (flat.fieldErrors[k]?.length ?? 0) > 0
    );
    const hint = keys.length ? ` (필드: ${keys.slice(0, 8).join(", ")})` : "";
    throw new Error(
      `AI 플로우 JSON이 규격과 맞지 않습니다.${hint} 잠시 후 다시 시도해 주세요.`
    );
  }

  let out: UxFlowAnalysisV1 = { ...parsed.data };
  if (layersRaw !== undefined) {
    const lp = parseUxAuditLayers(layersRaw);
    if (lp.ok) {
      out = { ...out, ux_audit_layers: lp.data };
    } else {
      console.warn("[ux-flow] ux_audit_layers parse skipped:", lp.error.flatten());
    }
  }
  return out;
}
