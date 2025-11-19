import type { InventoryColorGroup } from "@/utils/inventory-color-group";
import type { Columns2, Columns3, Columns4, Square } from "lucide-react";

export type TabKey = InventoryColorGroup | "search";
export type ViewMode = "grid" | "list";
export type GridColumns = 1 | 2 | 3 | 4;

export interface ColorTabDefinition {
  key: InventoryColorGroup;
  label: string;
  manaSymbol?: string;
  manafontClass?: string;
}

export interface TabDisplayInfo {
  key: TabKey;
  label: string;
  count?: number;
  manaSymbol?: string;
  manafontClass?: string;
  lucideIcon?: React.ComponentType<{ className?: string }>;
}

export interface GridColumnOption {
  value: GridColumns;
  label: string;
  icon: typeof Square | typeof Columns2 | typeof Columns3 | typeof Columns4;
}
