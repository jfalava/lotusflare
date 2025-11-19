"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useTopLoader } from "nextjs-toploader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreHorizontal, Plus, ShoppingCart } from "lucide-react";
import type {
  MasterInventoryWithDetails,
  InventoryDetailWithCardDetails,
  PlaceDbo,
  ScryfallApiCard,
} from "#/backend/src/types";
import { getCardImageUri } from "@/utils/card-utils";
import { AddPrintModal } from "./add-print-modal";
import { InventoryDetailEditModal } from "./inventory-detail-edit-modal";
import clsx from "clsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CardDetailModal } from "@/components/card/card-detail-modal";

const INTERACTIVE_SELECTOR =
  "button, a, [role='button'], input, select, textarea," +
  " [data-radix-dropdown-menu-trigger], [data-radix-dropdown-menu-content]," +
  " [data-radix-popper-content-wrapper], [role='menu'], [role='menuitem']";

interface MasterInventoryGridItemProps {
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
  onDetailUpdate: (
    detailId: number,
    updatedDetail: InventoryDetailWithCardDetails,
  ) => Promise<void>;
  onDetailDelete: (detailId: number) => Promise<void>;
  onAddCopy: (card: ScryfallApiCard) => void;
  onPrintAdded: (detail: InventoryDetailWithCardDetails) => void;
}

export const MasterInventoryGridItem: React.FC<
  MasterInventoryGridItemProps
