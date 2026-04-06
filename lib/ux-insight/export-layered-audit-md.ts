import type { UxAuditLayers } from "@/lib/ux-insight/layered-audit-v1";

export function exportLayeredAuditMarkdown(params: {
  title: string;
  subtitle?: string;
  layers: UxAuditLayers;
  expertNote?: string;
}): string {
  const { title, subtitle, layers, expertNote } = params;
  const lines: string[] = [];
  lines.push(`# UX Audit Report: ${title}`);
  if (subtitle) lines.push(subtitle);
  lines.push("");
  lines.push(`_Layered audit v${layers.ux_layered_audit_version} · 생성 시각 ${new Date().toISOString()}_`);
  if (expertNote?.trim()) {
    lines.push("");
    lines.push("## 전문가 메모");
    lines.push(expertNote.trim());
  }

  const s = layers.ux_audit_layer_screen;
  lines.push("");
  lines.push("## Layer 1 — 화면 (Screen-Level)");
  if (s) {
    lines.push("### 문제점 (ux_issue_screen)");
    if (s.ux_issue_screen.length === 0) lines.push("_(없음)_");
    for (const it of s.ux_issue_screen) {
      lines.push(`- **${it.ux_issue_screen_summary}**`);
      lines.push(`  - Why: ${it.ux_issue_screen_why}`);
      if (it.ux_step_index != null) {
        lines.push(`  - Step: 화면 #${it.ux_step_index}`);
      }
      if (it.ux_issue_screen_theory_note) lines.push(`  - Theory: ${it.ux_issue_screen_theory_note}`);
      if (it.ux_issue_screen_severity) lines.push(`  - Severity: ${it.ux_issue_screen_severity}`);
    }
    lines.push("### 개선 포인트 (ux_improvement_screen)");
    if (s.ux_improvement_screen.length === 0) lines.push("_(없음)_");
    for (const it of s.ux_improvement_screen) {
      lines.push(`- **Action:** ${it.ux_improvement_screen_action}`);
      lines.push(`  - Impact: ${it.ux_improvement_screen_impact}`);
      if (it.ux_step_index != null) {
        lines.push(`  - Step: 화면 #${it.ux_step_index}`);
      }
      if (it.ux_improvement_screen_wireframe_note) {
        lines.push(`  - Wireframe: ${it.ux_improvement_screen_wireframe_note}`);
      }
    }
  } else {
    lines.push("_(레이어 없음)_");
  }

  const f = layers.ux_audit_layer_flow;
  lines.push("");
  lines.push("## Layer 2 — 플로우 (Flow-Level)");
  if (f) {
    lines.push("### 문제점 (ux_issue_flow)");
    if (f.ux_issue_flow.length === 0) lines.push("_(없음)_");
    for (const it of f.ux_issue_flow) {
      lines.push(`- **${it.ux_issue_flow_summary}**`);
      lines.push(`  - Why: ${it.ux_issue_flow_why}`);
      if (it.ux_issue_flow_theory_note) {
        lines.push(`  - Theory: ${it.ux_issue_flow_theory_note}`);
      }
      if (it.ux_issue_flow_transition_hint) {
        lines.push(`  - Transition: ${it.ux_issue_flow_transition_hint}`);
      }
    }
    lines.push("### 개선 포인트 (ux_improvement_flow)");
    if (f.ux_improvement_flow.length === 0) lines.push("_(없음)_");
    for (const it of f.ux_improvement_flow) {
      lines.push(`- **Action:** ${it.ux_improvement_flow_action}`);
      lines.push(`  - Impact: ${it.ux_improvement_flow_impact}`);
      if (it.ux_improvement_flow_nav_note) {
        lines.push(`  - Navigation: ${it.ux_improvement_flow_nav_note}`);
      }
    }
  } else {
    lines.push("_(레이어 없음)_");
  }

  const t = layers.ux_audit_layer_system;
  lines.push("");
  lines.push("## Layer 3 — 전체 전략 (System-Level)");
  if (t) {
    lines.push("### 문제점 (ux_issue_total)");
    if (t.ux_issue_total.length === 0) lines.push("_(없음)_");
    for (const it of t.ux_issue_total) {
      lines.push(`- **${it.ux_issue_total_summary}**`);
      lines.push(`  - Why: ${it.ux_issue_total_why}`);
      if (it.ux_issue_total_theory_note) {
        lines.push(`  - Theory: ${it.ux_issue_total_theory_note}`);
      }
    }
    lines.push("### 개선 포인트 (ux_improvement_total)");
    if (t.ux_improvement_total.length === 0) lines.push("_(없음)_");
    for (const it of t.ux_improvement_total) {
      lines.push(`- **Action:** ${it.ux_improvement_total_action}`);
      lines.push(`  - Impact: ${it.ux_improvement_total_impact}`);
      if (it.ux_improvement_total_strategy_note) {
        lines.push(`  - Strategy: ${it.ux_improvement_total_strategy_note}`);
      }
    }
  } else {
    lines.push("_(레이어 없음)_");
  }

  lines.push("");
  lines.push("---");
  lines.push("*End of report*");
  return lines.join("\n");
}
