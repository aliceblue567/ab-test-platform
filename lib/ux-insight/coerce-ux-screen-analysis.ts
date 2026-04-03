/**
 * Gemini가 흔히 쓰는 래핑·별칭·배열 타입 실수를 Zod 전에 정리합니다.
 */
export function coerceUxScreenAnalysisRaw(parsed: unknown): Record<string, unknown> {
  let root: Record<string, unknown>;

  if (Array.isArray(parsed)) {
    const first = parsed.find(
      (x) => x !== null && typeof x === "object" && !Array.isArray(x)
    ) as Record<string, unknown> | undefined;
    if (!first) {
      throw new Error("Invalid model JSON output");
    }
    root = { ...first };
  } else if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    root = { ...(parsed as Record<string, unknown>) };
  } else {
    throw new Error("Invalid model JSON output");
  }

  const unwrapKeys = [
    "analysis",
    "data",
    "result",
    "screen_analysis",
    "ux_screen_analysis",
    "output",
    "response",
  ];
  for (const k of unwrapKeys) {
    const inner = root[k];
    if (
      inner !== null &&
      typeof inner === "object" &&
      !Array.isArray(inner)
    ) {
      const inn = inner as Record<string, unknown>;
      if ("visual_analysis" in inn || "usability_issues" in inn) {
        root = { ...inn };
        break;
      }
    }
  }

  for (const key of [
    "usability_issues",
    "user_pain_points",
    "improvement_suggestions",
  ] as const) {
    const v = root[key];
    if (!Array.isArray(v)) {
      root[key] = [];
    }
  }

  const vaIn = root.visual_analysis;
  if (
    vaIn === null ||
    typeof vaIn !== "object" ||
    Array.isArray(vaIn)
  ) {
    root.visual_analysis = { layout: "", color: "", font: "" };
  } else {
    const v = vaIn as Record<string, unknown>;
    const str = (x: unknown) => (x == null ? "" : String(x));
    root.visual_analysis = {
      layout: str(v.layout ?? v.layout_analysis ?? v.Layout),
      color: str(v.color ?? v.colors ?? v.color_analysis ?? v.Color),
      font: str(v.font ?? v.typography ?? v.fonts ?? v.Font),
    };
  }

  const toStr = (x: unknown) => (x == null ? "" : String(x));

  root.usability_issues = (root.usability_issues as unknown[])
    .map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const it = item as Record<string, unknown>;
      const summary =
        it.ux_issue_summary ??
        it.summary ??
        it.title ??
        it.issue ??
        it.description ??
        it.problem;
      if (typeof summary !== "string" || !summary.trim()) {
        return null;
      }
      return { ...it, ux_issue_summary: summary.trim() };
    })
    .filter((x) => x !== null) as Record<string, unknown>[];

  root.user_pain_points = (root.user_pain_points as unknown[])
    .map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const it = item as Record<string, unknown>;
      const label =
        it.ux_persona_label ??
        it.persona_label ??
        it.label ??
        it.persona ??
        it.persona_name;
      let pains = it.ux_pain_points;
      if (typeof pains === "string" && pains.trim()) {
        pains = [pains.trim()];
      }
      if (!Array.isArray(pains)) {
        pains = [];
      }
      const painArr = (pains as unknown[]).filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0
      );
      const lab =
        typeof label === "string" && label.trim()
          ? label.trim()
          : "지정 페르소나";
      return { ...it, ux_persona_label: lab, ux_pain_points: painArr };
    })
    .filter((x) => x !== null) as Record<string, unknown>[];

  root.improvement_suggestions = (root.improvement_suggestions as unknown[])
    .map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const it = item as Record<string, unknown>;
      const sug =
        it.ux_suggestion ??
        it.suggestion ??
        it.recommendation ??
        it.improvement ??
        it.proposal;
      if (typeof sug !== "string" || !sug.trim()) {
        return null;
      }
      return { ...it, ux_suggestion: sug.trim() };
    })
    .filter((x) => x !== null) as Record<string, unknown>[];

  root.screen_id = toStr(root.screen_id);
  root.screen_name = toStr(root.screen_name);
  root.url_or_path = toStr(root.url_or_path);

  return root;
}
