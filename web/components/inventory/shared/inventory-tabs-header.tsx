// components/inventory/shared/inventory-tabs-header.tsx
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { TabDisplayInfo, TabKey } from "./inventory-types";
import { ManaCost } from "@/components/ui/mana-cost";
import clsx from "clsx";

interface InventoryTabsHeaderProps {
  tabsToDisplay: TabDisplayInfo[];
  activeTab: TabKey;
}

export const InventoryTabsHeader: React.FC<InventoryTabsHeaderProps> = ({
  tabsToDisplay,
  activeTab,
}) => {
  const renderIcon = (tab: TabDisplayInfo) => {
    // Use ManaCost for actual mana symbols
    if (tab.manaSymbol) {
      return <ManaCost manaCost={tab.manaSymbol} size="base" />;
    }

    // Use ManaCost for colorless
    if (tab.key === "Colorless") {
      return <ManaCost manaCost="{C}" size="base" />;
    }

    // Use manafont icons with backgrounds for multicolor, artifact, and land
    if (tab.key === "Multicolor") {
      return (
        <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-red-500 via-blue-500 to-green-500 shadow-sm border border-gray-400">
          <i className="ms ms-multicolor text-base text-white drop-shadow-sm" />
        </div>
      );
    }

    if (tab.key === "Artifact") {
      return (
        <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-400 text-white shadow-sm border border-slate-500">
          <i className="ms ms-artifact text-base drop-shadow-sm" />
        </div>
      );
    }

    if (tab.key === "Land") {
      return (
        <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white shadow-sm border border-green-700">
          <i className="ms ms-land text-base drop-shadow-sm" />
        </div>
      );
    }

    // Regular lucide icons for other cases
    if (tab.lucideIcon) {
      const IconComponent = tab.lucideIcon;
      return <IconComponent className="h-4 w-4" />;
    }

    return null;
  };

  return (
    <div className="w-full overflow-x-auto p-2 no-scrollbar">
      <TabsList className="flex h-auto whitespace-nowrap bg-muted/30 rounded-lg p-1 w-max">
        {tabsToDisplay.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className={clsx(
              "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md transition-all text-sm font-medium",
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md",
              tab.count === 0 && tab.key !== "search"
                ? "opacity-60"
                : "hover:bg-muted hover:text-accent-foreground",
            )}
            disabled={
              tab.count === 0 && tab.key !== "search" && activeTab !== "search"
            }
          >
            {renderIcon(tab)}
            <span>{tab.label}</span>
            <Badge
              variant={activeTab === tab.key ? "default" : "secondary"}
              className={clsx(
                "ml-1.5 min-w-[2ch] text-xs px-1.5 py-0.5 h-5 flex items-center justify-center",
                activeTab === tab.key
                  ? "bg-background/20 text-primary-foreground dark:text-white"
                  : "bg-muted-foreground/20 text-muted-foreground",
              )}
            >
              {tab.count === undefined ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                tab.count
              )}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
};
