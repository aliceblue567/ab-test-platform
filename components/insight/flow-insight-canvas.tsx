"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { UxFlowAnalysisV1 } from "@/lib/ux-insight/flow-analysis-v1";

type Props = { flow: UxFlowAnalysisV1; className?: string };

/**
 * 업로드 스텝·전환 마찰을 노드/엣지로 시각화 (마찰 4~5는 붉은 강조).
 */
export function FlowInsightCanvas({ flow, className }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = flow.ux_steps.map((s, idx) => ({
      id: `s-${s.ux_step_index}`,
      position: { x: idx * 220, y: 24 },
      data: { label: `#${s.ux_step_index} ${s.ux_step_label}` },
      style: {
        fontSize: 11,
        width: 180,
        padding: 8,
        borderRadius: 8,
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      },
    }));

    const edges: Edge[] = flow.ux_transitions.map((t, i) => {
      const critical = t.ux_friction_score >= 4;
      const severe = t.ux_friction_score >= 5;
      return {
        id: `e-${t.ux_from_step}-${t.ux_to_step}-${i}`,
        source: `s-${t.ux_from_step}`,
        target: `s-${t.ux_to_step}`,
        label: `${t.ux_friction_score}/5`,
        animated: critical,
        style: {
          stroke: severe
            ? "#dc2626"
            : critical
              ? "#ea580c"
              : "hsl(var(--muted-foreground))",
          strokeWidth: severe ? 3 : critical ? 2.5 : 1.5,
        },
        labelStyle: {
          fontSize: 11,
          fontWeight: 700,
          fill: severe ? "#dc2626" : critical ? "#c2410c" : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: severe
            ? "#dc2626"
            : critical
              ? "#ea580c"
              : "hsl(var(--muted-foreground))",
        },
      };
    });

    return { nodes, edges };
  }, [flow]);

  return (
    <div
      className={className}
      style={{ height: 300, width: "100%", minHeight: 260 }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="hsl(var(--muted-foreground) / 0.15)" />
        <Controls className="!bg-card !border-border" />
        <MiniMap
          className="!bg-muted/80"
          maskColor="hsl(var(--background) / 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
