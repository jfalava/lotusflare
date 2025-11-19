"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import React from "react";

// Stat Card Component
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
  color?: "default" | "blue" | "green" | "yellow" | "red";
}) => {
  const colorClasses = {
    default: "bg-card border-border",
    blue: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    green:
      "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
    yellow:
      "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
    red: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
  };

  return (
    <Card className={cn("relative overflow-hidden", colorClasses[color])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Icon className="h-6 w-6 text-muted-foreground" />
            {trend && (
              <div
                className={cn(
                  "flex items-center space-x-1 text-xs",
                  trend.value > 0 ? "text-green-600" : "text-red-600",
                )}
              >
                <TrendingUp className="h-3 w-3" />
                <span>{trend.label}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
