"use client";

import React from "react";
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MTG_COLORS } from "../shared/home-constants";
import { PieChartDataPoint, PieChartLabelProps } from "../shared/home-types";
import { CustomTooltip, PieChartLegend } from "./home-custom-tooltip";

// Chart Components
const ColorDistributionChart = ({
  data,
}: {
  data: { color_group: string; total_cards: number }[];
}) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const total = data.reduce((sum, d) => sum + d.total_cards, 0);
  const chartData: PieChartDataPoint[] = data.map((d) => ({
    ...d,
    percentage:
      total > 0 ? Math.round((d.total_cards / total) * 100 * 10) / 10 : 0,
    fill: MTG_COLORS[d.color_group as keyof typeof MTG_COLORS] ?? "#8884d8",
  }));

  const renderLabel = (props: PieChartLabelProps) => {
    const { cx, cy, midAngle, outerRadius, payload } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 16;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? "start" : "end";

    return (
      <g style={{ pointerEvents: "none" }}>
        <text
          x={x}
          y={y}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fill="currentColor"
          className="text-xs font-medium text-foreground"
        >
          <tspan fill={payload.fill}>● </tspan>
          {`${payload.color_group} (${payload.percentage}%)`}
        </text>
      </g>
    );
  };

  return (
    <>
      {!isDesktop && <PieChartLegend data={chartData} labelKey="color_group" />}
      <ResponsiveContainer width="100%" height={isDesktop ? 300 : 200}>
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={isDesktop ? 100 : 80}
            dataKey="total_cards"
            labelLine={false}
            label={isDesktop ? renderLabel : undefined}
          >
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </>
  );
};

export default ColorDistributionChart;
