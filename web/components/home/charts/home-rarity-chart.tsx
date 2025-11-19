"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RARITY_COLORS } from "../shared/home-constants";
import { DashboardAnalytics } from "../shared/home-types";
import { CustomTooltip } from "./home-custom-tooltip";

const RarityChart = ({ data }: { data: DashboardAnalytics["rarityStats"] }) => {
  const chartData = data.map((item) => ({
    ...item,
    fill: RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || "#8884d8",
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="rarity" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total_cards" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RarityChart;
