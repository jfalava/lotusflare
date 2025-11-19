"use client";

import React, { useCallback, useState } from "react";
import { useKeyPress } from "@/hooks/useKeyPress";
import type { MasterInventoryWithDetails } from "#/backend/src/types";
import type { TabKey } from "./inventory-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { Kbd } from "@/components/ui/kbd";

interface InventoryExportMenuProps {
  inventory: MasterInventoryWithDetails[];
  currentListForTab: MasterInventoryWithDetails[];
  activeTab: TabKey;
  className?: string;
}

export const InventoryExportMenu: React.FC<InventoryExportMenuProps> = ({
  inventory,
  currentListForTab,
  activeTab,
  className,
}) => {
  // control opening of the export dropdown via Alt+X
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  useKeyPress("x", () => setIsExportMenuOpen(true), { alt: true });
  const exportJson = useCallback(
    (full: boolean) => {
      const masterItems = full ? inventory : currentListForTab;
      const allDetails = masterItems.flatMap(
        (masterItem) => masterItem.details,
      );

      const data = allDetails.map((detail) => ({
        scryfall_id: detail.card.id,
        name: detail.card.name,
        set: detail.card.set,
        collector_number: detail.card.collector_number,
        quantity: detail.quantity,
        condition: detail.condition,
        is_foil: detail.is_foil,
        language: detail.language,
        notes: detail.notes,
        place_name: detail.place_name,
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString();
      const filename = full
        ? `inventory-all-${ts}.json`
        : `inventory-${activeTab.toLowerCase()}-${ts}.json`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON export ready");
    },
    [inventory, currentListForTab, activeTab],
  );

  const exportCsv = useCallback(
    (full: boolean) => {
      const masterItems = full ? inventory : currentListForTab;
      const allDetails = masterItems.flatMap(
        (masterItem) => masterItem.details,
      );

      const headers = [
        "scryfall_id",
        "name",
        "set",
        "collector_number",
        "quantity",
        "condition",
        "is_foil",
        "language",
        "notes",
        "place_name",
      ];
      const rows = allDetails.map((detail) =>
        [
          detail.card.id,
          `"${detail.card.name.replace(/"/g, '""')}"`,
          detail.card.set,
          detail.card.collector_number,
          detail.quantity,
          detail.condition,
          detail.is_foil,
          detail.language,
          `"${(detail.notes || "").replace(/"/g, '""')}"`,
          `"${(detail.place_name || "").replace(/"/g, '""')}"`,
        ].join(","),
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString();
      const filename = full
        ? `inventory-all-${ts}.csv`
        : `inventory-${activeTab.toLowerCase()}-${ts}.csv`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV export ready");
    },
    [inventory, currentListForTab, activeTab],
  );

  return (
    <div
      className={clsx(
        // removed w-full, center on mobile
        "flex items-center justify-center sm:justify-end",
        className,
      )}
    >
      <DropdownMenu open={isExportMenuOpen} onOpenChange={setIsExportMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className={clsx(
              "flex items-center justify-center sm:justify-end",
              className,
            )}
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span>Export inventory</span>
            <div className="hidden items-center gap-1 lg:flex ml-2">
              <Kbd>Alt</Kbd>
              <Kbd>X</Kbd>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => exportJson(false)}>
            <Download className="h-4 w-4 mr-2" />
            Current Tab <code>(JSON)</code>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exportJson(true)}>
            <Download className="h-4 w-4 mr-2" />
            Full Inventory <code>(JSON)</code>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => exportCsv(false)}>
            <Download className="h-4 w-4 mr-2" />
            Current Tab <code>(CSV)</code>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exportCsv(true)}>
            <Download className="h-4 w-4 mr-2" />
            Full Inventory <code>(CSV)</code>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
