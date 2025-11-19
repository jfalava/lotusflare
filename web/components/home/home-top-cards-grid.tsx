"use client";

import { CardDetailModal } from "@/components/card/card-detail-modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScryfallApiCard } from "#/backend/src/types";
import { ImageOff, Loader2, SquareLibrary } from "lucide-react";
import React, { useState } from "react";
import { DashboardAnalytics } from "./shared/home-types";

// Top Cards Grid
const TopCardsGrid = ({ cards }: { cards: DashboardAnalytics["topCards"] }) => {
  const [selectedCard, setSelectedCard] = useState<ScryfallApiCard | null>(
    null,
  );
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const getCardImageUri = (
    imageUrisJson: string | null,
    cardFacesJson: string | null,
  ): string | undefined => {
    try {
      if (imageUrisJson) {
        const imageUris = JSON.parse(imageUrisJson);
        return imageUris.art_crop || imageUris.normal || imageUris.small;
      }
      if (cardFacesJson) {
        const cardFaces = JSON.parse(cardFacesJson);
        if (cardFaces?.[0]?.image_uris) {
          return (
            cardFaces[0].image_uris.art_crop ||
            cardFaces[0].image_uris.normal ||
            cardFaces[0].image_uris.small
          );
        }
      }
    } catch (e) {
      console.error("Failed to parse card image URIs", e);
      return undefined;
    }
    return undefined;
  };

  const handleCardClick = async (scryfallId: string) => {
    setLoadingCardId(scryfallId);
    try {
      const res = await fetch(`/api/scryfall/cards/${scryfallId}`);
      if (res.ok) {
        const cardData = (await res.json()) as ScryfallApiCard;
        setSelectedCard(cardData);
      } else {
        console.error("Failed to fetch card data");
      }
    } catch (error) {
      console.error("Error fetching card data:", error);
    } finally {
      setLoadingCardId(null);
    }
  };

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <SquareLibrary className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No cards in collection yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {cards.slice(0, 10).map((card, index) => {
          const imageUri = getCardImageUri(card.image_uris, card.card_faces);
          const isModalLoading = loadingCardId === card.scryfall_id;
          const isImageLoaded = loadedImages[card.scryfall_id];

          return (
            <div
              key={`${card.scryfall_id}-${index}`}
              className="group relative aspect-[5/7] cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all duration-200 bg-muted"
              onClick={() =>
                !isModalLoading && handleCardClick(card.scryfall_id)
              }
            >
              {!isImageLoaded && imageUri && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
              )}
              {imageUri ? (
                <img
                  src={imageUri}
                  alt={card.name}
                  className={cn(
                    "w-full h-full object-cover group-hover:scale-105 transition-transform duration-200",
                    { "opacity-0": !isImageLoaded },
                  )}
                  onLoad={() =>
                    setLoadedImages((prev) => ({
                      ...prev,
                      [card.scryfall_id]: true,
                    }))
                  }
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {isModalLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  { "opacity-100": isModalLoading }, // Keep overlay visible when loading
                )}
              >
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-xs font-medium truncate">
                    {card.name}
                  </p>
                  <p className="text-white/80 text-xs">
                    {card.total_copies}x copies
                  </p>
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-black/50 text-white border-white/20"
                >
                  #{index + 1}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCard && (
        <CardDetailModal
          open={!!selectedCard}
          onOpenChange={(open) => setSelectedCard(open ? selectedCard : null)}
          card={selectedCard}
        />
      )}
    </>
  );
};

export default TopCardsGrid;
