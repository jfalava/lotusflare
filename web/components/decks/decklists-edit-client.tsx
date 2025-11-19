// components/decks/decklists-edit-client.tsx
"use client";

import React, {
  useState,
  useRef,
  useEffect,
  startTransition,
  useMemo,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { useKeyPress } from "@/hooks/useKeyPress";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { Loader2, PlusCircle, Edit3, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import type {
  DeckWithDetails,
  DeckCardWithDetails,
  ScryfallApiCard,
} from "#/backend/src/types";
import { CardDetailModal } from "@/components/card/card-detail-modal";
import { Kbd } from "@/components/ui/kbd";
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

interface BrowseDecksClientProps {
  initialDecks: DeckWithDetails[];
}

export default function BrowseDecksClient({
  initialDecks,
}: BrowseDecksClientProps) {
  const [decks, setDecks] = useState<DeckWithDetails[]>(
    initialDecks.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    ),
  );
  const [deckToDelete, setDeckToDelete] = useState<DeckWithDetails | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCardForDetailModal, setSelectedCardForDetailModal] =
    useState<ScryfallApiCard | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const decksPerPage = 4;

  const filteredDecks = useMemo(() => {
    if (!searchQuery) return decks;
    return decks.filter((deck) =>
      deck.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [decks, searchQuery]);

  const paginatedDecks = useMemo(() => {
    const startIndex = (currentPage - 1) * decksPerPage;
    return filteredDecks.slice(startIndex, startIndex + decksPerPage);
  }, [filteredDecks, currentPage]);

  const totalPages = Math.ceil(filteredDecks.length / decksPerPage);

  // Alt+C → Create New Deck with top‐loader
  const router = useRouter();
  const pathname = usePathname();
  const loader = useTopLoader();
  const manualNav = useRef(false);

  useKeyPress(
    "c",
    (e) => {
      const tgt = e.target as HTMLElement;
      if (
        tgt.tagName === "INPUT" ||
        tgt.tagName === "TEXTAREA" ||
        tgt.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      loader.start();
      manualNav.current = true;
      startTransition(() => {
        router.push("/edit/decks/new");
      });
    },
    { alt: true },
  );

  // finish loader once navigation completes
  useEffect(() => {
    if (manualNav.current) {
      loader.done();
      manualNav.current = false;
    }
  }, [pathname, loader]);

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/decks/${deckToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let errMsg = `Failed to delete deck: ${res.statusText}`;
        try {
          const errData = (await res.json()) as { message?: string };
          if (errData?.message) errMsg = errData.message;
        } catch {}
        throw new Error(errMsg);
      }
      toast.success(`Deck "${deckToDelete.name}" deleted.`);
      setDecks((prev) => prev.filter((deck) => deck.id !== deckToDelete.id));
      setDeckToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <div className="flex justify-between items-center mb-8">
        <Input
          placeholder="Search decks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Link href="/edit/decks/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Deck
            <div className="hidden items-center gap-1 lg:flex ml-2">
              <Kbd>Alt</Kbd>
              <Kbd>C</Kbd>
            </div>
          </Button>
        </Link>
      </div>

      {paginatedDecks.length === 0 ? (
        <EmptyState
          title="No Decks Yet"
          message="Ready to craft your next masterpiece? Click 'Create New Deck' to get started."
          icon={<ListChecks className="h-16 w-16 text-muted-foreground" />}
          action={
            <Link href="/edit/decks/new" passHref>
              <Button size="lg">
                <PlusCircle className="mr-2 h-5 w-5" /> Create First Deck
              </Button>
            </Link>
          }
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
                      <CardTitle
                        className="text-2xl lg:text-4xl font-beleren-caps"
                        title={deck.name}
                      >
                        {deck.name}
                      </CardTitle>
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
                    <div className="flex gap-2 flex-shrink-0 mt-2 sm:mt-0">
                      <Link href={`/edit/decks/${deck.id}`} passHref>
                        <Button variant="outline" size="sm">
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeckToDelete(deck)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
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
                  {/* Maybeboard display */}
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

      {deckToDelete && (
        <AlertDialog
          open={!!deckToDelete}
          onOpenChange={() => setDeckToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the deck "
                <strong>{deckToDelete.name}</strong>". This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDeck}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Deck
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
