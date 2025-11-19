"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import clsx from "clsx";
import { useKeyPress } from "@/hooks/useKeyPress";
import { Kbd } from "@/components/ui/kbd";
import type { ViewMode } from "@/components/context/view-mode-context";

interface DeckViewControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export const DeckViewControls: React.FC<DeckViewControlsProps> = ({
  viewMode,
  onViewModeChange,
  className,
}) => {
  const isGrid = viewMode === "grid";
  const nextViewMode: ViewMode = isGrid ? "list" : "grid";
  const ModeIcon = isGrid ? List : LayoutGrid;
  const modeLabel: string =
    nextViewMode.charAt(0).toUpperCase() + nextViewMode.slice(1);
  const ariaLabel: string = `Switch to ${modeLabel} view`;

  // Alt+V → toggle
  useKeyPress("v", () => onViewModeChange(nextViewMode), { alt: true });

  return (
    <Button
      size="sm"
      variant="outline"
      className={clsx(
        "w-auto flex-shrink-0 whitespace-nowrap justify-center transition-colors duration-200 ease-in-out",
        className,
      )}
      onClick={() => onViewModeChange(nextViewMode)}
      aria-label={ariaLabel}
      suppressHydrationWarning
    >
      <ModeIcon className="h-4 w-4 sm:mr-2" />
      <span>Switch to {modeLabel}</span>
      <div className="hidden items-center gap-1 lg:flex ml-2">
        <Kbd>Alt</Kbd>
        <Kbd>V</Kbd>
      </div>
    </Button>
  );
};
