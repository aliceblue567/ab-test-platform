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
} from "recharts";
import type { VariantMetrics } from "@/types/report";

type ConversionComparisonChartProps = {
  variantA: VariantMetrics;
  variantB: VariantMetrics;
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function ConversionComparisonChart({
  variantA,
  variantB,
}: ConversionComparisonChartProps) {
  const cardRateA =
    variantA.landingUsers > 0
      ? variantA.cardClickUsers / variantA.landingUsers
      : 0;
  const cardRateB =
    variantB.landingUsers > 0
      ? variantB.cardClickUsers / variantB.landingUsers
      : 0;
  const detailRateA =
    variantA.landingUsers > 0
      ? variantA.detailViewUsers / variantA.landingUsers
      : 0;
  const detailRateB =
    variantB.landingUsers > 0
      ? variantB.detailViewUsers / variantB.landingUsers
      : 0;

  const data = [
    { name: "Card Click Rate", A: cardRateA, B: cardRateB },
    { name: "Detail View Rate", A: detailRateA, B: detailRateB },
    { name: "CTA Click Rate", A: variantA.ctaClickRate, B: variantB.ctaClickRate },
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => formatPercent(v)}
            domain={[0, 1]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value: number) => formatPercent(value)}
          />
          <Legend />
          <Bar
            dataKey="A"
            name="Variant A"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="B"
            name="Variant B"
            fill="hsl(142 76% 36%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
