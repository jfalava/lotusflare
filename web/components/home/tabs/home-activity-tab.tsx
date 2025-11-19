"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PaginatedActivityResponse } from "#/backend/src/types";
import { Calendar } from "lucide-react";
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ActivityFeed from "../home-activity-feed";
import { QuickStats } from "../shared/home-types";
import { CustomTooltip } from "../charts/home-custom-tooltip";

interface ActivityTabProps {
  quickStats: QuickStats;
  paginatedActivity: PaginatedActivityResponse | null;
  activityPage: number;
  setActivityPage: (page: number) => void;
}

const ActivityTab = ({
  quickStats,
  paginatedActivity,
  activityPage,
  setActivityPage,
}: ActivityTabProps) => {
  return (
    <div className="space-y-6">
      {quickStats.inventoryGrowth && quickStats.inventoryGrowth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Collection Growth (Last 7 Days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={quickStats.inventoryGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                />
                <YAxis className="text-xs" />
                <Tooltip
                  content={<CustomTooltip />}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                />
                <Area
                  type="monotone"
                  dataKey="total_quantity"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  name="Cards Added"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Complete Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            activities={paginatedActivity ? paginatedActivity.data : []}
          />
        </CardContent>
        {paginatedActivity && paginatedActivity.totalCount > 10 && (
          <Pagination className="p-4 border-t">
            <PaginationContent>
              <PaginationPrevious
                onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                aria-disabled={activityPage === 1}
              />
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationNext
                onClick={() => setActivityPage(activityPage + 1)}
                aria-disabled={!paginatedActivity.hasMore}
              />
            </PaginationContent>
          </Pagination>
        )}
      </Card>
    </div>
  );
};

export default ActivityTab;
