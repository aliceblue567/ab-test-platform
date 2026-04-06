/**
 * Gemini `responseJsonSchema`용 — 파일 스키마에서 메타 키만 제거·const→enum.
 * (일부 모델/엔드포인트에서 `const` 미지원)
 */
import rawSchema from "../../schemas/ux-screen-analysis.v1.schema.json";

type JsonRecord = Record<string, unknown>;

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function relaxGeminiSchemaAdditionalProperties(node: unknown): unknown {
  if (node === null || typeof node !== "object") return node;
  if (Array.isArray(node)) {
    return node.map(relaxGeminiSchemaAdditionalProperties);
  }
  const o = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = relaxGeminiSchemaAdditionalProperties(v);
  }
  if (out.additionalProperties === false) {
    out.additionalProperties = true;
  }
  return out;
}

export function getUxScreenAnalysisGeminiJsonSchema(): JsonRecord {
  const s = relaxGeminiSchemaAdditionalProperties(
    deepClone(rawSchema)
  ) as JsonRecord;
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
