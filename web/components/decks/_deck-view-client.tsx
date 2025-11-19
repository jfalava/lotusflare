// components/decks/deck-view-client.tsx
// unused component, do not edit!
"use client";

import { useRouter } from "next/navigation"; // Keep for router.back()
import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ClipboardCopy,
  ChevronDown,
  Image as ImageIcon,
  List as ListIcon,
  BookOpen,
  Users,
  ArrowLeft,
  ArchiveX, // For fallback if initialDeck is somehow null (should be caught by server)
} from "lucide-react";
import type { DeckWithDetails, DeckCardWithDetails } from "#/backend/src/types";
import { CardImage } from "@/components/ui/card-image";
import { ManaCost } from "@/components/ui/mana-cost";
// If getDeckCoverImage is needed for client-side re-renders (e.g. dynamic image updates), import it
// import { getDeckCoverImage } from "@/lib/deck-utils";

// Helper to get commander(s)
const getCommanders = (deck: DeckWithDetails | null): DeckCardWithDetails[] => {
  return deck?.cards?.filter((c) => c.is_commander) || [];
};

// Helper to get mainboard cards
const getMainboard = (deck: DeckWithDetails | null): DeckCardWithDetails[] => {
  return deck?.cards?.filter((c) => !c.is_sideboard && !c.is_commander) || [];
};

// Helper to get sideboard cards
const getSideboard = (deck: DeckWithDetails | null): DeckCardWithDetails[] => {
  return deck?.cards?.filter((c) => c.is_sideboard) || [];
};

interface DeckViewClientProps {
  initialDeck: DeckWithDetails;
}

