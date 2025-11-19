// components/decks/sample-hand-drawer.tsx
"use client";

import React, { useState, useMemo, useRef } from "react";
import { useKeyPress } from "@/hooks/useKeyPress";
import { Kbd } from "@/components/ui/kbd";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shuffle,
  Hand,
  RotateCcw,
  ArrowDown,
  Info,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import type {
  DeckWithDetails,
  DeckCardWithDetails,
  ScryfallApiCard,
} from "#/backend/src/types";
import {
  CardDetailModal,
  type CardDetailModalProps,
} from "@/components/card/card-detail-modal";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SampleHandDrawerProps {
  deck: DeckWithDetails;
  children?: React.ReactNode;
}

interface HandCard {
  card: ScryfallApiCard;
  deckCardId: string;
}

function createCardPool(deck: DeckWithDetails): DeckCardWithDetails[] {
  if (!deck.cards) return [];
  const pool: DeckCardWithDetails[] = [];

  // filter out sideboard and commander cards
  const main = deck.cards.filter(
    (c: DeckCardWithDetails) =>
      !c.is_sideboard && !(deck.format === "commander" && c.is_commander),
  );

  main.forEach((dc: DeckCardWithDetails) => {
    for (let i = 0; i < dc.quantity; i++) {
      pool.push(dc);
    }
  });

  return pool;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleHand(pool: DeckCardWithDetails[], size = 7): HandCard[] {
  if (pool.length === 0) return [];
  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, size).map((dc) => ({
    card: dc.card,
    deckCardId: dc.id,
  }));
}

/**
 * Try to grab a usable image URL for this card.
 * Falls back to the front face of double-faced cards.
 */
function getCardImageUrl(card: ScryfallApiCard): string | null {
  // First, try the top‐level image_uris
  const top = card.image_uris;
  let uris: Record<string, string> | null = null;

  if (top) {
    uris = typeof top === "string" ? JSON.parse(top) : top;
  } else if (card.card_faces?.[0]?.image_uris) {
    // Fallback to the front face of a flip/transform/double-faced card
    const face = card.card_faces[0].image_uris;
    uris = typeof face === "string" ? JSON.parse(face) : face;
  }

  if (!uris) {
    return null;
  }

  // Prefer normal, then large, then small
  return uris.normal || uris.large || uris.small || null;
}

