/**
 * ux_theories.json → 근거 ID를 사용자 친화 라벨로 치환.
 */
import theoriesJson from "../../constants/ux_theories.json";

const ID_REGEX =
  /\b(NH-\d{2}|LUX-[A-Z-]+|BE-[A-Z0-9-]+|TP-\d{2}|UXT-\d{2})\b/g;

export type TheoryBrief = {
  ux_theory_id: string;
  ux_theory_label_ko: string;
};

function buildIdToLabel(): Map<string, string> {
  const m = new Map<string, string>();
  const root = theoriesJson as Record<string, unknown>;

  const nielsen = root.nielsen_heuristics as
    | Array<{ heuristic_id: string; name_ko: string }>
    | undefined;
  nielsen?.forEach((x) => m.set(x.heuristic_id, x.name_ko));

  const laws = root.laws_of_ux as
    | Array<{ law_id: string; name_ko: string }>
    | undefined;
  laws?.forEach((x) => m.set(x.law_id, x.name_ko));

  const biases = root.behavioral_biases as
    | Array<{ bias_id: string; name_ko: string }>
    | undefined;
  biases?.forEach((x) => m.set(x.bias_id, x.name_ko));

  const travel = root.travel_psychology as
    | Array<{ travel_psych_id: string; name_ko: string }>
    | undefined;
  travel?.forEach((x) => m.set(x.travel_psych_id, x.name_ko));

  const extra = root.ux_theories_extended as
    | Array<{ ux_theory_id: string; name_ko: string }>
    | undefined;
  extra?.forEach((x) => m.set(x.ux_theory_id, x.name_ko));

  return m;
}

let cache: Map<string, string> | null = null;

export function getUxTheoryLabelMap(): Map<string, string> {
  if (!cache) cache = buildIdToLabel();
  return cache;
}

/** ID → 한글 이름 (없으면 원문 ID) */
export function getTheoryLabelKo(id: string): string {
  return getUxTheoryLabelMap().get(id) ?? id;
}

/** 텍스트에 포함된 근거 ID를 "한글명"으로 치환 (코드 노출 최소화). opts은 유지할 ID에 접미사 */
export function humanizeTheoryIdsInText(
  text: string,
  options?: { keepIdsAsSuffix?: boolean }
): string {
  if (!text) return text;
  const map = getUxTheoryLabelMap();
  return text.replace(ID_REGEX, (id) => {
    const label = map.get(id);
    if (!label) return id;
    if (options?.keepIdsAsSuffix) return `${label} (${id})`;
    return label;
  });
}

export function listTheoryIdsInText(text: string): string[] {
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(ID_REGEX.source, "g");
  while ((m = re.exec(text)) !== null) {
    seen.add(m[1]);
  }
  return [...seen];
}

export function theoryRefsToReadableList(refs: string[]): TheoryBrief[] {
  const map = getUxTheoryLabelMap();
  return refs.map((ux_theory_id) => ({
    ux_theory_id,
    ux_theory_label_ko: map.get(ux_theory_id) ?? ux_theory_id,
  }));
}
