// components/decks/deck-list-client.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Loader2, Search, ArchiveX, Eye, ListTree } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import type { DeckWithDetails } from "#/backend/src/types";
import { cn } from "@/lib/utils";
import { DECKS_PAGE_SIZE } from "@/lib/constants";

const PAGE_SIZE = DECKS_PAGE_SIZE;

const getDeckCoverImage = (
  deck: DeckWithDetails,
): string | null | undefined => {
  if (deck.cards && deck.cards.length > 0) {
    const commander = deck.cards.find((c) => c.is_commander);
    if (commander?.card.image_uris?.art_crop) {
      return commander.card.image_uris.art_crop;
    }
    if (deck.cards[0].card.image_uris?.art_crop) {
      return deck.cards[0].card.image_uris.art_crop;
    }
    if (commander?.card.image_uris?.normal) {
      return commander.card.image_uris.normal;
    }
    if (deck.cards[0].card.image_uris?.normal) {
      return deck.cards[0].card.image_uris.normal;
    }
  }
  return null;
};

const getCommanderNames = (deck: DeckWithDetails): string => {
  const commanders = deck.cards?.filter((c) => c.is_commander) || [];
  if (commanders.length === 0) {
    return "N/A";
  }
  return commanders.map((c) => c.card.name).join(" & ");
};

const DeckCardPlaceholder = () => (
  <div className="aspect-video w-full bg-muted rounded-t-lg border-b border-border flex items-center justify-center">
    <ListTree className="h-1/3 w-1/3 text-muted-foreground" />
  </div>
);

interface DeckListClientProps {
  initialDecks: DeckWithDetails[];
  initialSearchTerm?: string;
  initialPage?: number;
}

export default function DeckListClient({
  initialDecks,
  initialSearchTerm = "",
  initialPage = 1,
}: DeckListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allDecks] = useState<DeckWithDetails[]>(initialDecks);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const isClientFiltering = searchTerm !== debouncedSearchTerm;

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchTerm.trim()) {
      params.set("q", debouncedSearchTerm.trim());
    } else {
      params.delete("q");
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    } else {
      params.delete("page");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearchTerm, currentPage, pathname, router, searchParams]);

  const filteredDecks = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return allDecks;
    }
    const term = debouncedSearchTerm.toLowerCase();
    return allDecks.filter(
      (deck) =>
        deck.name.toLowerCase().includes(term) ||
        deck.format.toLowerCase().includes(term) ||
        (deck.description?.toLowerCase().includes(term) ?? false) ||
        getCommanderNames(deck).toLowerCase().includes(term),
    );
  }, [allDecks, debouncedSearchTerm]);

  const currentDisplayedDecks = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredDecks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredDecks, currentPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredDecks.length / PAGE_SIZE)),
    [filteredDecks],
  );

  function PaginationControls() {
    if (totalPages <= 1) {
      return null;
    }
    return (
      <div className="flex justify-center items-center gap-2 mt-8 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    );
  }

  if (initialDecks.length === 0 && !initialSearchTerm) {
    return (
      <EmptyState
        title="No Decks Found"
        message="There are currently no public decks to display."
        icon={<ArchiveX className="h-16 w-16 text-muted-foreground" />}
      />
    );
  }

  return (
    <>
      <div className="my-6 max-w-xl mx-auto">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search decks by name, format, commander..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-4 h-11 text-base"
            aria-label="Search public decks"
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          {isClientFiltering && (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary"
              size={20}
            />
          )}
        </div>
      </div>

      {currentDisplayedDecks.length === 0 && debouncedSearchTerm ? (
        <EmptyState
          title="No Decks Match Your Search"
          message={`No decks found for "${debouncedSearchTerm}". Try a different search term.`}
          icon={<ArchiveX className="h-16 w-16 text-muted-foreground" />}
          className="mt-12"
        />
      ) : currentDisplayedDecks.length === 0 &&
        initialDecks.length > 0 &&
        !searchTerm ? (
        <EmptyState
          title="No Decks to Display"
          message="Something went wrong, or all decks were filtered out unexpectedly."
          icon={<ArchiveX className="h-16 w-16 text-muted-foreground" />}
          className="mt-12"
        />
      ) : (
        <>
          <div
            className={cn(
              "grid gap-4 sm:gap-6",
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            )}
          >
            {currentDisplayedDecks.map((deck) => {
              const coverImage = getDeckCoverImage(deck);
              const commanderName = getCommanderNames(deck);
              const cardCount =
                deck.cards?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;

              return (
                <Card
                  key={deck.id}
                  className="overflow-hidden transition-all duration-200 ease-out hover:shadow-xl flex flex-col group"
                >
                  <Link
                    href={`/decks/${deck.id}`}
                    className="block cursor-pointer"
                    aria-label={`View deck: ${deck.name}`}
                  >
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={`${deck.name} cover art`}
                        className="aspect-video w-full object-cover rounded-t-lg border-b border-border transition-opacity group-hover:opacity-90"
                        draggable={false}
                        loading="lazy"
                      />
                    ) : (
                      <DeckCardPlaceholder />
                    )}
                  </Link>
                  <CardContent className="p-4 flex flex-col flex-grow">
                    <Link
                      href={`/decks/${deck.id}`}
                      className="block cursor-pointer"
                    >
                      <CardTitle className="text-lg md:text-xl font-beleren leading-tight tracking-tight hover:text-primary transition-colors truncate">
                        {deck.name}
                      </CardTitle>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {deck.format} &bull; {cardCount} cards
                    </p>
                    {deck.format === "commander" && (
                      <p
                        className="text-sm text-muted-foreground mt-1 truncate"
                        title={commanderName}
                      >
                        Commander: {commanderName}
                      </p>
                    )}
                    {deck.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 flex-grow">
                        {deck.description}
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-border/30 flex justify-end items-center">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/decks/${deck.id}`}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <PaginationControls />
        </>
      )}
    </>
  );
}
