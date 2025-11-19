// components/search/search-results-popover.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import type { ScryfallApiCard } from "#/backend/src/types";
import { Loader2, ImageOff, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ManaCost } from "@/components/ui/mana-cost";

interface SearchResultsPopoverProps {
  open: boolean;
  results: ScryfallApiCard[];
  isLoading: boolean;
  onSelectCard: (card: ScryfallApiCard) => void;
  onClose: () => void;
  className?: string;
  onCardSelected?: () => void;
}

// For double‐faced cards, fall back to the front face's art_crop if top‐level is missing
// This is for the small thumbnail in the list item itself.
const getArtCropForThumbnail = (card: ScryfallApiCard): string | undefined => {
  if (card.image_uris?.art_crop) return card.image_uris.art_crop;
  if (Array.isArray(card.card_faces) && card.card_faces[0].image_uris?.art_crop)
    return card.card_faces[0].image_uris.art_crop;
  return undefined;
};

// Gets the full card image URI for the hover preview.
const getFullCardImageUri = (card: ScryfallApiCard): string | undefined => {
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.image_uris?.png) return card.image_uris.png; // Fallback to png

  // Check front face for DFCs
  if (Array.isArray(card.card_faces) && card.card_faces[0]?.image_uris) {
    const faceUris = card.card_faces[0].image_uris;
    if (faceUris.normal) return faceUris.normal;
    if (faceUris.png) return faceUris.png;
  }
  return undefined; // No suitable full card image found
};

