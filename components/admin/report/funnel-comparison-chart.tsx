"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import type { VariantMetrics } from "@/types/report";

type FunnelComparisonChartProps = {
  variantA: VariantMetrics;
  variantB: VariantMetrics;
};

const STEPS = [
  { key: "landingUsers" as const, label: "Landing" },
  { key: "cardClickUsers" as const, label: "Card Click" },
  { key: "detailViewUsers" as const, label: "Detail View" },
  { key: "ctaClickUsers" as const, label: "CTA Click" },
] as const;

export function FunnelComparisonChart({
  variantA,
  variantB,
}: FunnelComparisonChartProps) {
  const data = STEPS.map(({ key, label }) => ({
    name: label,
    A: variantA[key],
    B: variantB[key],
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={55}
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Legend />
          <Bar dataKey="A" name="Variant A" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="hsl(var(--primary))" />
            ))}
          </Bar>
          <Bar dataKey="B" name="Variant B" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="hsl(142 76% 36%)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
