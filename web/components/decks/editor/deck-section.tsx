// components/decks/editor/deck-section.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DeckCardRow from "@/components/decks/editor/deck-card-row";
import type { EditableDeckCard, DragItem, DeckFormat } from "./types";
import type { ScryfallApiCard } from "#/backend/src/types";

interface DeckSectionProps {
  title: string;
  cards: EditableDeckCard[];
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
  commanderTempId?: string | null;
  onMoveToOtherBoard: (
    tempId: string,
    fromSection: "mainboard" | "sideboard" | "maybeboard",
  ) => void;
  onViewDetails: (card: ScryfallApiCard) => void;
  moveCard: (
    dragIndex: number,
    hoverIndex: number,
    sourceSection: "mainboard" | "sideboard" | "maybeboard",
    targetSection: "mainboard" | "sideboard" | "maybeboard",
    itemTempId: string,
  ) => void;
  deckFormat: DeckFormat;
  isDetailModalOpen?: boolean;
}

// group ordering
const TYPE_ORDER = [
  "Land",
  "Creature",
  "Planeswalker",
  "Artifact",
  "Enchantment",
  "Instant",
  "Sorcery",
  "Other",
] as const;

const GROUP_LABELS: Record<(typeof TYPE_ORDER)[number], string> = {
  Land: "Lands",
  Creature: "Creatures",
  Planeswalker: "Planeswalkers",
  Artifact: "Artifacts",
  Enchantment: "Enchantments",
  Instant: "Instants",
  Sorcery: "Sorceries",
  Other: "Other",
};

