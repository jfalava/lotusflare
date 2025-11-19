"use client";

import React from "react";
import { CustomTooltipProps } from "../shared/home-types";

export const CustomTooltip = ({
  active,
  payload,
  label,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface PieChartLegendProps {
  data: Array<{
    fill: string;
    percentage: string | number;
    [key: string]: string | number;
  }>;
  labelKey: string;
}

export const PieChartLegend = ({ data, labelKey }: PieChartLegendProps) => (
  <div className="mb-4 grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
    {data.map((entry) => (
      <div key={entry[labelKey] as string} className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: entry.fill }}
        />
        <div className="flex-1 truncate">
          {entry[labelKey]}{" "}
          <span className="font-medium text-muted-foreground">
            ({entry.percentage}%)
          </span>
        </div>
      </div>
    ))}
  </div>
);
