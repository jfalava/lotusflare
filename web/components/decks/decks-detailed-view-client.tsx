// components/decks/decks-detailed-view-client.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { ManaCost } from "@/components/ui/mana-cost";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { CardImage } from "@/components/ui/card-image";
import { Eye, ListChecks } from "lucide-react";
import type {
  DeckWithDetails,
  DeckCardWithDetails,
  ScryfallApiCard,
} from "#/backend/src/types";
import { CardDetailModal } from "@/components/card/card-detail-modal";
import { Button } from "../ui/button";
import { getPrimaryCardType } from "@/utils/card-utils";
import { getCardImageUri } from "@/lib/image-utils";

// Helper to format date
const formatDate = (dateString: string, locale: string = "es-ES"): string =>
  new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));

const getMaybeboard = (deck: DeckWithDetails): DeckCardWithDetails[] =>
  deck.cards?.filter((c) => c.is_maybeboard) || [];

const CARD_TYPE_ORDER: string[] = [
  "Creature",
  "Planeswalker",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Battle",
  "Land",
  "Other",
];

interface DeckCardDisplayItemProps {
  cardItem: DeckCardWithDetails;
  onCardClick: (card: ScryfallApiCard) => void;
}

const DeckCardDisplayItem: React.FC<DeckCardDisplayItemProps> = ({
  cardItem,
  onCardClick,
}) => {
  const imgUri = getCardImageUri(cardItem.card);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100} disableHoverableContent>
        <TooltipTrigger asChild>
          <div
            className="
              flex justify-between items-center
              py-1 px-0.5 group cursor-pointer
              hover:bg-accent rounded-sm
              transition-colors
            "
            onClick={() => onCardClick(cardItem.card)}
            title={`View details for ${cardItem.card.name}`}
          >
            <span className="truncate group-hover:text-primary">
              {cardItem.quantity}x {cardItem.card.name}
            </span>
            {cardItem.card.mana_cost && (
              <ManaCost
                manaCost={cardItem.card.mana_cost}
                size="xs"
                asImage={true}
              />
            )}
          </div>
        </TooltipTrigger>

        {imgUri && (
          <TooltipContent
            side="right"
            align="start"
            sideOffset={8}
            className="p-0"
          >
            <CardImage
              src={imgUri}
              alt={cardItem.card.name}
              className="w-[250px] max-h-[80vh] rounded shadow-lg"
            />
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

interface DecksDetailedViewClientProps {
  initialDecks: DeckWithDetails[];
}

export default function DecksDetailedViewClient({
  initialDecks,
}: DecksDetailedViewClientProps) {
  const [selectedCardForDetailModal, setSelectedCardForDetailModal] =
    useState<ScryfallApiCard | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const loader = useTopLoader();

  const decksPerPage = 4;

  const filteredDecks = useMemo(() => {
    const sortedDecks = initialDecks.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    if (!searchQuery) return sortedDecks;

    return sortedDecks.filter((deck) =>
      deck.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [initialDecks, searchQuery]);

  const paginatedDecks = useMemo(() => {
    const startIndex = (currentPage - 1) * decksPerPage;
    return filteredDecks.slice(startIndex, startIndex + decksPerPage);
  }, [filteredDecks, currentPage]);

  const totalPages = Math.ceil(filteredDecks.length / decksPerPage);

  return (
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <div className="mb-6">
        <Input
          placeholder="Search decks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      {paginatedDecks.length === 0 ? (
        <EmptyState
          title="No Decks Found"
          message="There are no decks to display."
          icon={<ListChecks className="h-16 w-16 text-muted-foreground" />}
        />
      ) : (
        <div className="space-y-8">
          {paginatedDecks.map((deck) => {
            const mainboardCards = deck.cards.filter(
              (c) => !c.is_sideboard && !c.is_maybeboard,
            );
            const sideboardCards = deck.cards.filter((c) => c.is_sideboard);
            const maybeboardCards = getMaybeboard(deck);
            const totalMaybe = maybeboardCards.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            const groupedMainboard = mainboardCards.reduce(
              (acc: Record<string, DeckCardWithDetails[]>, cardItem) => {
                const type = getPrimaryCardType(cardItem.card.type_line);
                if (!acc[type]) acc[type] = [];
                acc[type].push(cardItem);
                return acc;
              },
              {},
            );
            const totalMain = mainboardCards.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            const totalSide = sideboardCards.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );

            return (
              <Card
                key={deck.id}
                className="w-full flex flex-col bg-card/70 backdrop-blur-sm shadow-lg"
              >
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                    <div className="flex-grow">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle
                          className="text-2xl lg:text-4xl font-beleren-caps cursor-pointer hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/decks/${deck.id}`);
                            loader.start();
                          }}
                          role="link"
                          title={deck.name}
                        >
                          {deck.name}
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/decks/${deck.id}`);
                            loader.start();
                          }}
                        >
                          <Eye />
                          <span className="max-md:hidden">
                            View "
                            <span className="font-mono tracking-tight">
                              {deck.name}
                            </span>
                            " details
                          </span>
                          <span className="md:hidden">View</span>
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize">
                          {deck.format}
                        </Badge>
                        <span>&bull;</span>
                        <span>
                          {totalMain} Main / {totalSide} Side / {totalMaybe}{" "}
                          Maybe
                        </span>
                        <span>&bull;</span>
                        <span>Updated: {formatDate(deck.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  {deck.description && (
                    <CardDescription className="pt-2 text-sm italic">
                      {deck.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0 flex-grow">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
                    {CARD_TYPE_ORDER.map((typeKey) => {
                      const cardsOfType = groupedMainboard[typeKey];
                      if (!cardsOfType?.length) return null;
                      const count = cardsOfType.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      );
                      return (
                        <div key={typeKey} className="min-w-[180px]">
                          <h4 className="flex items-center text-sm font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
                            {typeKey !== "Other" && (
                              <i
                                className={`ms ms-${typeKey.toLowerCase()} ms-shadow mr-1`}
                                aria-hidden="true"
                                title={typeKey}
                              />
                            )}
                            {typeKey} ({count})
                          </h4>
                          <div className="space-y-0.5 text-xs">
                            {cardsOfType
                              .sort((a, b) =>
                                a.card.name.localeCompare(b.card.name),
                              )
                              .map((cardItem) => (
                                <DeckCardDisplayItem
                                  key={cardItem.id}
                                  cardItem={cardItem}
                                  onCardClick={setSelectedCardForDetailModal}
                                />
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {sideboardCards.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="mt-0">
                        <h4 className="text-md font-semibold mb-2 text-muted-foreground">
                          Sideboard ({totalSide})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5 text-xs">
                          {sideboardCards
                            .sort((a, b) =>
                              a.card.name.localeCompare(b.card.name),
                            )
                            .map((cardItem) => (
                              <DeckCardDisplayItem
                                key={`side-${cardItem.id}`}
                                cardItem={cardItem}
                                onCardClick={setSelectedCardForDetailModal}
                              />
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                  {maybeboardCards.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="mt-0">
                        <h4 className="text-md font-semibold mb-2 text-muted-foreground">
                          Maybeboard ({totalMaybe})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5 text-xs">
                          {maybeboardCards
                            .sort((a, b) =>
                              a.card.name.localeCompare(b.card.name),
                            )
                            .map((cardItem) => (
                              <DeckCardDisplayItem
                                key={`maybe-${cardItem.id}`}
                                cardItem={cardItem}
                                onCardClick={setSelectedCardForDetailModal}
                              />
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationPrevious
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              aria-disabled={currentPage === 1}
            />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <Button
                  variant={page === currentPage ? "outline" : "ghost"}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              </PaginationItem>
            ))}
            <PaginationNext
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              aria-disabled={currentPage === totalPages}
            />
          </PaginationContent>
        </Pagination>
      )}

      {selectedCardForDetailModal && (
        <CardDetailModal
          open={!!selectedCardForDetailModal}
          onOpenChange={(open) => {
            if (!open) setSelectedCardForDetailModal(null);
          }}
          card={selectedCardForDetailModal}
        />
      )}
    </div>
  );
}