> = ({
  item,
  isExpanded,
  onToggleExpanded,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  places,
  onDetailUpdate,
  onDetailDelete,
  onPrintAdded,
}) => {
  const [editingDetail, setEditingDetail] =
    useState<InventoryDetailWithCardDetails | null>(null);
  const [detailToDelete, setDetailToDelete] =
    useState<InventoryDetailWithCardDetails | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [addPrintOpen, setAddPrintOpen] = useState(false);
  const loader = useTopLoader();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedCard, setSelectedCard] =
    React.useState<ScryfallApiCard | null>(null);

  const primaryCard = item.details[0]?.card;
  const imgUri = primaryCard ? getCardImageUri(primaryCard) : undefined;
  const totalQuantity = item.details.reduce(
    (acc, detail) => acc + detail.quantity,
    0,
  );

  useEffect(() => {
    if (isExpanded && containerRef.current) {
      const timeoutId = setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isExpanded]);

  if (!item.details || item.details.length === 0) {
    return null;
  }

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

  const handleDetailEdit = (detail: InventoryDetailWithCardDetails) => {
    setEditingDetail(detail);
  };

  const handleDetailDelete = (detail: InventoryDetailWithCardDetails) => {
    setDetailToDelete(detail);
  };

  const handleConfirmDelete = async () => {
    if (detailToDelete) {
      loader.start();
      try {
        await onDetailDelete(detailToDelete.id);
      } finally {
        setDetailToDelete(null);
        loader.done();
      }
    }
  };

  const handleEditSave = async (
    updatedDetail: InventoryDetailWithCardDetails,
  ) => {
    await onDetailUpdate(updatedDetail.id, updatedDetail);
    setEditingDetail(null);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (
      (e.target as Element).closest("[data-radix-popper-content-wrapper]") ||
      (e.target as Element).closest("button")
    ) {
      return;
    }
    onToggleExpanded(item.oracle_id);
  };

  const handleDetailClick = (e: React.MouseEvent, card: ScryfallApiCard) => {
    if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) return;
    e.stopPropagation(); // Prevent event from bubbling up to parent card
    onMouseLeave(); // Hide the floating preview image
    setSelectedCard(card);
    setModalOpen(true);
  };

  return (
    <>
      <motion.div
        ref={containerRef}
        layout
        className={clsx("relative", isExpanded && "col-span-full")}
        initial={false}
        transition={{
          layout: {
            duration: 0.25,
            ease: [0.4, 0, 0.2, 1],
          },
        }}
      >
        <Card
          className={clsx(
            "overflow-hidden transition-all duration-150 ease-out cursor-pointer",
            "group flex flex-col bg-card/80 backdrop-blur-sm",
            "hover:shadow-xl hover:ring-2 hover:ring-primary",
            !isExpanded && "hover:-translate-y-1",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            isExpanded && "ring-2 ring-primary shadow-xl",
          )}
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleExpanded(item.oracle_id);
            }
          }}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${
            item.name
          }`}
        >
          <motion.div
            layout
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {!isExpanded ? (
              <CardContent className="flex flex-col items-center justify-between flex-grow p-3">
                <div className="relative flex justify-center items-center w-full mb-2 aspect-[63/88]">
                  {imgUri ? (
                    <img
                      src={imgUri}
                      alt={item.name}
                      className="object-contain w-full h-full rounded shadow-md group-hover:shadow-lg border border-black/20"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">No Image</p>
                    </div>
                  )}
                </div>
                <div
                  className="font-beleren tracking-wide text-center mb-1.5 w-full truncate px-1 mt-3"
                  title={item.name}
                >
                  {item.name}
                </div>
                <div className="flex flex-wrap justify-center items-center gap-1 w-full pt-1 border-t border-border/30 mt-auto">
                  <Badge
                    variant="outline"
                    className="font-semibold text-xs px-1.5 py-0.5"
                  >
                    {totalQuantity}x total
                  </Badge>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    {item.details.length} versions
                  </Badge>
                </div>
              </CardContent>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 lg:gap-6 mb-6">
                    <div className="flex-shrink-0 w-32">
                      {imgUri ? (
                        <img
                          src={imgUri}
                          alt={item.name}
                          className="w-full h-auto rounded-lg shadow-lg border border-black/20"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-[63/88] bg-muted rounded-lg flex items-center justify-center">
                          <p className="text-muted-foreground text-xs">
                            No Image
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-beleren text-xl mb-3 text-foreground">
                        {item.name}
                      </h3>
                      <div className="mb-4">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <Badge
                            variant="outline"
                            className="font-semibold text-sm px-2 py-1"
                          >
                            {totalQuantity}x total
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-sm px-2 py-1"
                          >
                            {item.details.length} versions
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.details.length > 0) {
                              setAddPrintOpen(true);
                            }
                          }}
                          className="w-full sm:w-auto flex items-center gap-1 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Copy
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border pb-2">
                      Inventory Details
                    </h4>
                    {item.details.map((detail) => (
                      <div
                        key={detail.id}
                        className={clsx(
                          "flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border border-border",
                          "hover:bg-muted/50 hover:shadow-md transition-all duration-150",
                          "md:flex-row md:items-start cursor-pointer",
                        )}
                        onClick={(e) => handleDetailClick(e, detail.card)}
                        onMouseEnter={(e) => {
                          // skip any interactive elements
                          if (
                            (e.target as Element).closest(INTERACTIVE_SELECTOR)
                          ) {
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
                                  className="text-xs whitespace-nowrap"
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
                                <div className="flex flex-wrap gap-2 mt-4 md:mt-auto">
                                  {detail.card.purchase_uris?.cardmarket && (
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="sm"
                                      className="w-full md:flex-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <a
                                        href={
                                          detail.card.purchase_uris.cardmarket
                                        }
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
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {detail.language.toUpperCase()}
                                    </Badge>
                                  </div>
                                )}

                                {detail.place_name && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">
                                      Location:
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
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

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 ml-2 flex-shrink-0 hover:bg-muted"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDetailEdit(detail);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDetailDelete(detail);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {/* ↓ action buttons */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </motion.div>
        </Card>
      </motion.div>

      {editingDetail && (
        <InventoryDetailEditModal
          open={!!editingDetail}
          onOpenChange={(open) => !open && setEditingDetail(null)}
          detail={editingDetail}
          places={places}
          onSave={handleEditSave}
        />
      )}

      <AddPrintModal
        open={addPrintOpen}
        onOpenChange={setAddPrintOpen}
        oracleId={item.oracle_id}
        cardName={item.name}
        places={places}
        onSuccess={(detail) => {
          onPrintAdded(detail);
          setAddPrintOpen(false);
        }}
      />

      <AlertDialog
        open={!!detailToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setDetailToDelete(null);
          }
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              entry for <strong>{detailToDelete?.card.name}</strong> (
              {detailToDelete?.card.set_name}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CardDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        card={selectedCard}
      />
    </>
  );
};