function CardInHand({
  handCard,
  index,
}: {
  handCard: HandCard;
  index: number;
}) {
  const img = getCardImageUrl(handCard.card);
  const name = handCard.card.name;

  return (
    <div className="flex-shrink-0 relative">
      {img ? (
        <Image
          src={img}
          alt={name}
          width={150}
          height={210}
          className="rounded-lg shadow-lg transition-all duration-200 group-hover:-translate-y-2 group-hover:shadow-2xl border border-border"
          unoptimized
        />
      ) : (
        <div
          className={clsx(
            "w-[150px] h-[210px] bg-muted rounded-lg shadow-lg",
            "border border-border flex items-center justify-center p-2",
          )}
        >
          <div className="text-center text-xs text-muted-foreground">
            <p className="font-medium leading-tight">{name}</p>
            {handCard.card.mana_cost && (
              <p className="mt-1 text-[10px]">{handCard.card.mana_cost}</p>
            )}
            <p className="mt-1 text-[10px] opacity-75">
              {handCard.card.type_line}
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-full font-mono">
        {index + 1}
      </div>

      {handCard.card.mana_cost && (
        <div className="absolute top-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
          {handCard.card.mana_cost}
        </div>
      )}

      <p className="text-xs text-center mt-1 text-muted-foreground truncate max-w-[150px] leading-tight">
        {name}
      </p>
    </div>
  );
}

export default function SampleHandDrawer({
  deck,
  children,
}: SampleHandDrawerProps) {
  // Alt+T opens the Sample Hand drawer
  const triggerRef = useRef<HTMLButtonElement>(null);
  useKeyPress("t", () => triggerRef.current?.click(), { alt: true });
  const [isOpen, setIsOpen] = useState(false);
  const [currentHand, setCurrentHand] = useState<HandCard[]>([]);
  const [mulliganCount, setMulliganCount] = useState(0);
  const [bottomedIndices, setBottomedIndices] = useState<number[]>([]);
  const [modalCardData, setModalCardData] =
    useState<CardDetailModalProps["card"]>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const isClosingModalRef = useRef(false);

  const cardPool = useMemo(() => createCardPool(deck), [deck]);
  const commanderCards: DeckCardWithDetails[] =
    deck.cards?.filter((c: DeckCardWithDetails) => c.is_commander) || [];

  const drawFreshHand = () => {
    if (!cardPool.length) {
      toast.error("No cards available to draw");
      return;
    }
    const newHand = sampleHand(cardPool, 7);
    const isOpening = currentHand.length === 0;
    setCurrentHand(newHand);
    setMulliganCount(0);
    setBottomedIndices([]);
    toast.success(isOpening ? "Opening hand drawn!" : "New 7-card hand drawn!");
  };

  // derive the next 4 top‐decks from current hand & deck
  const nextDraws = useMemo<HandCard[]>(() => {
    if (currentHand.length === 0) return [];
    const fullPool = createCardPool(deck);
    const remPool = [...fullPool];
    currentHand.forEach((hc) => {
      const idx = remPool.findIndex((dc) => dc.id === hc.deckCardId);
      if (idx !== -1) remPool.splice(idx, 1);
    });
    return sampleHand(remPool, 4);
  }, [currentHand, deck]);

  const handleMulligan = () => {
    if (!currentHand.length) {
      toast.error("Draw your opening hand first");
      return;
    }
    if (mulliganCount >= 6) {
      toast.warning("Maximum mulligans reached");
      return;
    }
    const next = mulliganCount + 1;
    const newHand = sampleHand(cardPool, 7);
    setCurrentHand(newHand);
    setMulliganCount(next);
    setBottomedIndices([]);
    toast.success(`Mulligan ${next}: draw 7 cards`);
  };

  const toggleBottom = (idx: number) => {
    if (bottomedIndices.includes(idx)) {
      setBottomedIndices((b) => b.filter((i) => i !== idx));
    } else if (bottomedIndices.length < mulliganCount) {
      setBottomedIndices((b) => [...b, idx]);
    } else {
      toast.info(`You can only bottom ${mulliganCount} card(s)`);
    }
  };

  const confirmBottom = () => {
    if (bottomedIndices.length !== mulliganCount) {
      toast.error(`Select exactly ${mulliganCount} card(s)`);
      return;
    }
    const finalHand = currentHand.filter(
      (_: HandCard, i: number) => !bottomedIndices.includes(i),
    );
    setCurrentHand(finalHand);
    toast.success(
      `Put ${mulliganCount} on bottom, final hand ${finalHand.length}`,
    );
    setMulliganCount(0);
    setBottomedIndices([]);
  };

  const handleOpenChange = (open: boolean) => {
    // Prevent drawer from closing when modal is being dismissed
    if (!open && (isCardModalOpen || isClosingModalRef.current)) {
      return;
    }
    setIsOpen(open);
    if (open && !currentHand.length) {
      drawFreshHand();
    }
    if (!open) {
      setCurrentHand([]);
      setMulliganCount(0);
      setBottomedIndices([]);
    }
  };

  const handleCardModalOpenChange = (open: boolean) => {
    if (!open) {
      isClosingModalRef.current = true;
      // Reset the flag after a short delay to allow any pending events to complete
      setTimeout(() => {
        isClosingModalRef.current = false;
      }, 100);
    }
    setIsCardModalOpen(open);
  };

  const handleCardClick = (hc: HandCard) => {
    const entry = deck.cards?.find(
      (c: DeckCardWithDetails) => c.id === hc.deckCardId,
    );
    const data: CardDetailModalProps["card"] = {
      ...hc.card,
      is_commander: entry?.is_commander ?? false,
      is_sideboard: entry?.is_sideboard ?? false,
    };
    setModalCardData(data);
    setIsCardModalOpen(true);
  };

  const mainboardCount =
    deck.cards
      ?.filter((c: DeckCardWithDetails) => !c.is_sideboard && !c.is_commander)
      .reduce((sum: number, c: DeckCardWithDetails) => sum + c.quantity, 0) ||
    0;

  const handStats = useMemo(() => {
    if (!currentHand.length) return null;
    const spellCards = currentHand.filter(
      (h) => !h.card.type_line.toLowerCase().includes("land"),
    );
    const lands = currentHand.length - spellCards.length;
    const spells = spellCards.length;

    const totalCmc = spellCards.reduce((sum, h) => sum + (h.card.cmc || 0), 0);

    const avgSpellCmc = spells > 0 ? totalCmc / spells : 0;

    return { lands, spells, avgSpellCmc };
  }, [currentHand]);

  return (
    <>
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          {children ?? (
            <Button ref={triggerRef} variant="outline" className="gap-2">
              <Hand className="h-4 w-4" />
              Sample Hand
              <div className="hidden items-center gap-1 ml-2 lg:flex">
                <Kbd>Alt</Kbd>
                <Kbd>T</Kbd>
              </div>
            </Button>
          )}
        </DrawerTrigger>

        <DrawerContent
          className={clsx(
            "mx-auto sm:max-w-lg md:max-w-xl",
            "lg:max-w-2xl xl:max-w-[1175px] overflow-hidden",
          )}
        >
          <DrawerHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-left text-lg truncate">
                  Sample Hand – {deck.name}
                </DrawerTitle>
                <DrawerDescription className="text-left text-sm">
                  {deck.format} • {mainboardCount} cards available
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>

            <div className="mt-2 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Hand: {currentHand.length || 7}</span>
              </div>
              {mulliganCount > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  Mulligan {mulliganCount}
                </Badge>
              )}
              {handStats && (
                <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{handStats.lands} L</span>
                  <span>{handStats.spells} S</span>
                  <span>Avg Spell CMC: {handStats.avgSpellCmc.toFixed(1)}</span>
                </div>
              )}
            </div>

            {mulliganCount > 0 && (
              <div
                className={clsx(
                  "mt-3 flex items-start gap-2 border-l-4 p-2 rounded text-xs",
                  "bg-secondary text-primary overflow-x-auto",
                )}
              >
                <Info className="h-4 w-4 shrink-0" />
                <p className="whitespace-nowrap flex-shrink-0">
                  <strong>London Mulligan:</strong> Each mulligan draws 7 cards,
                  then at the end you put N cards (equal to mulligans taken) on
                  the bottom of your library.
                </p>
              </div>
            )}
          </DrawerHeader>

          <div className="flex-1 px-6 py-4 overflow-y-auto">
            {currentHand.length > 0 ? (
              <div className="space-y-4">
                <div className="flex">
                  {/* Pinned commander column */}
                  {deck.format === "commander" && commanderCards.length > 0 && (
                    <div className="flex-shrink-0 mr-3 pb-4">
                      <div className="flex flex-col items-center gap-2">
                        {commanderCards.map((c: DeckCardWithDetails) => {
                          const img = getCardImageUrl(c.card);
                          const name = c.card.name;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                handleCardClick({
                                  card: c.card,
                                  deckCardId: c.id,
                                })
                              }
                              className={clsx(
                                "text-left focus:outline-none",
                                "focus-visible:ring-2 focus-visible:ring-primary",
                                "focus-visible:ring-offset-2 rounded-lg",
                              )}
                              aria-label={`View commander ${name}`}
                            >
                              {img ? (
                                <Image
                                  src={img}
                                  alt={name}
                                  width={150}
                                  height={210}
                                  className="rounded-lg shadow-lg transition-all duration-200 hover:-translate-y-2 hover:shadow-2xl border border-border cursor-pointer"
                                  unoptimized
                                />
                              ) : (
                                <div
                                  className={clsx(
                                    "w-[150px] h-[210px] bg-muted rounded-lg",
                                    "shadow-lg border border-border flex items-center justify-center p-2",
                                  )}
                                >
                                  <div className="text-center text-xs text-muted-foreground">
                                    <p className="font-medium leading-tight">
                                      {name}
                                    </p>
                                    {c.card.mana_cost && (
                                      <p className="mt-1 text-[10px]">
                                        {c.card.mana_cost}
                                      </p>
                                    )}
                                    <p className="mt-1 text-[10px] opacity-75">
                                      {c.card.type_line}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <p
                                className={clsx(
                                  "text-xs text-center mt-1 text-muted-foreground",
                                  "truncate max-w-[150px] leading-tight",
                                )}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Sparkles className="h-4 w-4 text-yellow-600" />
                                  {name}
                                </span>
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-3 px-1">
                      {currentHand.map((hc, i) => (
                        <button
                          key={`${hc.deckCardId}-${i}-${mulliganCount}`}
                          type="button"
                          className={clsx(
                            "flex-shrink-0 relative group text-left",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            "focus-visible:ring-offset-2 rounded-lg",
                          )}
                          onClick={() =>
                            mulliganCount > 0
                              ? toggleBottom(i)
                              : handleCardClick(hc)
                          }
                          aria-label={
                            mulliganCount > 0
                              ? `Toggle bottoming ${hc.card.name}`
                              : `View details for ${hc.card.name}`
                          }
                        >
                          <CardInHand handCard={hc} index={i} />
                          {mulliganCount > 0 && (
                            <div
                              className={clsx(
                                "absolute inset-0 rounded-lg transition-opacity",
                                bottomedIndices.includes(i)
                                  ? "bg-black/50 opacity-100"
                                  : "hover:bg-black/20 bg-transparent opacity-0",
                              )}
                            >
                              {bottomedIndices.includes(i) && (
                                <ArrowDown className="absolute inset-0 m-auto h-8 w-8 text-white animate-bounce" />
                              )}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Cards</div>
                    <div className="text-lg font-bold text-primary">
                      {currentHand.length}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">
                      Avg Spell CMC
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {handStats?.avgSpellCmc.toFixed(1) ?? "0"}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Lands</div>
                    <div className="text-lg font-bold text-primary">
                      {handStats?.lands ?? 0}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Spells</div>
                    <div className="text-lg font-bold text-primary">
                      {handStats?.spells ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Hand className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-base mb-1">Ready to draw your hand?</p>
                <p className="text-sm opacity-75">
                  Tap “Draw Hand” to start testing.
                </p>
              </div>
            )}
            {/* Next Draws */}
            {nextDraws.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Next Draws</h3>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 px-1 pb-2 justify-center-safe py-3">
                    {nextDraws.map((hc, i) => (
                      <button
                        key={`${hc.deckCardId}-${i}`}
                        type="button"
                        onClick={() => handleCardClick(hc)}
                        className="flex-shrink-0 group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                        aria-label={`View topdeck ${hc.card.name}`}
                      >
                        {getCardImageUrl(hc.card) ? (
                          <Image
                            src={getCardImageUrl(hc.card)!}
                            alt={hc.card.name}
                            width={150}
                            height={210}
                            className="rounded-lg shadow-lg transition-all duration-200 group-hover:-translate-y-2 group-hover:shadow-2xl border border-border"
                            unoptimized
                          />
                        ) : (
                          <div className="w-[150px] h-[210px] bg-muted rounded-lg shadow-lg border border-border flex items-center justify-center p-2">
                            <p className="text-center text-xs text-muted-foreground leading-tight">
                              {hc.card.name}
                            </p>
                          </div>
                        )}
                        <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded-full font-mono">
                          {i + 1}
                        </div>
                        <p className="text-xs text-center mt-1 text-muted-foreground truncate max-w-[150px] leading-tight">
                          {hc.card.name}
                        </p>
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
          </div>

          <Separator />

          <DrawerFooter className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={drawFreshHand}
                variant={!currentHand.length ? "default" : "outline"}
                className="flex-1 gap-2"
              >
                <Shuffle className="h-4 w-4" />
                {!currentHand.length ? "Draw Hand" : "Redraw"}
              </Button>

              <Button
                onClick={handleMulligan}
                variant="outline"
                className="flex-1 gap-2"
                disabled={!currentHand.length}
              >
                <RotateCcw className="h-4 w-4" />
                Mulligan
              </Button>

              {mulliganCount > 0 && (
                <Button
                  onClick={confirmBottom}
                  variant="default"
                  className="flex-1 gap-2"
                >
                  Confirm
                </Button>
              )}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {modalCardData && (
        <CardDetailModal
          open={isCardModalOpen}
          onOpenChange={handleCardModalOpenChange}
          card={modalCardData}
        />
      )}
    </>
  );
}
