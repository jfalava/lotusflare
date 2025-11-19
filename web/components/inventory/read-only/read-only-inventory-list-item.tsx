"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, ShoppingCart } from "lucide-react";
import type {
  MasterInventoryWithDetails,
  PlaceDbo,
  ScryfallApiCard,
} from "#/backend/src/types";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { getCardImageUri } from "@/utils/card-utils";
import { CardDetailModal } from "@/components/card/card-detail-modal";

const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "[role='button']",
  "input",
  "select",
  "textarea",
  "[data-radix-dropdown-menu-trigger]",
  "[data-radix-dropdown-menu-content]",
  "[data-radix-popper-content-wrapper]",
  "[role='menu']",
  "[role='menuitem']",
].join(",");

interface ReadOnlyMasterInventoryListItemProps {
  item: MasterInventoryWithDetails;
  isExpanded: boolean;
  onToggleExpanded: (oracleId: string) => void;
  onMouseEnter: (
    event: React.MouseEvent<HTMLElement>,
    imgUri: string | undefined,
    cardName: string,
    language?: string,
    card?: ScryfallApiCard,
  ) => void;
  onMouseMove: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  places: PlaceDbo[];
}

export const ReadOnlyMasterInventoryListItem: React.FC<
  ReadOnlyMasterInventoryListItemProps
> = ({
  item,
  isExpanded,
  onToggleExpanded,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const totalQuantity = item.details.reduce(
    (acc, detail) => acc + detail.quantity,
    0,
  );

  const primaryCard = item.details[0]?.card;
  const imgUri = primaryCard ? getCardImageUri(primaryCard) : undefined;

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "NM":
        return "bg-green-100 text-green-800 border-green-200";
      case "LP":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "MP":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "HP":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "DMG":
        return "bg-red-100 text-red-800 border-red-200";
      case "Sealed":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) return;
    onToggleExpanded(item.oracle_id);
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) return;
    setModalOpen(true);
  };

  return (
    <>
      <tr
        className={clsx(
          "hover:bg-muted/50 cursor-pointer transition-colors duration-150",
          isExpanded && "bg-muted/30",
        )}
        onClick={handleRowClick}
        onMouseEnter={(e) => {
          if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) {
            return;
          }
          if (primaryCard) {
            onMouseEnter(e, imgUri, item.name, "en", primaryCard);
          }
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded(item.oracle_id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span className="font-mono tracking-tight">{item.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <Badge variant="outline" className="font-semibold">
            {totalQuantity}x
          </Badge>
        </td>
        <td className="px-4 py-3 text-center">
          <Badge variant="secondary">{item.details.length}</Badge>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={3} className="px-0 py-0">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-muted/20 border-t border-border"
            >
              <div className="p-6 space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                  Inventory Details
                </h4>
                {item.details.map((detail) => (
                  <div
                    key={detail.id}
                    onClick={handleDetailClick}
                    className="flex items-start gap-4 p-4 bg-background rounded-lg border border-border hover:bg-muted/50 hover:shadow-md transition-all duration-150 cursor-pointer"
                    onMouseEnter={(e) => {
                      if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) {
                        return;
                      }
                      onMouseEnter(
                        e,
                        detail.card.image_uris?.normal,
                        detail.card.name,
                        detail.language,
                        detail.card,
                      );
                    }}
                    onMouseMove={onMouseMove}
                    onMouseLeave={onMouseLeave}
                  >
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {detail.card.set_name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs whitespace-nowrap font-mono"
                            >
                              {detail.card.set.toUpperCase()} #
                              {detail.card.collector_number}
                            </Badge>
                            {detail.is_foil && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border-orange-200"
                              >
                                ✨ Foil
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 flex-wrap text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">
                                Qty:
                              </span>
                              <Badge
                                variant="outline"
                                className="font-semibold text-xs"
                              >
                                {detail.quantity}x
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">
                                Condition:
                              </span>
                              <Badge
                                className={clsx(
                                  "text-xs font-medium",
                                  getConditionColor(detail.condition),
                                )}
                              >
                                {detail.condition}
                              </Badge>
                            </div>

                            {detail.language !== "en" && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">
                                  Lang:
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {detail.language.toUpperCase()}
                                </Badge>
                              </div>
                            )}

                            {detail.place_name && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">
                                  Location:
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {detail.place_name}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {detail.notes && (
                            <p className="text-xs text-muted-foreground italic bg-muted/60 px-3 py-2 rounded-md border">
                              "{detail.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {detail.card.purchase_uris?.cardmarket && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={detail.card.purchase_uris.cardmarket}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Cardmarket
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </td>
        </tr>
      )}
      <CardDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        card={primaryCard || null}
      />
    </>
  );
};
