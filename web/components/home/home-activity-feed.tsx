"use client";

import { PaginatedActivityResponse } from "#/backend/src/types";
import { Activity } from "lucide-react";
import React from "react";

// Activity Feed Component
const ActivityFeed = ({
  activities,
}: {
  activities: PaginatedActivityResponse["data"];
}) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No recent activity</p>
      </div>
    );
  }

  const renderActivityText = (
    activity: PaginatedActivityResponse["data"][0],
  ) => {
    switch (activity.type) {
      case "inventory_add":
        return (
          <>
            Added {activity.quantity}x to{" "}
            <span className="font-semibold">
              {activity.location || "inventory"}
            </span>
          </>
        );
      case "deck_create":
        return (
          <>
            Created deck for{" "}
            <span className="font-semibold">{activity.location}</span>
          </>
        );
      case "deck_update":
        return (
          <>
            Updated deck for{" "}
            <span className="font-semibold">{activity.location}</span>
          </>
        );
      default:
        return "";
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div
          key={`${activity.card_name}-${activity.timestamp}-${index}`}
          className="flex items-center space-x-3 text-sm"
        >
          <div className="flex-shrink-0">
            <div className="h-2 w-2 bg-primary rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{activity.card_name}</p>
            <p className="text-muted-foreground text-xs">
              {renderActivityText(activity)} •{" "}
              {new Date(activity.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
