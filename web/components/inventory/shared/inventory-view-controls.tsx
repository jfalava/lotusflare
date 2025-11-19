"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, ListOrdered, ChevronsDown } from "lucide-react";
import clsx from "clsx";
import type { ViewMode, GridColumns } from "./inventory-types";
import { GRID_COLUMN_OPTIONS } from "./inventory-constants";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useKeyPress } from "@/hooks/useKeyPress";
import { Kbd } from "@/components/ui/kbd";
import { setCookieWithConsent } from "@/lib/cookies-with-consent";

interface ViewModeToggleButtonProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ViewModeToggleButton: React.FC<ViewModeToggleButtonProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const isGrid = viewMode === "grid";
  const nextMode: ViewMode = isGrid ? "list" : "grid";
  const NextIcon = isGrid ? List : LayoutGrid;
  const label = `Switch to ${
    nextMode.charAt(0).toUpperCase() + nextMode.slice(1)
  } View`;

  useKeyPress("v", () => onViewModeChange(nextMode), { alt: true });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => onViewModeChange(nextMode)}
      aria-label={label}
      className="w-full justify-center transition-colors duration-200 ease-in-out"
    >
      <NextIcon className="h-4 w-4 sm:mr-2" />
      <span>
        Switch to {nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}
      </span>
      <div className="hidden items-center gap-1 lg:flex ml-2">
        <Kbd>Alt</Kbd>
        <Kbd>V</Kbd>
      </div>
    </Button>
  );
};

interface InventoryScrollToggleButtonProps {
  infiniteScroll: boolean;
  onInfiniteScrollToggle: (isInfiniteNext: boolean) => void;
}

const InventoryScrollToggleButton: React.FC<
  InventoryScrollToggleButtonProps
> = ({ infiniteScroll, onInfiniteScrollToggle }) => {
  const isInfinite = infiniteScroll;
  const actionText = isInfinite ? "Infinite Scroll" : "Pagination";
  const nextActionText = isInfinite
    ? "Switch to Pagination"
    : "Switch to Infinite Scroll";
  const ActionIcon = isInfinite ? ChevronsDown : ListOrdered;

  useKeyPress("p", () => onInfiniteScrollToggle(!infiniteScroll), {
    alt: true,
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const next = !infiniteScroll;
        setCookieWithConsent("inventoryInfiniteScroll", String(next), {
          expires: 365,
        });
        onInfiniteScrollToggle(next);
      }}
      aria-label={nextActionText}
      className={clsx(
        "w-full justify-center",
        "transition-colors duration-200 ease-in-out",
        isInfinite ? "bg-primary text-primary-foreground" : "",
      )}
    >
      <ActionIcon className="h-4 w-4 sm:mr-2" />
      <span>{actionText}</span>
      <div className="hidden items-center gap-1 lg:flex ml-2">
        <Kbd>Alt</Kbd>
        <Kbd>P</Kbd>
      </div>
    </Button>
  );
};

interface InventoryViewControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  gridColumns?: GridColumns;
  onGridColumnsChange?: (columns: GridColumns) => void;
  infiniteScroll: boolean;
  onInfiniteScrollToggle: (next: boolean) => void;
  className?: string;
}

export const InventoryViewControls: React.FC<InventoryViewControlsProps> = ({
  viewMode,
  onViewModeChange,
  gridColumns,
  onGridColumnsChange,
  infiniteScroll,
  onInfiniteScrollToggle,
  className,
}) => {
  const isGrid = viewMode === "grid";
  const gridOpts = GRID_COLUMN_OPTIONS;

  useKeyPress(
    "1",
    () => {
      if (isGrid && onGridColumnsChange && gridOpts[0]) {
        onGridColumnsChange(gridOpts[0].value);
      }
    },
    { alt: true },
  );
  useKeyPress(
    "2",
    () => {
      if (isGrid && onGridColumnsChange && gridOpts[1]) {
        onGridColumnsChange(gridOpts[1].value);
      }
    },
    { alt: true },
  );
  useKeyPress(
    "3",
    () => {
      if (isGrid && onGridColumnsChange && gridOpts[2]) {
        onGridColumnsChange(gridOpts[2].value);
      }
    },
    { alt: true },
  );
  useKeyPress(
    "4",
    () => {
      if (isGrid && onGridColumnsChange && gridOpts[3]) {
        onGridColumnsChange(gridOpts[3].value);
      }
    },
    { alt: true },
  );

  return (
    <div
      className={clsx(
        "flex flex-wrap items-stretch gap-2",
        "sm:flex-nowrap sm:items-center",
        className,
      )}
    >
      {isGrid && gridColumns !== undefined && onGridColumnsChange && (
        <div className="flex-1 sm:flex-none flex justify-center">
          <div
            className={clsx(
              "flex items-center",
              "gap-0.5 sm:gap-1",
              "border border-border/40 rounded-md",
              "p-0.5 sm:p-1",
              "bg-muted/30",
            )}
          >
            {GRID_COLUMN_OPTIONS.map((opt) => (
              <TooltipProvider key={opt.value} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={gridColumns === opt.value ? "default" : "ghost"}
                      onClick={() => onGridColumnsChange(opt.value)}
                      aria-label={opt.label}
                      className="px-2 h-8"
                    >
                      <opt.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{opt.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 sm:flex-none">
        <ViewModeToggleButton
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>
      <div className="flex-1 sm:flex-none">
        <InventoryScrollToggleButton
          infiniteScroll={infiniteScroll}
          onInfiniteScrollToggle={onInfiniteScrollToggle}
        />
      </div>
    </div>
  );
};
