/**
 * Gemini `responseJsonSchema`용 — 파일 스키마에서 메타 키만 제거·const→enum.
 * (일부 모델/엔드포인트에서 `const` 미지원)
 */
import rawSchema from "../../schemas/ux-screen-analysis.v1.schema.json";

type JsonRecord = Record<string, unknown>;

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function getUxScreenAnalysisGeminiJsonSchema(): JsonRecord {
  const s = deepClone(rawSchema) as JsonRecord;
  delete s.$schema;
  delete s.$id;

  const props = s.properties as JsonRecord | undefined;
  const uxVer = props?.ux_schema_version as JsonRecord | undefined;
  if (uxVer && "const" in uxVer) {
    uxVer.enum = [uxVer.const];
    delete uxVer.const;
  }

  return s;
}
