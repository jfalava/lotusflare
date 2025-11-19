"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowRight, PieChart, Target } from "lucide-react";
import React from "react";
import { DashboardAnalytics } from "../shared/home-types";
import ColorDistributionChart from "../charts/home-color-dist-chart";
import ActivityFeed from "../home-activity-feed";
import { Button } from "@/components/ui/button";

interface OverviewTabProps {
  analytics: DashboardAnalytics;
  setActiveTab: (tab: string) => void;
}

const OverviewTab = ({ analytics, setActiveTab }: OverviewTabProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Color Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ColorDistributionChart data={analytics.colorStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activity</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("activity")}
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={analytics.recentActivity.slice(0, 7)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Format Legality Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.formatLegality.map((format) => (
              <div
                key={format.format}
                className="text-center p-4 bg-muted/50 rounded-lg"
              >
                <p className="font-medium capitalize text-lg">
                  {format.format}
                </p>
                <p className="text-3xl font-bold text-primary">
                  {format.legal_cards}
                </p>
                <p className="text-sm text-muted-foreground">Legal cards</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
