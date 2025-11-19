"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { toast } from "sonner";

import { useKeyPress } from "@/hooks/useKeyPress";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  useViewMode,
  type ViewMode,
} from "@/components/context/view-mode-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kbd } from "@/components/ui/kbd";
import { ManaCost } from "@/components/ui/mana-cost";
import { CardImage } from "@/components/ui/card-image";
import SampleHandDrawer from "@/components/decks/sample-hand-drawer";
import DeckStatistics from "@/components/decks/deck-statistics";
import DeckLegalityNotice from "@/components/decks/legality-notice";
import {
  CardDetailModal,
  type CardDetailModalProps,
} from "@/components/card/card-detail-modal";
import dynamic from "next/dynamic";
const DeckViewControls = dynamic(
  () =>
    import("@/components/decks/deck-view-controls").then(
      (m) => m.DeckViewControls,
    ),
  { ssr: false },
);

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

import {
  ClipboardCopy,
  BookOpen,
  Users,
  ArrowLeft,
  BarChart3,
  Download,
} from "lucide-react";

import type { DeckWithDetails, DeckCardWithDetails } from "#/backend/src/types";
import { getPrimaryCardType } from "@/utils/card-utils";
import { getCardImageUri } from "@/lib/image-utils";

/* -------------------------------------------------------------------------- */
/* Utility helpers                                                            */
/* -------------------------------------------------------------------------- */

const CARD_TYPE_ORDER = [
  "Creature",
  "Planeswalker",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Battle",
  "Land",
  "Other",
  "Unknown",
];

/* -------------------------------------------------------------------------- */
/* Data selectors                                                             */
/* -------------------------------------------------------------------------- */

const getCommanders = (d: DeckWithDetails): DeckCardWithDetails[] =>
  d.cards?.filter((c) => c.is_commander) ?? [];

const getMainboard = (d: DeckWithDetails): DeckCardWithDetails[] =>
  d.cards?.filter(
    (c) => !c.is_commander && !c.is_sideboard && !c.is_maybeboard,
  ) ?? [];

const getSideboard = (d: DeckWithDetails): DeckCardWithDetails[] =>
  d.cards?.filter((c) => c.is_sideboard) ?? [];

const getMaybeboard = (d: DeckWithDetails): DeckCardWithDetails[] =>
  d.cards?.filter((c) => c.is_maybeboard) ?? [];

/* -------------------------------------------------------------------------- */
/* Presentational helpers                                                     */
/* -------------------------------------------------------------------------- */