export const SearchResultsPopover: React.FC<SearchResultsPopoverProps> = ({
  open,
  results,
  isLoading,
  onSelectCard,
  onClose,
  className,
}) => {
  const [hoveredImage, setHoveredImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);

  const PREVIEW_WIDTH = 200; // px, for full card image
  // Aspect ratio of a Magic card is approx 63:88 (width:height)
  const PREVIEW_APPROX_HEIGHT = (PREVIEW_WIDTH * 88) / 63;

  const positionPreview = (event: React.MouseEvent) => {
    if (previewRef.current) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = event.clientX + 20; // Offset from cursor
      let y = event.clientY + 20;

      // Adjust if preview goes off-screen right
      if (x + PREVIEW_WIDTH > viewportWidth - 10) {
        x = event.clientX - PREVIEW_WIDTH - 20;
      }
      // Adjust if preview goes off-screen bottom
      if (y + PREVIEW_APPROX_HEIGHT > viewportHeight - 10) {
        y = event.clientY - PREVIEW_APPROX_HEIGHT - 20;
      }
      // Adjust if preview goes off-screen top
      if (y < 10) {
        y = 10;
      }
      // Adjust if preview goes off-screen left
      if (x < 10) {
        x = 10;
      }

      previewRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }
  };

  const handleMouseEnter = (card: ScryfallApiCard, event: React.MouseEvent) => {
    if (!open || isClosingRef.current) return;
    const fullImageUri = getFullCardImageUri(card);
    if (fullImageUri) {
      setHoveredImage({ src: fullImageUri, alt: card.name });
      positionPreview(event);
    } else {
      setHoveredImage(null); // Ensure no stale preview if image not found
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!open || isClosingRef.current) return;
    if (hoveredImage) {
      positionPreview(event);
    }
  };

  const clearHoveredImage = useCallback(() => {
    setHoveredImage(null);
    if (previewRef.current) {
      previewRef.current.style.transform = "translate(-9999px, -9999px)";
    }
  }, []);

  // wrap selection to also clear the hover preview
  const handleSelectCard = useCallback(
    (card: ScryfallApiCard) => {
      clearHoveredImage();
      onSelectCard(card);
      onClose();
    },
    [clearHoveredImage, onSelectCard, onClose],
  );

  const handleClose = useCallback(() => {
    isClosingRef.current = true;
    clearHoveredImage();
    onClose();
  }, [clearHoveredImage, onClose]);

  const handleMouseLeave = () => {
    clearHoveredImage();
  };

  // Handle escape key specifically to ensure cleanup
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleClose]);

  // Add a global mouse move listener to clear hover when mouse leaves the dialog area
  useEffect(() => {
    if (!open) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isClosingRef.current) {
        clearHoveredImage();
        return;
      }

      // Check if mouse is outside the dialog
      const dialogElement = document.querySelector(
        "[data-radix-dialog-content]",
      );
      if (dialogElement && !dialogElement.contains(e.target as Node)) {
        clearHoveredImage();
      }
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    return () =>
      document.removeEventListener("mousemove", handleGlobalMouseMove);
  }, [open, clearHoveredImage]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleClose();
          }
        }}
      >
        <DialogTitle className="sr-only">Search Results</DialogTitle>
        <DialogContent
          className={cn(
            "p-0 border-none bg-popover shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-4xl flex flex-col max-h-[80vh] md:max-h-[85vh] outline-none",
            className,
          )}
          onInteractOutside={handleClose}
          onEscapeKeyDown={handleClose}
        >
          <div className="flex flex-col max-h-[80vh] h-[80vh] md:max-h-[85vh] md:h-[85vh]">
            <ScrollArea
              className="flex-1 min-h-0 h-0"
              onMouseLeave={handleMouseLeave}
            >
              <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                {isLoading && (
                  <div className="flex items-center justify-center p-4 md:p-6 text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Searching...
                  </div>
                )}

                {!isLoading && results.length === 0 && (
                  <div className="p-4 md:p-6 text-center text-sm md:text-base text-muted-foreground">
                    <Info className="mx-auto mb-2 h-8 w-8" />
                    No cards found for your search. <br />
                    Try a different name or check for typos.
                  </div>
                )}

                {!isLoading &&
                  results.map((card) => {
                    const artCropThumbnail = getArtCropForThumbnail(card);
                    return (
                      <button
                        key={card.id}
                        onClick={() => handleSelectCard(card)}
                        className="w-full flex items-center p-2 md:p-3 text-left rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none focus:ring-1 focus:ring-ring transition-colors duration-150"
                        aria-label={`Select ${card.name} from ${card.set_name}`}
                        tabIndex={0}
                        onMouseEnter={(e) => handleMouseEnter(card, e)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                      >
                        {artCropThumbnail ? (
                          <img
                            src={artCropThumbnail}
                            alt="" // Decorative thumbnail
                            className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-sm mr-3 md:mr-4 border border-border/50"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-muted rounded-sm mr-3 md:mr-4 flex items-center justify-center border border-border/50">
                            <ImageOff
                              className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                        )}

                        <div className="flex-grow overflow-hidden">
                          <p className="text-sm md:text-base font-medium truncate text-popover-foreground">
                            {card.name}
                          </p>
                          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                            <span className="truncate">{card.set_name}</span>
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px] md:text-xs md:px-2"
                            >
                              {card.set.toUpperCase()} #{card.collector_number}
                            </Badge>
                            {card.mana_cost && (
                              <ManaCost
                                manaCost={card.mana_cost}
                                size="xs"
                                className="md:scale-110"
                              />
                            )}
                          </div>
                        </div>

                        <Badge
                          variant="secondary"
                          className="ml-auto text-xs md:text-sm px-1.5 py-0.5 md:px-2 md:py-1"
                        >
                          {card.rarity}
                        </Badge>
                      </button>
                    );
                  })}
              </div>
            </ScrollArea>

            <div className="p-2 md:p-3 border-t border-border text-center shrink-0 bg-popover">
              <button
                onClick={handleClose}
                className="text-xs md:text-sm text-muted-foreground hover:text-primary underline"
                autoFocus
              >
                Close Results
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div
        ref={previewRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          transform: "translate(-9999px, -9999px)",
          pointerEvents: "none",
          zIndex: 5000,
          transition: "opacity 0.1s ease-out",
          opacity: hoveredImage && !isClosingRef.current ? 1 : 0,
        }}
      >
        {hoveredImage && (
          <img
            src={hoveredImage.src}
            alt={hoveredImage.alt}
            className="w-[250px] md:w-[300px] h-auto rounded-lg shadow-2xl border-2 border-white/50 bg-black"
            loading="lazy"
          />
        )}
      </div>
    </>
  );
};