export default function DeckViewClient({ initialDeck }: DeckViewClientProps) {
  const router = useRouter();
  // The deck state is now initialized from props.
  // If you needed to re-fetch or mutate, you'd manage 'deck' state here.
  const [deck] = useState<DeckWithDetails>(initialDeck);
  const [viewMode, setViewMode] = useState<"image" | "list">("image");

  const commanders = useMemo(() => getCommanders(deck), [deck]);
  const mainboardCards = useMemo(() => getMainboard(deck), [deck]);
  const sideboardCards = useMemo(() => getSideboard(deck), [deck]);

  const totalMainboardCards = useMemo(
    () =>
      mainboardCards.reduce((sum, c) => sum + c.quantity, 0) +
      commanders.reduce((sum, c) => sum + c.quantity, 0),
    [mainboardCards, commanders],
  );
  const totalSideboardCards = useMemo(
    () => sideboardCards.reduce((sum, c) => sum + c.quantity, 0),
    [sideboardCards],
  );

  const copyDecklistToClipboard = useCallback(
    (format: "text" | "arena" = "text") => {
      if (!deck) return; // Should not happen if initialDeck is guaranteed
      let listString = "";

      const formatCardLine = (card: DeckCardWithDetails, isArena: boolean) => {
        const scryfallCard = card.card;
        if (isArena) {
          return `${card.quantity} ${scryfallCard.name} (${scryfallCard.set.toUpperCase()}) ${scryfallCard.collector_number}`;
        }
        return `${card.quantity}x ${scryfallCard.name}`;
      };

      if (commanders.length > 0) {
        listString += format === "arena" ? "Commander\n" : "Commander:\n";
        commanders.forEach(
          (c) => (listString += formatCardLine(c, format === "arena") + "\n"),
        );
        listString += "\n";
      }

      listString += format === "arena" ? "Deck\n" : "Mainboard:\n";
      mainboardCards.forEach(
        (c) => (listString += formatCardLine(c, format === "arena") + "\n"),
      );

      if (sideboardCards.length > 0) {
        listString += "\n";
        listString += format === "arena" ? "Sideboard\n" : "Sideboard:\n";
        sideboardCards.forEach(
          (c) => (listString += formatCardLine(c, format === "arena") + "\n"),
        );
      }

      navigator.clipboard
        .writeText(listString.trim())
        .then(() =>
          toast.success(`Decklist copied to clipboard (${format} format)!`),
        )
        .catch((err) => {
          console.error("Failed to copy decklist: ", err);
          toast.error("Failed to copy decklist.");
        });
    },
    [deck, commanders, mainboardCards, sideboardCards],
  );

  // Loading and error states for the initial fetch are handled by the Server Component.
  // This fallback is just in case initialDeck is null, which `notFound()` should prevent.
  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <ArchiveX className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold">Deck Data Unavailable</h2>
        <p className="text-muted-foreground mt-2">
          The deck details could not be loaded.
        </p>
      </div>
    );
  }

  const CardGroupDisplay = ({
    title,
    cards,
  }: {
    title: string;
    cards: DeckCardWithDetails[];
  }) => {
    if (cards.length === 0) return null;

    const groupedByType = cards.reduce(
      (acc, item) => {
        const cardType = item.card.type_line?.split("—")[0].trim() || "Unknown";
        if (!acc[cardType]) acc[cardType] = [];
        acc[cardType].push(item);
        return acc;
      },
      {} as Record<string, DeckCardWithDetails[]>,
    );

    return (
      <Collapsible defaultOpen className="mb-8">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between text-xl font-semibold py-3 hover:bg-muted/50 group"
          >
            {title} ({cards.reduce((sum, c) => sum + c.quantity, 0)})
            <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          {Object.entries(groupedByType)
            .sort(([typeA], [typeB]) => typeA.localeCompare(typeB)) // Ensure consistent sort order
            .map(([type, cardItems]) => (
              <div key={type} className="mb-6">
                <h4 className="text-md font-medium text-muted-foreground mb-3 pl-2 border-l-2 border-primary">
                  {type} ({cardItems.reduce((sum, c) => sum + c.quantity, 0)})
                </h4>
                {viewMode === "image" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {cardItems.map((item) => (
                      <div key={item.card.id} className="relative group">
                        <Link
                          href={item.card.scryfall_uri || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View ${item.card.name} on Scryfall`}
                        >
                          <CardImage
                            src={item.card.image_uris?.normal}
                            alt={item.card.name}
                            className="rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200"
                          />
                        </Link>
                        <Badge className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5">
                          {item.quantity}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">Qty</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Type
                        </TableHead>
                        <TableHead className="text-right">Mana</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cardItems
                        .sort((a, b) => a.card.name.localeCompare(b.card.name)) // Sort cards within type group
                        .map((item) => (
                          <TableRow key={item.card.id}>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Link
                                href={item.card.scryfall_uri || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary hover:underline"
                              >
                                {item.card.name}
                              </Link>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {item.card.type_line}
                            </TableCell>
                            <TableCell className="text-right">
                              <ManaCost
                                manaCost={item.card.mana_cost}
                                size="sm"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <header className="mb-8 pb-6 border-b border-border">
          <h1 className="text-4xl font-bold tracking-tight mb-2 font-beleren">
            {deck.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm">
            <Badge
              variant="outline"
              className="text-base px-3 py-1 capitalize flex items-center gap-1.5"
            >
              <BookOpen className="h-4 w-4" /> {deck.format}
            </Badge>
            <span>
              Updated: {new Date(deck.updated_at).toLocaleDateString()}
            </span>
            <span>
              Total Cards: {totalMainboardCards + totalSideboardCards}
            </span>
          </div>
          {deck.description && (
            <p className="mt-3 text-md text-muted-foreground max-w-3xl">
              {deck.description}
            </p>
          )}
        </header>

        {deck.format === "commander" && commanders.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Commander(s)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {commanders.map((item) => (
                <Link
                  key={item.card.id}
                  href={item.card.scryfall_uri || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                  aria-label={`View commander ${item.card.name} on Scryfall`}
                >
                  <CardImage
                    src={
                      item.card.image_uris?.art_crop ||
                      item.card.image_uris?.normal
                    }
                    alt={item.card.name}
                    className="rounded-xl shadow-lg hover:scale-105 transition-transform duration-200 border-2 border-transparent group-hover:border-primary"
                    isCommander
                  />
                  <p className="text-center mt-2 font-medium text-sm group-hover:text-primary">
                    {item.card.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => copyDecklistToClipboard("text")}
            >
              <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Text
            </Button>
            <Button
              variant="outline"
              onClick={() => copyDecklistToClipboard("arena")}
            >
              <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Arena
            </Button>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "image" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("image")}
                  aria-label="Switch to image view"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Image View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  aria-label="Switch to list view"
                >
                  <ListIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List View</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <CardGroupDisplay title="Mainboard" cards={mainboardCards} />
        {sideboardCards.length > 0 && <Separator className="my-6" />}
        <CardGroupDisplay title="Sideboard" cards={sideboardCards} />
      </div>
    </TooltipProvider>
  );
}
