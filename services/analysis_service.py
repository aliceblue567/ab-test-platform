"""
UX 화면 분석 API (FastAPI + OpenAI GPT-4o Vision).

실행 (저장소 루트에서):
  pip install -r services/requirements-analysis.txt
  export OPENAI_API_KEY=sk-...
  uvicorn services.analysis_service:app --host 0.0.0.0 --port 8088 --reload

환경 변수:
  OPENAI_API_KEY — 필수
  OPENAI_VISION_MODEL — 기본 gpt-4o
  UX_THEORIES_PATH — 기본: <repo>/constants/ux_theories.json
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_THEORIES_PATH = REPO_ROOT / "constants" / "ux_theories.json"
UX_SCHEMA_VERSION = "1.0.0"


# --- Pydantic: ux-screen-analysis v1 (schemas/ux-screen-analysis.v1.schema.json 정합) ---


class UxVisualAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    layout: str
    color: str
    font: str


class UxUsabilityIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ux_issue_id: str | None = None
    ux_issue_summary: str = Field(min_length=1)
    ux_issue_detail: str | None = None
    ux_severity: Literal["high", "medium", "low"] | None = None
    ux_category: str | None = None
    ux_evidence: str | None = None


class UxUserPainPointGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ux_persona_id: str | None = None
    ux_persona_label: str = Field(min_length=1)
    ux_pain_points: list[str] = Field(default_factory=list)


class UxImprovementSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ux_suggestion: str = Field(min_length=1)
    ux_rationale: str | None = None
    ux_priority: Literal["high", "medium", "low"] | None = None
    ux_related_issue_id: str | None = None


class UxScreenAnalysisV1(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ux_schema_version: Literal["1.0.0"] = UX_SCHEMA_VERSION
    ux_analysis_run_id: str | None = None
    ux_lens_id: str | None = None
    screen_id: str = Field(min_length=1)
    screen_name: str = Field(min_length=1)
    url_or_path: str
    visual_analysis: UxVisualAnalysis
    usability_issues: list[UxUsabilityIssue] = Field(default_factory=list)
    user_pain_points: list[UxUserPainPointGroup] = Field(default_factory=list)
    improvement_suggestions: list[UxImprovementSuggestion] = Field(
        default_factory=list
    )


# --- ux_theories.json 로드 ---


@lru_cache(maxsize=1)
def _load_ux_theories_raw() -> str:
    path = Path(os.environ.get("UX_THEORIES_PATH", str(DEFAULT_THEORIES_PATH)))
    if not path.is_file():
        raise FileNotFoundError(f"ux_theories.json not found: {path}")
    return path.read_text(encoding="utf-8")


def _build_system_prompt(theories_json: str) -> str:
    return f"""당신은 시니어 UX 컨설턴트이자 여행·디지털 제품 사용성 연구원입니다.
아래 JSON은 팀 근거 라이브러리(닐슨 휴리스틱, Laws of UX, 행동경제 편향, 여행 심리, 확장 UX 이론)입니다. 분석 시 이 정의·analysis_criteria에 맞춰 판단하고, 근거 ID를 텍스트 안에 명시하세요.

인용 가능한 ID 예시:
- 닐슨: NH-01 … NH-10
- Laws of UX: LUX-JAKOB, LUX-FITTS, LUX-HICK, LUX-MILLER
- 행동편향: BE-SOCIAL-PROOF, BE-LOSS-AVERSION 등
- 여행 심리: TP-01 … TP-08
- 확장 UX: UXT-01 … UXT-07

출력 JSON에는 **스키마에 정의된 키만** 사용합니다. 추가 루트 키 금지.
usability_issues[].ux_issue_detail 또는 ux_evidence 끝에 [NH-05,TP-05]처럼 근거 ID를 붙이세요.

===== BEGIN UX_THEORIES_JSON =====
{theories_json}
===== END UX_THEORIES_JSON =====

응답은 **순수 JSON 한 덩어리**만 출력합니다. 마크다운 코드펜스·전후 설명 문장 금지.
"""


def _build_user_prompt(
    *,
    persona_age: str,
    persona_proficiency: str,
    persona_goal: str,
    screen_id: str,
    screen_name: str,
    url_or_path: str,
) -> str:
    return f"""다음 페르소나 관점에서 첨부 스크린샷(또는 UI 이미지)을 분석하세요.

[페르소나]
- 연령: {persona_age}
- 디지털 숙련도: {persona_proficiency}
- 목적/맥락: {persona_goal}

[화면 메타]
- screen_id: {screen_id}
- screen_name: {screen_name}
- url_or_path: {url_or_path}

