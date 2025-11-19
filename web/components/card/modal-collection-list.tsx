// components/card/modal-collection-list.tsx
import React from "react";
import type {
  MasterInventoryWithDetails,
  ScryfallApiCard,
} from "#/backend/src/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import clsx from "clsx";

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

interface ModalCollectionListProps {
  item: MasterInventoryWithDetails;
  onMouseEnter?: (
    e: React.MouseEvent<HTMLElement>,
    imgUri: string | undefined,
    cardName: string,
    language?: string,
    card?: ScryfallApiCard,
  ) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: () => void;
}

export const ModalCollectionList: React.FC<ModalCollectionListProps> = ({
  item,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}) => {
  const getFullCardImageUri = (card: ScryfallApiCard): string | undefined => {
    if (card.image_uris?.normal) return card.image_uris.normal;
    if (card.image_uris?.png) return card.image_uris.png;
    const face = Array.isArray(card.card_faces)
      ? card.card_faces[0]
      : undefined;
    if (face?.image_uris?.normal) return face.image_uris.normal;
    if (face?.image_uris?.png) return face.image_uris.png;
    return undefined;
  };

  const totalQty = item.details.reduce((sum, d) => sum + d.quantity, 0);

  if (item.details.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        No "{item.name}" copies in your collection.
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="flex items-center gap-x-1">
        <span>Total copies: </span>
        <span className="font-mono">{totalQty}</span>
      </div>
      <div className="space-y-2">
        {item.details.map((detail) => (
          <div
            key={detail.id}
            className="flex flex-col gap-2 p-4 bg-background rounded-lg border border-border hover:bg-muted/50 hover:shadow-md transition-all duration-150"
            onMouseEnter={(e) => {
              const base = getFullCardImageUri(detail.card);
              onMouseEnter?.(
                e,
                base,
                detail.card.name,
                detail.language,
                detail.card,
              );
            }}
            onMouseMove={(e) => onMouseMove?.(e)}
            onMouseLeave={() => onMouseLeave?.()}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {detail.quantity}×
                </Badge>
                <Badge variant="outline" className="text-xs">
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
              {detail.card.purchase_uris?.cardmarket && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                >
                  <a
                    href={detail.card.purchase_uris.cardmarket}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" /> Cardmarket
                  </a>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Condition:</span>
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
                  <span className="text-muted-foreground">Lang:</span>
                  <Badge variant="outline" className="text-xs">
                    {detail.language.toUpperCase()}
                  </Badge>
                </div>
              )}

              {detail.place_name && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Location:</span>
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
        ))}
      </div>
    </div>
  );
};
