// components/decks/editor/deck-card-row.tsx
"use client";

import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Shuffle, MinusCircle, GripVertical } from "lucide-react";
import { ManaCost } from "@/components/ui/mana-cost";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ScryfallApiCard } from "#/backend/src/types";
import type { EditableDeckCard, DragItem, DeckFormat } from "./types";

export interface DeckCardRowProps {
  deckCard: EditableDeckCard;
  section: "mainboard" | "sideboard" | "maybeboard";
  onQuantityChange: (
    tempId: string,
    section: "mainboard" | "sideboard" | "maybeboard",
    newQuantity: string,
  ) => void;
  onRemove: (
    tempId: string,
    section: "mainboard" | "sideboard" | "maybeboard",
  ) => void;
  onSetCommander?: (
    tempId: string,
    section: "mainboard" | "sideboard" | "maybeboard",
  ) => void;
  isCommander?: boolean;
  onMoveToOtherBoard: (
    tempId: string,
    fromSection: "mainboard" | "sideboard" | "maybeboard",
  ) => void;
  onViewDetails: (card: ScryfallApiCard) => void;
  index: number;
  moveCard: (
    dragIndex: number,
    hoverIndex: number,
    sourceSection: "mainboard" | "sideboard" | "maybeboard",
    targetSection: "mainboard" | "sideboard" | "maybeboard",
    itemTempId: string,
  ) => void;
  deckFormat: DeckFormat;
  onHoverStart?: (
    e: React.MouseEvent<HTMLSpanElement>,
    src: string,
    alt: string,
  ) => void;
  onHoverMove?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  onHoverEnd?: () => void;
}

const DeckCardRow: React.FC<DeckCardRowProps> = ({
  deckCard,
  section,
  onQuantityChange,
  onRemove,
  onSetCommander,
  isCommander,
  onMoveToOtherBoard,
  onViewDetails,
  index,
  moveCard,
  deckFormat,
  onHoverStart,
  onHoverMove,
  onHoverEnd,
}) => {
  const dndRef = useRef<HTMLDivElement>(null);
  const gripRef = useRef<HTMLButtonElement>(null);

  const isMobile = useMediaQuery("(max-width: 767px)");

  // drop target for sorting
  const [{ handlerId }, drop] = useDrop<
    DragItem,
    void,
    { handlerId: symbol | string | null }
  >({
    accept: "deckCard",
    collect: (m) => ({ handlerId: m.getHandlerId() }),
    hover(item, monitor) {
      if (!dndRef.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      const sourceSection = item.section;
      if (dragIndex === hoverIndex && sourceSection === section) {
        return;
      }

      const { top, bottom } = dndRef.current.getBoundingClientRect();
      const hoverMiddleY = (bottom - top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveCard(dragIndex, hoverIndex, item.section, section, item.tempId);
      item.index = hoverIndex;
      item.section = section;
    },
  });

  // drag source
  const [{ isDragging }, drag] = useDrag({
    type: "deckCard",
    item: (): DragItem => ({
      tempId: deckCard.tempId,
      index,
      section,
    }),
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  // attach drop to entire row, drag to grip on mobile, else row
  drop(dndRef);
  if (isMobile) {
    drag(gripRef);
  } else {
    drag(dndRef);
  }

  // get image URI
  const card = deckCard.cardDetails;
  const getCardImageUri = (c: ScryfallApiCard): string | undefined => {
    const top = c.image_uris;
    if (top?.normal) return top.normal;
    if (top?.png) return top.png;
    if (top?.border_crop) return top.border_crop;
    const face = c.card_faces?.[0]?.image_uris;
    if (face?.normal) return face.normal;
    if (face?.png) return face.png;
    if (face?.border_crop) return face.border_crop;
    return undefined;
  };
  const imgUri = getCardImageUri(card);
  const manaCostString = card.mana_cost || "";
  const isMoveToSideboardDisabled =
    deckFormat === "commander" && section === "mainboard";
  const moveToOtherBoardTitle = isMoveToSideboardDisabled
    ? "Sideboard not used in Commander"
    : `Move to ${section === "mainboard" ? "Sideboard" : "Mainboard"}`;

  return (
    <div
      ref={dndRef}
      data-handler-id={handlerId}
      className={cn(
        "deck-card-row flex items-center p-2 hover:bg-muted/50 rounded-md transition-colors w-full",
        isDragging && "opacity-50 border border-primary",
        isCommander &&
          "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-800/40",
      )}
    >
      {/* Quantity */}
      <div className="flex-shrink-0 mr-3">
        <Input
          type="number"
          value={deckCard.quantity}
          onChange={(e) =>
            onQuantityChange(deckCard.tempId, section, e.target.value)
          }
          min="1"
          className="w-16 h-8 text-sm px-1.5 py-1"
          aria-label={`Quantity for ${card.name}`}
        />
      </div>

      {/* Name + Mana */}
      <div className="flex-grow min-w-0 mr-3">
        <div className="overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <span
              className="text-sm font-medium cursor-pointer hover:text-primary whitespace-nowrap"
              onClick={() => onViewDetails(card)}
              title={card.name}
              onMouseEnter={(e) => {
                if (imgUri) {
                  onHoverStart?.(e, imgUri, card.name);
                }
              }}
              onMouseMove={(e) => onHoverMove?.(e)}
              onMouseLeave={() => onHoverEnd?.()}
            >
              {card.name}
            </span>
            {manaCostString && (
              <ManaCost manaCost={manaCostString} size="xs" asImage />
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onSetCommander && (
          <Button
            variant={isCommander ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => onSetCommander(deckCard.tempId, section)}
            title={isCommander ? "Unset Commander" : "Set as Commander"}
          >
            <Sparkles
              size={14}
              className={isCommander ? "" : "text-muted-foreground"}
            />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isMoveToSideboardDisabled}
          onClick={() => onMoveToOtherBoard(deckCard.tempId, section)}
          title={moveToOtherBoardTitle}
        >
          <Shuffle size={14} className="text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:text-destructive"
          onClick={() => onRemove(deckCard.tempId, section)}
          title="Remove card"
        >
          <MinusCircle size={14} />
        </Button>
        {/* mobile-only drag handle */}
        <Button
          ref={gripRef}
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:hidden cursor-grab"
          title="Drag handle"
        >
          <GripVertical
            size={14}
            className="text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  );
};

export default DeckCardRow;