const DeckCardListItem: React.FC<{
  deckCard: DeckCardWithDetails;
  onClick: () => void;
}> = ({ deckCard, onClick }) => {
  const imgUri = getCardImageUri(deckCard.card);
  const isSmall = useMediaQuery("(max-width: 640px)");
  const tooltipSide: "top" | "right" = isSmall ? "top" : "right";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100} disableHoverableContent>
        <TooltipTrigger asChild>
          <div
            onClick={onClick}
            className="flex justify-between items-center py-1 px-0.5 cursor-pointer hover:bg-accent rounded-sm transition-colors"
          >
            <span className="truncate">
              {deckCard.quantity}x {deckCard.card.name}
            </span>
            {deckCard.card.mana_cost && (
              <ManaCost manaCost={deckCard.card.mana_cost} size="xs" asImage />
            )}
          </div>
        </TooltipTrigger>

        {imgUri && (
          <TooltipContent
            side={tooltipSide}
            align="start"
            sideOffset={8}
            className="p-0"
          >
            <CardImage
              src={imgUri}
              alt={deckCard.card.name}
              className="w-[250px] max-h-[80vh] rounded shadow-lg"
            />
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

interface CardGroupProps {
  title: string;
  cards: DeckCardWithDetails[];
  viewMode: ViewMode;
  onCardClick: (dc: DeckCardWithDetails) => void;
}

const CardGroup: React.FC<CardGroupProps> = ({
  title,
  cards,
  viewMode,
  onCardClick,
}) => {
  const grouped = useMemo(() => {
    return cards.reduce(
      (acc, dc) => {
        const key = getPrimaryCardType(dc.card.type_line);
        if (!acc[key]) acc[key] = [];
        acc[key].push(dc);
        return acc;
      },
      {} as Record<string, DeckCardWithDetails[]>,
    );
  }, [cards]);

  if (cards.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-semibold py-3 mb-4 border-b border-border">
        {title} ({cards.reduce((s, c) => s + c.quantity, 0)})
      </h3>

      {viewMode === "grid" ? (
        CARD_TYPE_ORDER.map((type) => {
          const list = grouped[type];
          if (!list?.length) return null;
          const count = list.reduce((s, c) => s + c.quantity, 0);

          return (
            <div key={type} className="mb-6">
              <h4 className="text-md font-medium text-muted-foreground mb-3 pl-2 border-l-2 border-primary uppercase">
                {type} ({count})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {list
                  .sort((a, b) => a.card.name.localeCompare(b.card.name))
                  .map((dc) => {
                    const img = getCardImageUri(dc.card);
                    return (
                      <div
                        key={dc.id}
                        onClick={() => onCardClick(dc)}
                        className="relative group cursor-pointer"
                      >
                        <CardImage
                          src={img}
                          alt={dc.card.name}
                          className="rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200"
                          draggable={true}
                        />
                        <Badge className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5">
                          {dc.quantity}x
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
          {CARD_TYPE_ORDER.map((type) => {
            const list = grouped[type];
            if (!list?.length) return null;
            const count = list.reduce((s, c) => s + c.quantity, 0);

            return (
              <div key={type} className="min-w-[180px]">
                <h4 className="flex items-center text-sm font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
                  {type} ({count})
                </h4>
                <div className="space-y-0.5 text-xs">
                  {list
                    .sort((a, b) => a.card.name.localeCompare(b.card.name))
                    .map((dc) => (
                      <DeckCardListItem
                        key={dc.id}
                        deckCard={dc}
                        onClick={() => onCardClick(dc)}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Export helpers                                                             */
/* -------------------------------------------------------------------------- */

const downloadFile = (data: string, filename: string, mime: string): void => {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const formatDeckAsText = (
  commanders: DeckCardWithDetails[],
  main: DeckCardWithDetails[],
  side: DeckCardWithDetails[],
  arena = false,
): string => {
  const makeLine = (dc: DeckCardWithDetails) =>
    arena
      ? `${dc.quantity} ${dc.card.name} (${dc.card.set.toUpperCase()}) ${dc.card.collector_number}`
      : `${dc.quantity}x ${dc.card.name}`;

  let out = "";

  if (commanders.length) {
    out += arena ? "Commander\n" : "Commander:\n";
    commanders.forEach((dc) => (out += makeLine(dc) + "\n"));
    out += "\n";
  }

  out += arena ? "Deck\n" : "Mainboard:\n";
  main.forEach((dc) => (out += makeLine(dc) + "\n"));

  if (side.length) {
    out += "\n";
    out += arena ? "Sideboard\n" : "Sideboard:\n";
    side.forEach((dc) => (out += makeLine(dc) + "\n"));
  }

  return out.trim();
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

interface Props {
  initialDeck: DeckWithDetails;
}

export default function DeckViewClient({ initialDeck }: Props) {
  /* ---------- routing / loader ---------- */
  const router = useRouter();
  const loader = useTopLoader();
  const manualNav = useRef(false);

  useEffect(
    () => () => {
      if (manualNav.current) loader.done();
    },
    [loader],
  );

  /* ---------- keybinds ---------- */
  useKeyPress(
    "b",
    () => {
      loader.start();
      manualNav.current = true;
      startTransition(() => router.back());
    },
    { alt: true },
  );

  /* ---------- context ---------- */
  const { viewMode, setViewMode } = useViewMode(); // <— keeps grid/list working

  /* ---------- local state ---------- */
  const [activeTab, setActiveTab] = useState<"cards" | "stats">("cards");
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] =
    useState<CardDetailModalProps["card"]>(null);

  useKeyPress("c", () => setActiveTab("cards"), { alt: true });
  useKeyPress("s", () => setActiveTab("stats"), { alt: true });
  useKeyPress("k", () => setIsCopyMenuOpen(true), { alt: true });

  /* ---------- derived lists ---------- */
  const commanders = useMemo(() => getCommanders(initialDeck), [initialDeck]);
  const mainboard = useMemo(() => getMainboard(initialDeck), [initialDeck]);
  const sideboard = useMemo(() => getSideboard(initialDeck), [initialDeck]);
  const maybeboard = useMemo(() => getMaybeboard(initialDeck), [initialDeck]);

  const totalMain = useMemo(
    () =>
      mainboard.reduce((s, c) => s + c.quantity, 0) +
      commanders.reduce((s, c) => s + c.quantity, 0),
    [mainboard, commanders],
  );
  const totalSide = useMemo(
    () => sideboard.reduce((s, c) => s + c.quantity, 0),
    [sideboard],
  );

  /* ---------- handlers ---------- */
  const openCardModal = useCallback((dc: DeckCardWithDetails) => {
    const modalCard: CardDetailModalProps["card"] = {
      ...dc.card,
      quantity: dc.quantity,
      is_commander: dc.is_commander,
      is_sideboard: dc.is_sideboard,
    };
    setSelectedCard(modalCard);
    setIsCardModalOpen(true);
  }, []);

  const copyToClipboard = useCallback(
    (mode: "text" | "arena") => {
      navigator.clipboard
        .writeText(
          formatDeckAsText(commanders, mainboard, sideboard, mode === "arena"),
        )
        .then(() => toast.success("Copied decklist"))
        .catch(() => toast.error("Copy failed"));
    },
    [commanders, mainboard, sideboard],
  );

  const downloadDeckFile = useCallback(
    (type: "txt" | "arena" | "json" | "csv") => {
      const name = initialDeck.name.replace(/\s+/g, "-").toLowerCase();
      const ts = new Date().toISOString();

      if (type === "txt" || type === "arena") {
        const data = formatDeckAsText(
          commanders,
          mainboard,
          sideboard,
          type === "arena",
        );
        downloadFile(data, `${name}-${type}-${ts}.txt`, "text/plain");
        return;
      }

      if (type === "json") {
        const buildEntry = (
          section: "mainboard" | "sideboard" | "maybeboard",
          dc: DeckCardWithDetails,
        ) => ({
          object: "deck_entry",
          id: dc.id,
          deck_id: initialDeck.id,
          section,
          cardinality: null,
          count: dc.quantity,
          raw_text: `${dc.quantity} ${dc.card.name}`,
          found: true,
          printing_specified: false,
          finish: dc.card.finishes?.[0] ?? null,
          card_digest: {
            object: "card_digest",
            id: dc.card.id,
            oracle_id: dc.card.oracle_id,
            name: dc.card.name,
            scryfall_uri: dc.card.scryfall_uri,
            mana_cost: dc.card.mana_cost,
            type_line: dc.card.type_line,
            collector_number: dc.card.collector_number,
            set: dc.card.set,
            image_uris: {
              front:
                dc.card.image_uris?.large ??
                dc.card.image_uris?.normal ??
                undefined,
            },
          },
        });

        const json = {
          object: "deck",
          id: initialDeck.id,
          name: initialDeck.name,
          format: initialDeck.format,
          layout: "constructed",
          uri: null,
          scryfall_uri: null,
          description: initialDeck.description ?? null,
          trashed: false,
          in_compliance: true,
          sections: {
            primary: ["mainboard"],
            secondary: ["sideboard", "maybeboard"],
          },
          entries: {
            mainboard: mainboard.map((c) => buildEntry("mainboard", c)),
            sideboard: sideboard.map((c) => buildEntry("sideboard", c)),
            maybeboard: maybeboard.map((c) => buildEntry("maybeboard", c)),
          },
        };

        downloadFile(
          JSON.stringify(json, null, 2),
          `${name}-${ts}.json`,
          "application/json",
        );
        return;
      }

      if (type === "csv") {
        const headers = [
          "section",
          "count",
          "name",
          "mana_cost",
          "type",
          "set",
          "set_code",
          "collector_number",
          "lang",
          "rarity",
          "artist",
          "finish",
          "scryfall_uri",
          "scryfall_id",
        ];

        const collect = (sec: string, arr: DeckCardWithDetails[]) =>
          arr.map((dc) => {
            const c = dc.card;
            return [
              sec,
              dc.quantity,
              `"${c.name.replace(/"/g, '""')}"`,
              c.mana_cost ?? "",
              `"${c.type_line?.replace(/"/g, '""') ?? ""}"`,
              `"${c.set_name?.replace(/"/g, '""') ?? ""}"`,
              c.set,
              c.collector_number,
              c.lang ?? "en",
              c.rarity,
              `"${c.artist?.replace(/"/g, '""') ?? ""}"`,
              c.finishes?.[0] ?? "",
              c.scryfall_uri,
              c.id,
            ].join(",");
          });

        const rows = [
          ...collect("commander", commanders),
          ...collect("mainboard", mainboard),
          ...collect("sideboard", sideboard),
          ...collect("maybeboard", maybeboard),
        ];

        downloadFile(
          [headers.join(","), ...rows].join("\n"),
          `${name}-${ts}.csv`,
          "text/csv",
        );
      }
    },
    [initialDeck, commanders, mainboard, sideboard, maybeboard],
  );

  /* ---------------------------------------------------------------------- */
  /* render                                                                  */
  /* ---------------------------------------------------------------------- */

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);

  return (
    <>
      <div className="container mx-auto max-w-6xl py-8 px-4">
        {/* Back button -------------------------------------------------- */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loader.start();
            manualNav.current = true;
            startTransition(() => router.back());
          }}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Decks
          <div className="hidden lg:flex gap-1 ml-2 items-center">
            <Kbd>Alt</Kbd>
            <Kbd>B</Kbd>
          </div>
        </Button>

        {/* Header ------------------------------------------------------- */}
        <div className="mb-8 pb-6 border-b border-border">
          <h2 className="text-4xl font-beleren-caps font-bold tracking-tight mb-2">
            {initialDeck.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm">
            <Badge
              variant="outline"
              className="text-base px-3 py-1 capitalize flex items-center gap-1.5"
            >
              <BookOpen className="h-4 w-4" /> {initialDeck.format}
            </Badge>
            <span>
              Updated: {new Date(initialDeck.updated_at).toLocaleDateString()}
            </span>
            <span>Total Cards: {totalMain + totalSide}</span>
          </div>
          {initialDeck.description && (
            <p className="mt-3 text-md text-muted-foreground max-w-3xl">
              {initialDeck.description}
            </p>
          )}
        </div>

        <DeckLegalityNotice
          deckId={initialDeck.id}
          deckFormat={initialDeck.format}
          mainboardCards={[
            ...getCommanders(initialDeck).map((c) => ({
              scryfall_id: c.card.id,
              name: c.card.name,
              quantity: c.quantity,
              is_commander: c.is_commander,
              cardDetails: {
                type_line: c.card.type_line,
                color_identity: c.card.color_identity,
                name: c.card.name,
                keywords: c.card.keywords ?? [],
                legalities: c.card.legalities,
                oracle_text: c.card.oracle_text ?? null,
              },
            })),
            ...getMainboard(initialDeck).map((c) => ({
              scryfall_id: c.card.id,
              name: c.card.name,
              quantity: c.quantity,
              is_sideboard: false,
              cardDetails: {
                type_line: c.card.type_line,
                color_identity: c.card.color_identity,
                name: c.card.name,
                keywords: c.card.keywords ?? [],
                legalities: c.card.legalities,
                oracle_text: c.card.oracle_text ?? null,
              },
            })),
          ]}
          className="mb-6"
        />

        {/* Commander section (EDH) ------------------------------------- */}
        {initialDeck.format === "commander" && commanders.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Commander(s)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {commanders.map((dc) => (
                <div
                  key={dc.id}
                  onClick={() => openCardModal(dc)}
                  className="group cursor-pointer"
                >
                  <CardImage
                    src={
                      dc.card.image_uris?.art_crop ?? dc.card.image_uris?.normal
                    }
                    alt={dc.card.name}
                    className="rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-200 border-2 border-transparent group-hover:border-primary"
                    isCommander
                  />
                  <p className="text-center mt-2 text-sm font-medium group-hover:text-primary">
                    {dc.card.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions ------------------------------------------------------ */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <div className="flex gap-2">
            {/* Export menu */}
            <DropdownMenu
              open={isCopyMenuOpen}
              onOpenChange={setIsCopyMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export Deck
                  <div className="hidden lg:flex gap-1 ml-2 items-center">
                    <Kbd>Alt</Kbd>
                    <Kbd>K</Kbd>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => copyToClipboard("text")}>
                  <ClipboardCopy className="h-4 w-4 mr-2" /> Copy as Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyToClipboard("arena")}>
                  <ClipboardCopy className="h-4 w-4 mr-2" /> Copy for Arena
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => downloadDeckFile("txt")}>
                  <Download className="h-4 w-4 mr-2" /> Download Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadDeckFile("arena")}>
                  <Download className="h-4 w-4 mr-2" /> Download Arena Text
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => downloadDeckFile("csv")}>
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadDeckFile("json")}>
                  <Download className="h-4 w-4 mr-2" /> Download JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <SampleHandDrawer deck={initialDeck} />
          </div>

          {/* Grid / list toggle */}
          <DeckViewControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {mounted && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cards" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Cards
                <div className="hidden lg:flex gap-1 ml-2 items-center">
                  <Kbd>Alt</Kbd>
                  <Kbd>C</Kbd>
                </div>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistics
                <div className="hidden lg:flex gap-1 ml-2 items-center">
                  <Kbd>Alt</Kbd>
                  <Kbd>S</Kbd>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Cards tab */}
            <TabsContent value="cards" className="space-y-6">
              <CardGroup
                title="Mainboard"
                cards={mainboard}
                viewMode={viewMode}
                onCardClick={openCardModal}
              />
              <CardGroup
                title="Sideboard"
                cards={sideboard}
                viewMode={viewMode}
                onCardClick={openCardModal}
              />
              {maybeboard.length > 0 && (
                <CardGroup
                  title="Maybeboard"
                  cards={maybeboard}
                  viewMode={viewMode}
                  onCardClick={openCardModal}
                />
              )}
            </TabsContent>

            {/* Statistics tab */}
            <TabsContent value="stats">
              <DeckStatistics deck={initialDeck} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Modal --------------------------------------------------------- */}
      <CardDetailModal
        open={isCardModalOpen}
        onOpenChange={(o) => {
          setIsCardModalOpen(o);
          if (!o) setSelectedCard(null);
        }}
        card={selectedCard}
      />
    </>
  );
}