반드시 아래 JSON 객체만 반환하세요. 키 이름과 중첩 구조를 정확히 지키세요.
- ux_schema_version: "{UX_SCHEMA_VERSION}"
- ux_analysis_run_id, ux_lens_id 는 null 로 두세요 (서버가 채움).
- screen_id, screen_name, url_or_path 는 위 메타 값을 그대로 사용하세요.
- visual_analysis: {{ "layout", "color", "font" }} 각각 문자열로 전문가 톤 서술.
- usability_issues: 배열. 각 원소는 ux_issue_summary 필수, 선택적으로 ux_issue_detail, ux_severity(high|medium|low), ux_category, ux_evidence, ux_issue_id.
- user_pain_points: 배열. **반드시 1개 이상** 원소. 첫 원소는 위 페르소나를 요약한 ux_persona_label 과 해당 관점의 ux_pain_points(문자열 배열).
- improvement_suggestions: 배열. 각 원소는 ux_suggestion 필수, 선택 ux_rationale, ux_priority, ux_related_issue_id.

근거 라이브러리의 ID(NH-*, LUX-*, BE-*, TP-*, UXT-*)를 ux_issue_detail 또는 ux_evidence 안에 (예: [NH-05,TP-05]) 형태로 인용하세요.
"""


def _extract_json_object(text: str) -> dict[str, Any]:
    s = text.strip()
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)\s*```$", s, re.IGNORECASE)
    if fence:
        s = fence.group(1).strip()
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    start = s.find("{")
    end = s.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(s[start : end + 1])
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON parse failed: {e}") from e
    raise ValueError("No JSON object found in model output")


def analyze_screen_image(
    *,
    image_bytes: bytes,
    image_media_type: str,
    persona_age: str,
    persona_proficiency: str,
    persona_goal: str,
    screen_id: str,
    screen_name: str,
    url_or_path: str,
) -> UxScreenAnalysisV1:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    model = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o")
    client = OpenAI(api_key=api_key)
    theories = _load_ux_theories_raw()
    system_prompt = _build_system_prompt(theories)
    user_prompt = _build_user_prompt(
        persona_age=persona_age,
        persona_proficiency=persona_proficiency,
        persona_goal=persona_goal,
        screen_id=screen_id,
        screen_name=screen_name,
        url_or_path=url_or_path,
    )

    b64 = base64.b64encode(image_bytes).decode("ascii")
    if not image_media_type or image_media_type == "application/octet-stream":
        image_media_type = "image/png"
    data_url = f"data:{image_media_type};base64,{b64}"

    completion = client.chat.completions.create(
        model=model,
        temperature=0.3,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
    )

    raw_text = completion.choices[0].message.content or ""
    try:
        data = _extract_json_object(raw_text)
    except ValueError as e:
        logger.warning("Model output (truncated): %s", raw_text[:2000])
        raise RuntimeError(f"Invalid model JSON: {e}") from e

    run_id = str(uuid.uuid4())
    data["ux_analysis_run_id"] = data.get("ux_analysis_run_id") or run_id
    data["ux_schema_version"] = UX_SCHEMA_VERSION
    data["screen_id"] = screen_id
    data["screen_name"] = screen_name
    data["url_or_path"] = url_or_path

    try:
        return UxScreenAnalysisV1.model_validate(data)
    except Exception as e:
        logger.warning("Validation failed for: %s", json.dumps(data, ensure_ascii=False)[:3000])
        raise ValueError(f"Output does not match ux schema: {e}") from e


# --- FastAPI ---

app = FastAPI(
    title="UX Insight Analysis Service",
    description="GPT-4o Vision + ux_theories.json 기반 화면 분석",
    version="1.0.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ux-analysis"}


@app.post("/analyze", response_model=UxScreenAnalysisV1)
async def analyze(
    image: UploadFile = File(..., description="분석할 UI 스크린샷"),
    persona_age: str = Form(..., description="연령대 또는 나이"),
    persona_proficiency: str = Form(
        ..., description="디지털 숙련도 (예: 초급/중급/고급)"
    ),
    persona_goal: str = Form(..., description="이 화면을 쓰는 목적·맥락"),
    screen_id: str | None = Form(None),
    screen_name: str | None = Form(None),
    url_or_path: str | None = Form(None),
) -> UxScreenAnalysisV1:
    """이미지 + 페르소나를 받아 규격화된 ux_* JSON을 반환합니다."""
    try:
        _load_ux_theories_raw()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image file")

    sid = (screen_id or "").strip() or f"screen_{uuid.uuid4().hex[:12]}"
    sname = (screen_name or "").strip() or "업로드 화면"
    uop = (url_or_path or "").strip() or "upload://analysis"

    media_type = image.content_type or "image/png"

    try:
        result = analyze_screen_image(
            image_bytes=raw,
            image_media_type=media_type,
            persona_age=persona_age.strip(),
            persona_proficiency=persona_proficiency.strip(),
            persona_goal=persona_goal.strip(),
            screen_id=sid,
            screen_name=sname,
            url_or_path=uop,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    return result
