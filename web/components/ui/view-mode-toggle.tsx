// src/components/ui/view-mode-toggle.tsx
"use client";

import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import {
  useViewMode,
  type ViewMode,
} from "@/components/context/view-mode-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ViewOption {
  value: ViewMode;
  label: string;
  icon: React.ElementType;
}

const viewOptions: ViewOption[] = [
  { value: "grid", label: "Grid View", icon: LayoutGrid },
  { value: "list", label: "List View", icon: List },
];

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div>
      <Select
        value={viewMode}
        onValueChange={(v) => setViewMode(v as ViewMode)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {viewOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
