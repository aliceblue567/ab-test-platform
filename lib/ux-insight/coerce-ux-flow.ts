/**
 * Gemini가 steps/transitions 개수·순서를 흔히 틀릴 때 Zod 전에 보정합니다.
 */
export function coerceUxFlowRaw(
  parsed: unknown,
  stepCount: number
): Record<string, unknown> {
  let root: Record<string, unknown>;

  if (Array.isArray(parsed)) {
    const first = parsed.find(
      (x) => x !== null && typeof x === "object" && !Array.isArray(x)
    ) as Record<string, unknown> | undefined;
    if (!first) throw new Error("Invalid model JSON output");
    root = { ...first };
  } else if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    root = { ...(parsed as Record<string, unknown>) };
  } else {
    throw new Error("Invalid model JSON output");
  }

  const outerAuditLayers = root["ux_audit_layers"];

  const unwrapKeys = ["analysis", "data", "result", "flow", "ux_flow", "output"];
  for (const k of unwrapKeys) {
    const inner = root[k];
    if (
      inner !== null &&
      typeof inner === "object" &&
      !Array.isArray(inner)
    ) {
      const inn = inner as Record<string, unknown>;
      if ("ux_steps" in inn || "ux_transitions" in inn) {
        root = { ...inn };
        if (root["ux_audit_layers"] === undefined && outerAuditLayers !== undefined) {
          root["ux_audit_layers"] = outerAuditLayers;
        }
        break;
      }
    }
  }

  if (!Array.isArray(root.ux_steps)) root.ux_steps = [];
  if (!Array.isArray(root.ux_transitions)) root.ux_transitions = [];

  const byStepIndex = new Map<number, Record<string, unknown>>();
  for (const item of root.ux_steps as unknown[]) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const s = item as Record<string, unknown>;
    const idx = Number(s.ux_step_index);
    if (!Number.isInteger(idx) || idx < 0) continue;
    const label =
      s.ux_step_label != null ? String(s.ux_step_label).trim() : "";
    const summary =
      s.ux_one_line_summary != null
        ? String(s.ux_one_line_summary).trim()
        : "";
    if (label && summary) {
      byStepIndex.set(idx, { ...s, ux_step_index: idx, ux_step_label: label, ux_one_line_summary: summary });
    }
  }

  const ux_steps: Record<string, unknown>[] = [];
  for (let i = 0; i < stepCount; i++) {
    const existing = byStepIndex.get(i);
    if (existing) {
      ux_steps.push(existing);
    } else {
      ux_steps.push({
        ux_step_index: i,
        ux_step_label: `화면 ${i}`,
        ux_one_line_summary:
          "AI 응답에 이 단계 요약이 없어 기본값이 채워졌습니다. 재분석을 권장합니다.",
      });
    }
  }
  root.ux_steps = ux_steps;

  const byPair = new Map<string, Record<string, unknown>>();
  for (const item of root.ux_transitions as unknown[]) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const t = item as Record<string, unknown>;
    const from = Number(t.ux_from_step);
    const to = Number(t.ux_to_step);
    if (!Number.isInteger(from) || !Number.isInteger(to)) continue;
    byPair.set(`${from}-${to}`, { ...t, ux_from_step: from, ux_to_step: to });
  }

  const defaultPsych = {
    ux_expectation_gap: 3,
    ux_cognitive_spike: 3,
    ux_emotional_friction: 3,
  };

  const ux_transitions: Record<string, unknown>[] = [];
  for (let i = 0; i < stepCount - 1; i++) {
    const key = `${i}-${i + 1}`;
    let t = byPair.get(key);
    if (!t) {
      for (const [, cand] of byPair) {
        const f = Number((cand as Record<string, unknown>).ux_from_step);
        const tt = Number((cand as Record<string, unknown>).ux_to_step);
        if (f === i && tt === i + 1) {
          t = cand;
          break;
        }
      }
    }
    if (!t) {
      t = {
        ux_from_step: i,
        ux_to_step: i + 1,
        ux_friction_summary:
          "이 전환 구간이 모델 응답에서 누락되어 요약이 비어 있을 수 있습니다. 재분석을 권장합니다.",
        ux_friction_score: 3,
        ux_psychological_dimensions: { ...defaultPsych },
      };
    } else {
      const summary =
        t.ux_friction_summary != null
          ? String(t.ux_friction_summary).trim()
          : "";
      if (!summary) {
        t.ux_friction_summary =
          "마찰 요약이 비어 있어 기본 문장으로 채웠습니다.";
      }
      let psych = t.ux_psychological_dimensions;
      if (
        psych === null ||
        typeof psych !== "object" ||
        Array.isArray(psych)
      ) {
        psych = { ...defaultPsych };
      } else {
        const p = psych as Record<string, unknown>;
        psych = {
          ux_expectation_gap: p.ux_expectation_gap ?? defaultPsych.ux_expectation_gap,
          ux_cognitive_spike: p.ux_cognitive_spike ?? defaultPsych.ux_cognitive_spike,
          ux_emotional_friction:
            p.ux_emotional_friction ?? defaultPsych.ux_emotional_friction,
        };
      }
      t.ux_psychological_dimensions = psych;
    }
    ux_transitions.push(t);
  }
  root.ux_transitions = ux_transitions;

  let m = root.ux_flow_metrics;
  if (m === null || typeof m !== "object" || Array.isArray(m)) {
    m = {
      ux_seamlessness_index: 50,
      ux_worst_transition_to_step:
        stepCount > 1 ? Math.min(stepCount - 1, 3) : null,
      ux_executive_summary:
        "요약 필드가 비어 있어 기본 문장입니다. 재분석을 권장합니다.",
    };
  } else {
    const mm = m as Record<string, unknown>;
    if (mm.ux_executive_summary == null || String(mm.ux_executive_summary).trim() === "") {
      mm.ux_executive_summary =
        "실행 요약이 비어 있어 기본 문장으로 채웠습니다.";
    }
    if (mm.ux_seamlessness_index == null || mm.ux_seamlessness_index === "") {
      mm.ux_seamlessness_index = 50;
    }
  }
  root.ux_flow_metrics = m;

  if (Array.isArray(root.ux_flow_hotspots)) {
    root.ux_flow_hotspots = (root.ux_flow_hotspots as unknown[])
      .map((h) => {
        if (h === null || typeof h !== "object" || Array.isArray(h)) return null;
        const o = h as Record<string, unknown>;
        const note = o.ux_note != null ? String(o.ux_note).trim() : "";
        if (!note) return null;
        const si = Number(o.ux_step_index);
        if (!Number.isInteger(si) || si < 0 || si >= stepCount) return null;
        const xp = Number(o.x_pct);
        const yp = Number(o.y_pct);
        if (Number.isNaN(xp) || Number.isNaN(yp)) return null;
        return {
          ...o,
          ux_step_index: si,
          x_pct: Math.min(100, Math.max(0, xp)),
          y_pct: Math.min(100, Math.max(0, yp)),
          ux_note: note,
        };
      })
      .filter((x) => x !== null) as Record<string, unknown>[];
    if ((root.ux_flow_hotspots as unknown[]).length === 0) {
      delete root.ux_flow_hotspots;
    }
  }

  return root;
}