const DeckSection: React.FC<DeckSectionProps> = ({
  title,
  cards,
  section,
  onQuantityChange,
  onRemove,
  onSetCommander,
  commanderTempId,
  onMoveToOtherBoard,
  onViewDetails,
  moveCard,
  deckFormat,
  isDetailModalOpen,
}) => {
  const cardCount = cards.reduce(
    (sum, c) => sum + (parseInt(c.quantity, 10) || 0),
    0,
  );

  // DnD drop for moving between sections
  const dropRef = useRef<HTMLDivElement>(null);
  const [, drop] = useDrop<DragItem, void, unknown>({
    accept: "deckCard",
    drop: (item) => {
      // only intercept cross-section drags
      if (item.section === section) return;

      // still forbid main→side in Commander
      if (section === "sideboard" && deckFormat === "commander") {
        toast.error("Cannot move cards to sideboard in Commander format.");
        return;
      }

      // append dragged card at end of this section
      moveCard(item.index, cards.length, item.section, section, item.tempId);
      // update the dragged item so further drags fine
      item.section = section;
      item.index = cards.length;
    },
  });
  drop(dropRef);

  // Hover‐preview state & touch detection
  const previewRef = useRef<HTMLDivElement>(null);
  const [hoveredPreview, setHoveredPreview] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    if (!isTouchDevice) {
      setIsTouchDevice(true);
      setHoveredPreview(null);
      if (previewRef.current) {
        previewRef.current.style.visibility = "hidden";
      }
    }
  };

  const handleHoverStart = (
    e: React.MouseEvent<HTMLSpanElement>,
    src: string,
    alt: string,
  ) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (isTouchDevice || isDetailModalOpen) {
      setHoveredPreview(null);
      if (previewRef.current) {
        previewRef.current.style.visibility = "hidden";
      }
      return;
    }
    if (!previewRef.current) return;
    previewRef.current.style.left = `${e.clientX + 12}px`;
    previewRef.current.style.top = `${e.clientY + 12}px`;
    previewRef.current.style.visibility = "visible";
    setHoveredPreview({ src, alt });
  };

  const handleHoverMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (
      !previewRef.current ||
      isTouchDevice ||
      isDetailModalOpen ||
      !hoveredPreview
    )
      return;
    const previewWidth = 250;
    const previewHeight = previewRef.current.offsetHeight;
    let x = e.clientX + 12;
    let y = e.clientY + 12;
    if (x + previewWidth > window.innerWidth) {
      x = e.clientX - previewWidth - 12;
    }
    if (y + previewHeight > window.innerHeight) {
      y = window.innerHeight - previewHeight - 5;
    }
    if (y < 0) y = 5;
    previewRef.current.style.left = `${x}px`;
    previewRef.current.style.top = `${y}px`;
  };

  const handleHoverEnd = () => {
    if (isTouchDevice) return;
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredPreview(null);
      if (previewRef.current) {
        previewRef.current.style.visibility = "hidden";
        previewRef.current.style.left = "-9999px";
        previewRef.current.style.top = "-9999px";
      }
    }, 100);
  };

  const handleViewDetails = (card: ScryfallApiCard) => {
    setHoveredPreview(null);
    if (previewRef.current) {
      previewRef.current.style.visibility = "hidden";
    }
    onViewDetails(card);
  };

  // map tempId → index
  const indexMap = useMemo(() => {
    const m: Record<string, number> = {};
    cards.forEach((c, i) => (m[c.tempId] = i));
    return m;
  }, [cards]);

  // bucket by type
  const groups = useMemo(() => {
    const bins: Record<(typeof TYPE_ORDER)[number], EditableDeckCard[]> = {
      Land: [],
      Creature: [],
      Planeswalker: [],
      Artifact: [],
      Enchantment: [],
      Instant: [],
      Sorcery: [],
      Other: [],
    };
    cards.forEach((c) => {
      const details = c.cardDetails;
      const typeLineToUse =
        details.card_faces && details.card_faces.length > 0
          ? details.card_faces[0].type_line
          : details.type_line;
      const found = TYPE_ORDER.find(
        (t) => t !== "Other" && typeLineToUse.includes(t),
      );
      bins[found ?? "Other"].push(c);
    });
    return TYPE_ORDER.map((t) => {
      const groupCards = bins[t];
      const count = groupCards.reduce(
        (sum, card) => sum + (parseInt(card.quantity, 10) || 0),
        0,
      );
      return { type: t, name: GROUP_LABELS[t], cards: groupCards, count };
    }).filter((g) => g.cards.length > 0);
  }, [cards]);

  // ensure Lands last
  const sortedGroups = useMemo(() => {
    const landGroup = groups.find((g) => g.type === "Land");
    const nonLand = groups.filter((g) => g.type !== "Land");
    return landGroup ? [...nonLand, landGroup] : nonLand;
  }, [groups]);

  return (
    <div
      ref={dropRef}
      onTouchStart={handleTouchStart}
      onMouseLeave={handleHoverEnd}
      className={cn(
        "deck-section",
        `deck-section-${section}`,
        "rounded-lg border bg-card flex flex-col overflow-hidden",
      )}
    >
      <div className="flex justify-between items-center p-3 border-b sticky top-0 bg-card z-10">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="secondary">{cardCount} Cards</Badge>
      </div>

      <div className="flex-grow overflow-auto p-2">
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No cards yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedGroups.map((group) => (
              <div key={group.type} className="space-y-1">
                <h4 className="flex items-center gap-x-1 text-base font-semibold mb-1">
                  <div className="flex items-center gap-x-1">
                    {group.type !== "Other" && (
                      <i
                        className={cn(
                          "ms",
                          `ms-${group.type.toLowerCase()}`,
                          "ms-shadow",
                          "mr-1",
                        )}
                        aria-hidden="true"
                        title={group.name}
                      />
                    )}
                    {group.name}
                  </div>
                  <span className="text-sm">
                    (<code>{group.count}</code>)
                  </span>
                </h4>
                <div className="space-y-1">
                  {group.cards.map((deckCard) => (
                    <DeckCardRow
                      key={deckCard.tempId}
                      deckCard={deckCard}
                      section={section}
                      onQuantityChange={onQuantityChange}
                      onRemove={onRemove}
                      onSetCommander={onSetCommander}
                      isCommander={deckCard.tempId === commanderTempId}
                      onMoveToOtherBoard={onMoveToOtherBoard}
                      onViewDetails={handleViewDetails}
                      index={indexMap[deckCard.tempId]}
                      moveCard={moveCard}
                      deckFormat={deckFormat}
                      onHoverStart={handleHoverStart}
                      onHoverMove={handleHoverMove}
                      onHoverEnd={handleHoverEnd}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* floating preview */}
      <div
        ref={previewRef}
        style={{
          position: "fixed",
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        {hoveredPreview && (
          <img
            src={hoveredPreview.src}
            alt={hoveredPreview.alt}
            className="w-[250px] max-h-[80vh] rounded shadow-lg"
          />
        )}
      </div>
    </div>
  );
};

export default DeckSection;
