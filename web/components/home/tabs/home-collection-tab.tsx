"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";
import React from "react";
import { DashboardAnalytics } from "../shared/home-types";
import TopCardsGrid from "../home-top-cards-grid";
import RarityChart from "../charts/home-rarity-chart";

interface CollectionTabProps {
  analytics: DashboardAnalytics;
}

const CollectionTab = ({ analytics }: CollectionTabProps) => {
  const foilPercentage =
    analytics.totalStats.total_cards > 0
      ? (analytics.totalStats.foil_cards / analytics.totalStats.total_cards) *
        100
      : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Most Collected Cards</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TopCardsGrid cards={analytics.topCards} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Sets by Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {analytics.setStats.slice(0, 12).map((set) => (
                <div
                  key={set.set_code}
                  className="flex items-center justify-between py-2 border-b border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {set.set_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {set.unique_cards} unique • Released{" "}
                      {new Date(set.released_at).getFullYear()}
                    </p>
                  </div>
                  <Badge variant="secondary">{set.total_cards}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rarity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <RarityChart data={analytics.rarityStats} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Collection Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {analytics.totalStats.locations_used}
              </p>
              <p className="text-sm text-muted-foreground">Storage locations</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {analytics.totalStats.sets_collected}
              </p>
              <p className="text-sm text-muted-foreground">Sets collected</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {analytics.totalStats.unique_cards > 0
                  ? (
                      analytics.totalStats.total_cards /
                      analytics.totalStats.unique_cards
                    ).toFixed(1)
                  : "0"}
              </p>
              <p className="text-sm text-muted-foreground">
                Avg copies per card
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {foilPercentage.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Foil percentage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionTab;
