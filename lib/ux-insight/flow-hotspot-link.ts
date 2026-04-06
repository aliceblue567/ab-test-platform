import type {
  UxFlowAnalysisV1,
  UxFlowHotspotV1,
} from "@/lib/ux-insight/flow-analysis-v1";

/** 스텝·좌표 기반 안정 키 (같은 스텝 동일 좌표는 하나로 간주) */
export function hotspotStableKey(h: UxFlowHotspotV1): string {
  const x = Math.round(h.x_pct * 10) / 10;
  const y = Math.round(h.y_pct * 10) / 10;
  return `hs-${h.ux_step_index}-${x}-${y}`;
}

/** 핫스팟이 가리키는 전환 카드 인덱스 (없으면 null) */
export function findTransitionIndexForHotspot(
  h: UxFlowHotspotV1,
  transitions: UxFlowAnalysisV1["ux_transitions"]
): number | null {
  if (
    h.ux_related_transition_from != null &&
    h.ux_related_transition_to != null
  ) {
    const i = transitions.findIndex(
      (t) =>
        t.ux_from_step === h.ux_related_transition_from &&
        t.ux_to_step === h.ux_related_transition_to
    );
    if (i >= 0) return i;
  }
  const s = h.ux_step_index;
  if (s > 0) {
    const incoming = transitions.findIndex(
      (t) => t.ux_from_step === s - 1 && t.ux_to_step === s
    );
    if (incoming >= 0) return incoming;
  }
  const outgoing = transitions.findIndex(
    (t) => t.ux_from_step === s && t.ux_to_step === s + 1
  );
  return outgoing >= 0 ? outgoing : null;
}

export function hotspotKeysForTransition(
  transitionIndex: number,
  hotspots: UxFlowHotspotV1[],
  transitions: UxFlowAnalysisV1["ux_transitions"]
): Set<string> {
  const keys = new Set<string>();
  if (!transitions[transitionIndex]) return keys;
  for (const h of hotspots) {
    const idx = findTransitionIndexForHotspot(h, transitions);
    if (idx === transitionIndex) keys.add(hotspotStableKey(h));
  }
  return keys;
}
