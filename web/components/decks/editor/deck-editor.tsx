// components/decks/editor/deck-editor.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useTopLoader } from "nextjs-toploader";
import { Button } from "@/components/ui/button";
import { useKeyPress } from "@/hooks/useKeyPress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import DeckDetails from "@/components/decks/editor/deck-details";
import AddCardsPanel from "@/components/decks/editor/add-cards-panel";
import DeckSection from "@/components/decks/editor/deck-section";
import DeckActions from "@/components/decks/editor/deck-actions";
import { CardDetailModal } from "@/components/card/card-detail-modal";
import BulkImportModal from "@/components/decks/bulk-import-modal";
import { DeckLegalityChecker } from "@/components/decks/legality-checker";
import DeckStatistics from "@/components/decks/deck-statistics";
import { toast } from "sonner";
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
import type {
  EditableDeckCard,
  DeckState,
  DeckFormat,
} from "@/components/decks/editor/types";
import type {
  ScryfallApiCard,
  DeckWithDetails,
  CreateDeckPayload,
  UpdateDeckPayload,
  DeckCardPayload,
  DeckCardWithDetails,
  ScryfallListResponse,
} from "#/backend/src/types";

const initialDeckState: DeckState = {
  name: "",
  format: "modern",
  description: "",
  mainboard: [],
  sideboard: [],
  maybeboard: [],
};

interface DeckEditorProps {
  deckId?: string;
}

const DeckEditor: React.FC<DeckEditorProps> = ({ deckId }) => {
  const router = useRouter();
  const loader = useTopLoader();
  const manualNav = useRef(false);

  const [deck, setDeck] = useState<DeckState>(initialDeckState);
  const [maybeboardEnabled, setMaybeboardEnabled] = useState<boolean>(false);
  const [commanderTempId, setCommanderTempId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!deckId);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showBulkImportModal, setShowBulkImportModal] =
    useState<boolean>(false);

  const [scryfallSearchTerm, setScryfallSearchTerm] = useState<string>("");
  const [scryfallResults, setScryfallResults] = useState<ScryfallApiCard[]>([]);
  const [isScryfallSearching, setIsScryfallSearching] =
    useState<boolean>(false);
  const [brewMode, setBrewMode] = useState<boolean>(false);
  const [sendToMayeboardInBrew, setSendToMayeboardInBrew] =
    useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedCardForDetailModal, setSelectedCardForDetailModal] =
    useState<ScryfallApiCard | null>(null);

  // Alt+B to go back
  useKeyPress(
    "b",
    () => {
      loader.start();
      manualNav.current = true;
      startTransition(() => {
        router.push("/edit/decks");
      });
    },
    { alt: true },
  );

  // Build a preview DeckWithDetails for statistics/sample-hand
  const deckPreviewData: DeckWithDetails = useMemo(() => {
    const cards: DeckCardWithDetails[] = [
      ...deck.mainboard.map((c, i) => ({
        id: (i + 1000).toString(),
        card_scryfall_id: c.scryfall_id,
        quantity: parseInt(c.quantity, 10) || 0,
        is_commander: c.is_commander,
        is_sideboard: false,
        is_maybeboard: false,
        added_at: new Date().toISOString(),
        card: c.cardDetails,
      })),
      ...deck.sideboard.map((c, i) => ({
        id: (i + 2000).toString(),
        card_scryfall_id: c.scryfall_id,
        quantity: parseInt(c.quantity, 10) || 0,
        is_commander: false,
        is_sideboard: true,
        is_maybeboard: false,
        added_at: new Date().toISOString(),
        card: c.cardDetails,
      })),
    ];
    return {
      id: deckId || "",
      name: deck.name || "Draft Deck",
      format: deck.format,
      description: deck.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cards,
    };
  }, [deck, deckId]);

  // Fetch existing deck
  const fetchDeck = useCallback(
    async (id: string) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/decks/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Deck not found. You can create a new one.");
            router.replace("/edit/decks/new");
            return;
          }
          throw new Error(res.statusText);
        }
        const data: DeckWithDetails = await res.json();

        const mainboard: EditableDeckCard[] = data.cards
          .filter((c) => !c.is_sideboard && !c.is_maybeboard)
          .map((c) => ({
            scryfall_id: c.card_scryfall_id,
            quantity: c.quantity.toString(),
            is_commander: !!c.is_commander,
            is_sideboard: false,
            cardDetails: c.card,
            canonicalName: c.card.name,
            tempId:
              c.card_scryfall_id + Math.random().toString(36).substring(2, 9),
          }));

        const sideboard: EditableDeckCard[] = data.cards
          .filter((c) => c.is_sideboard)
          .map((c) => ({
            scryfall_id: c.card_scryfall_id,
            quantity: c.quantity.toString(),
            is_commander: false,
            is_sideboard: true,
            cardDetails: c.card,
            canonicalName: c.card.name,
            tempId:
              c.card_scryfall_id + Math.random().toString(36).substring(2, 9),
          }));

        const maybeboard: EditableDeckCard[] = data.cards
          .filter((c) => c.is_maybeboard)
          .map((c) => ({
            scryfall_id: c.card_scryfall_id,
            quantity: c.quantity.toString(),
            is_commander: false,
            is_sideboard: false,
            cardDetails: c.card,
            canonicalName: c.card.name,
            tempId:
              c.card_scryfall_id + Math.random().toString(36).substring(2, 9),
          }));

        const cmd = mainboard.find((x) => x.is_commander);
        setCommanderTempId(cmd ? cmd.tempId : null);

        setDeck({
          name: data.name,
          format: data.format as DeckFormat,
          description: data.description || "",
          mainboard,
          sideboard,
          maybeboard,
        });
        setMaybeboardEnabled(maybeboard.length > 0);
      } catch (err) {
        console.error("Error fetching deck:", err);
        toast.error(
          err instanceof Error ? err.message : `Could not load deck.`,
        );
        router.push("/edit/decks");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // Initial load / reset
  useEffect(() => {
    if (deckId) fetchDeck(deckId);
  }, [deckId, fetchDeck]);

  // Finish loader on manual nav
  useEffect(() => {
    return () => {
      if (manualNav.current) {
        loader.done();
      }
    };
  }, [loader]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setDeck((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormatChange = (value: DeckFormat) => {
    setDeck((prev) => ({ ...prev, format: value }));
    if (value !== "commander") {
      setCommanderTempId(null);
      setDeck((prev) => ({
        ...prev,
        mainboard: prev.mainboard.map((c) => ({
          ...c,
          is_commander: false,
        })),
      }));
    }
  };

  const handleClearScryfallSearch = () => {
    setScryfallSearchTerm("");
    setScryfallResults([]);
    setIsPopoverOpen(false);
  };

  const addCardToDeck = useCallback(
    (
      card: ScryfallApiCard,
      targetSection: "mainboard" | "sideboard" | "maybeboard" = "mainboard",
    ) => {
      setDeck((prevDeck) => {
        const sectionCards = [...prevDeck[targetSection]];
        const idx = sectionCards.findIndex((dc) => dc.scryfall_id === card.id);
        if (idx > -1) {
          const curQty = parseInt(sectionCards[idx].quantity, 10) || 0;
          sectionCards[idx].quantity = (curQty + 1).toString();
        } else {
          sectionCards.push({
            scryfall_id: card.id,
            quantity: "1",
            is_commander: false,
            is_sideboard: targetSection === "sideboard",
            cardDetails: card,
            canonicalName: card.name,
            tempId: card.id + Math.random().toString(36).substring(2, 9),
          });
        }
        return { ...prevDeck, [targetSection]: sectionCards };
      });
      setScryfallSearchTerm("");
      setScryfallResults([]);
      setIsPopoverOpen(false);
    },
    [],
  );

  const handleScryfallSearch = useCallback(async () => {
    if (!scryfallSearchTerm.trim() || scryfallSearchTerm.length < 3) {
      setScryfallResults([]);
      setIsPopoverOpen(false);
      setIsScryfallSearching(false);
      return;
    }
    setIsScryfallSearching(true);
    if (!brewMode) setIsPopoverOpen(true);
    try {
      const query = brewMode
        ? `!"${scryfallSearchTerm.trim()}" unique:prints`
        : scryfallSearchTerm;
      const response = await fetch(
        `/api/scryfall/cards/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok)
        throw new Error(`Search failed: ${response.statusText}`);
      const data: ScryfallListResponse<ScryfallApiCard> = await response.json();

      if (brewMode) {
        if (data.data?.length) {
          const exact = data.data.find(
            (c) =>
              c.name.toLowerCase() === scryfallSearchTerm.trim().toLowerCase(),
          );
          const pick = exact ?? data.data[0];
          const targetSection = sendToMayeboardInBrew
            ? "maybeboard"
            : "mainboard";
          if (targetSection === "maybeboard" && !maybeboardEnabled) {
            setMaybeboardEnabled(true);
          }
          addCardToDeck(pick, targetSection);
          toast.success(`Added "${pick.name}" to ${targetSection}`);
          setScryfallSearchTerm("");
          setScryfallResults([]);
          setIsPopoverOpen(false);
        } else {
          toast.error(`No exact matches for "${scryfallSearchTerm.trim()}".`);
        }
      } else {
        setScryfallResults(data.data || []);
      }
    } catch (error) {
      console.error("Search error:", error);
      setScryfallResults([]);
      toast.error(error instanceof Error ? error.message : "Search failed 😔");
    } finally {
      setIsScryfallSearching(false);
    }
  }, [
    scryfallSearchTerm,
    brewMode,
    sendToMayeboardInBrew,
    addCardToDeck,
    maybeboardEnabled,
  ]);

  const handleBulkImport = useCallback(
    (
      imported: {
        mainboard: EditableDeckCard[];
        sideboard: EditableDeckCard[];
        commanderTempId?: string | null;
      },
      mode: "replace" | "append",
    ) => {
      setDeck((prev) => {
        const mainboard =
          mode === "append"
            ? [...prev.mainboard, ...imported.mainboard]
            : imported.mainboard;
        const sideboard =
          mode === "append"
            ? [...prev.sideboard, ...imported.sideboard]
            : imported.sideboard;
        return { ...prev, mainboard, sideboard };
      });
      if (mode === "append") {
        if (imported.commanderTempId) {
          setCommanderTempId(imported.commanderTempId);
        }
      } else {
        setCommanderTempId(imported.commanderTempId ?? null);
      }
    },
    [],
  );

  const handleCardQuantityChange = (
    tempId: string,
    section: "mainboard" | "sideboard" | "maybeboard",
    newQuantity: string,
  ) => {
    setDeck((prev) => ({
      ...prev,
      [section]: prev[section].map((c) =>
        c.tempId === tempId ? { ...c, quantity: newQuantity } : c,
      ),
    }));
  };

  const removeCardFromDeck = (
    tempId: string,
    section: "mainboard" | "sideboard" | "maybeboard",
  ) => {
    setDeck((prev) => ({
      ...prev,
      [section]: prev[section].filter((c) => {
        if (c.tempId === tempId && c.tempId === commanderTempId) {
          setCommanderTempId(null);
        }
        return c.tempId !== tempId;
      }),
    }));
  };

  const setCardAsCommander = (
    tempId: string,
    section: "mainboard" | "sideboard" | "maybeboard",
  ) => {
    if (deck.format !== "commander") {
      toast.error("Commanders only for Commander format.");
      return;
    }
    if (section !== "mainboard") {
      toast.error("Commander must be mainboard.");
      return;
    }
    const newCmd = commanderTempId === tempId ? null : tempId;
    setCommanderTempId(newCmd);
    setDeck((prev) => ({
      ...prev,
      mainboard: prev.mainboard.map((c) => ({
        ...c,
        is_commander: c.tempId === newCmd,
      })),
    }));
  };

  const moveCardToOtherBoard = (
    tempId: string,
    fromSection: "mainboard" | "sideboard" | "maybeboard",
  ) => {
    let toSection: "mainboard" | "sideboard" | "maybeboard" = "mainboard";
    if (fromSection === "mainboard") toSection = "sideboard";
    else if (fromSection === "sideboard") toSection = "mainboard";
    else toSection = "mainboard";

    if (toSection === "sideboard" && deck.format === "commander") {
      toast.error("Cannot move to sideboard in Commander.");
      return;
    }
    if (fromSection === "mainboard" && tempId === commanderTempId) {
      toast.error("Cannot move commander out of mainboard.");
      return;
    }

    const card = deck[fromSection].find((c) => c.tempId === tempId);
    if (!card) return;

    setDeck((prev) => ({
      ...prev,
      [fromSection]: prev[fromSection].filter((c) => c.tempId !== tempId),
      [toSection]: [
        ...prev[toSection],
        {
          ...card,
          is_sideboard: toSection === "sideboard",
          is_commander: false,
        },
      ],
    }));
  };

  const moveCardWithinSection = useCallback(
    (
      dragIndex: number,
      hoverIndex: number,
      sourceSection: "mainboard" | "sideboard" | "maybeboard",
      targetSection: "mainboard" | "sideboard" | "maybeboard",
      itemTempId: string,
    ) => {
      if (sourceSection !== targetSection) {
        if (targetSection === "sideboard" && deck.format === "commander") {
          toast.error("Cannot move to sideboard in Commander.");
          return;
        }
        const card = deck[sourceSection].find((c) => c.tempId === itemTempId);
        if (
          sourceSection === "mainboard" &&
          itemTempId === commanderTempId &&
          targetSection !== "mainboard"
        ) {
          toast.error("Cannot drag commander out of mainboard.");
          return;
        }
        if (!card) return;

        setDeck((prev) => {
          const newSource = prev[sourceSection].filter(
            (c) => c.tempId !== itemTempId,
          );
          const newTarget = [...prev[targetSection]];
          newTarget.splice(hoverIndex, 0, {
            ...card,
            is_sideboard: targetSection === "sideboard",
            is_commander:
              targetSection === "mainboard" && card.tempId === commanderTempId,
          });
          return {
            ...prev,
            [sourceSection]: newSource,
            [targetSection]: newTarget,
          };
        });
        return;
      }

      setDeck((prev) => {
        const sectionCards = [...prev[targetSection]];
        const [removed] = sectionCards.splice(dragIndex, 1);
        sectionCards.splice(hoverIndex, 0, removed);
        return {
          ...prev,
          [targetSection]: sectionCards,
        };
      });
    },
    [deck, commanderTempId],
  );

  const handleSaveDeck = async () => {
    setIsSaving(true);
    const deckPayloadCards: DeckCardPayload[] = [];
    let hasInvalidQuantity = false;

    const processCards = (
      cards: EditableDeckCard[],
      isSideboard: boolean,
      isMaybeboard: boolean,
    ) => {
      for (const c of cards) {
        const qty = parseInt(c.quantity, 10);
        if (isNaN(qty) || qty < 1) {
          toast.error(`Invalid quantity for "${c.cardDetails.name}".`);
          hasInvalidQuantity = true;
          return;
        }
        deckPayloadCards.push({
          scryfall_id: c.scryfall_id,
          quantity: qty,
          is_commander:
            c.tempId === commanderTempId && !isSideboard && !isMaybeboard,
          is_sideboard: isSideboard,
          is_maybeboard: isMaybeboard,
        });
      }
    };

    processCards(deck.mainboard, false, false);
    if (hasInvalidQuantity) {
      setIsSaving(false);
      return;
    }
    processCards(deck.sideboard, true, false);
    if (hasInvalidQuantity) {
      setIsSaving(false);
      return;
    }
    if (maybeboardEnabled) {
      processCards(deck.maybeboard, false, true);
      if (hasInvalidQuantity) {
        setIsSaving(false);
        return;
      }
    }

    const payload: CreateDeckPayload | UpdateDeckPayload = {
      name: deck.name.trim() || "Untitled Deck",
      format: deck.format,
      description: deck.description.trim() || null,
      cards: deckPayloadCards,
    };

    try {
      const url = deckId ? `/api/decks/${deckId}` : "/api/decks";
      const method = deckId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        let apiErrorMessage: string | undefined;
        try {
          const json: unknown = await response.json();
          if (
            typeof json === "object" &&
            json !== null &&
            "message" in json &&
            typeof (json as Record<string, unknown>).message === "string"
          ) {
            apiErrorMessage = String((json as Record<string, unknown>).message);
          }
        } catch {
          // ignore
        }
        throw new Error(
          apiErrorMessage ?? `Save failed: ${response.statusText}`,
        );
      }
      const saved = (await response.json()) as DeckWithDetails;
      toast.success(`Deck "${saved.name}" saved!`);
      if (!deckId && saved.id) {
        router.replace(`/edit/decks/${saved.id}`);
      } else if (deckId) {
        fetchDeck(deckId);
      }
    } catch (err) {
      console.error("Error saving:", err);
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deckId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let apiErrorMessage: string | undefined;
        try {
          const json: unknown = await res.json();
          if (
            typeof json === "object" &&
            json !== null &&
            "message" in json &&
            typeof (json as Record<string, unknown>).message === "string"
          ) {
            apiErrorMessage = String((json as Record<string, unknown>).message);
          }
        } catch {
          // ignore
        }
        throw new Error(apiErrorMessage ?? `Delete failed: ${res.statusText}`);
      }
      toast.success(`Deck "${deck.name}" deleted.`);
      router.push("/edit/decks");
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const extractScryfallIdFromUrl = (url: string): string | null => {
    const re =
      /\/front\/[0-9a-f]\/[0-9a-f]\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(?:jpg|png)/i;
    const m = url.match(re);
    return m ? m[1] : null;
  };

  function isExternalCardDrag(e: React.DragEvent): boolean {
    const html = e.dataTransfer.getData("text/html");
    const uriList = e.dataTransfer.getData("text/uri-list");
    return Boolean(html || uriList);
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!isExternalCardDrag(e)) return;
    const tgt = e.target as HTMLElement;
    if (tgt.closest(".deck-card-row")) return;
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!isExternalCardDrag(e)) return;
    const tgt = e.target as HTMLElement;
    if (tgt.closest(".deck-card-row")) return;
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLElement>) => {
      if (!isExternalCardDrag(e)) return;
      const tgt = e.target as HTMLElement;
      if (tgt.closest(".deck-card-row")) return;
      e.preventDefault();
      setIsDragOver(false);

      let imageUrl: string | null = null;
      const htmlData = e.dataTransfer.getData("text/html");
      if (htmlData) {
        const doc = new DOMParser().parseFromString(htmlData, "text/html");
        const img = doc.querySelector("img");
        imageUrl = img?.src ?? null;
      }
      if (!imageUrl) {
        const uriList = e.dataTransfer.getData("text/uri-list");
        if (uriList) imageUrl = uriList.split("\n")[0];
      }
      if (!imageUrl) {
        toast.error("Couldn't find an image URL");
        return;
      }

      const scryfallId = extractScryfallIdFromUrl(imageUrl);
      if (!scryfallId) {
        toast.error("Not a Scryfall image");
        return;
      }

      try {
        const res = await fetch(`/api/scryfall/cards/${scryfallId}`);
        if (!res.ok) throw new Error(res.statusText);
        const card = (await res.json()) as ScryfallApiCard;

        const targetSection = tgt.closest(".deck-section-sideboard")
          ? "sideboard"
          : tgt.closest(".deck-section-maybeboard")
            ? "maybeboard"
            : "mainboard";

        addCardToDeck(card, targetSection);
        toast.success(`Added ${card.name} to ${targetSection}`);
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Lookup failed");
      }
    },
    [addCardToDeck],
  );

  const isCommanderFormat = deck.format === "commander";

  const legalityCheckMainboard = deck.mainboard.map((c) => ({
    scryfall_id: c.scryfall_id,
    name: c.cardDetails.name,
    quantity: parseInt(c.quantity, 10) || 0,
    is_commander: c.is_commander,
    is_sideboard: c.is_sideboard,
    cardDetails: {
      type_line: c.cardDetails.type_line,
      color_identity: c.cardDetails.color_identity,
      name: c.cardDetails.name,
      keywords: c.cardDetails.keywords,
      legalities: c.cardDetails.legalities,
      oracle_text: c.cardDetails.oracle_text,
    },
  }));

  const hasEnoughCards =
    deck.mainboard.reduce(
      (sum, c) => sum + (parseInt(c.quantity, 10) || 0),
      0,
    ) >= 7;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">
          Loading deck editor...
        </p>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 text-white text-lg pointer-events-none">
          Drop card to add...
        </div>
      )}
      <div className="container mx-auto py-6 px-2 sm:px-4 md:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loader.start();
            manualNav.current = true;
            startTransition(() => {
              router.push("/edit/decks");
            });
          }}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back to Decks</span>
          <div className="hidden items-center gap-1 ml-2 lg:flex">
            <Kbd>Alt</Kbd>
            <Kbd>B</Kbd>
          </div>
        </Button>

        <DeckDetails
          deck={{
            name: deck.name,
            format: deck.format,
            description: deck.description,
          }}
          onInputChange={handleInputChange}
          onFormatChange={handleFormatChange}
          hasEnoughCards={hasEnoughCards}
          deckForSampleHand={deckPreviewData}
        />

        <AddCardsPanel
          searchTerm={scryfallSearchTerm}
          onSearchTermChange={(val) => {
            setScryfallSearchTerm(val);
            if (val.trim().length < 3) {
              setIsPopoverOpen(false);
              setScryfallResults([]);
            }
          }}
          onSearch={handleScryfallSearch}
          onClearSearch={handleClearScryfallSearch}
          results={scryfallResults}
          isLoading={isScryfallSearching}
          open={isPopoverOpen && scryfallSearchTerm.length >= 3}
          onSelectCard={(card) => {
            const targetSection =
              brewMode && sendToMayeboardInBrew ? "maybeboard" : "mainboard";
            if (targetSection === "maybeboard" && !maybeboardEnabled) {
              setMaybeboardEnabled(true);
            }
            addCardToDeck(card, targetSection);
          }}
          onClose={() => setIsPopoverOpen(false)}
          onInputFocus={() => {
            if (
              scryfallSearchTerm.length >= 3 &&
              (scryfallResults.length > 0 || isScryfallSearching)
            ) {
              setIsPopoverOpen(true);
            }
          }}
          onBulkImportClick={() => setShowBulkImportModal(true)}
          brewMode={brewMode}
          onBrewModeChange={setBrewMode}
          sendToMayeboardInBrew={sendToMayeboardInBrew}
          onSendToMayeboardInBrewChange={setSendToMayeboardInBrew}
        />

        <DeckLegalityChecker
          deckId={deckId}
          deckFormat={deck.format}
          mainboardCards={legalityCheckMainboard}
          className="p-4 border rounded-lg bg-card my-8"
        />

        <Accordion type="single" collapsible className="w-full mb-8">
          <div className="p-4 border rounded-lg bg-card space-y-1">
            <AccordionItem value="statistics">
              <AccordionTrigger className="text-base font-semibold">
                <h2 className="text-xl font-semibold">
                  Deck Statistics & Analysis
                </h2>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <DeckStatistics deck={deckPreviewData} />
              </AccordionContent>
            </AccordionItem>
          </div>
        </Accordion>

        <div className="p-4 border rounded-lg bg-card space-y-6 mb-8">
          <DeckSection
            title="Mainboard"
            cards={deck.mainboard}
            section="mainboard"
            onQuantityChange={handleCardQuantityChange}
            onRemove={removeCardFromDeck}
            onSetCommander={
              deck.format === "commander" ? setCardAsCommander : undefined
            }
            commanderTempId={commanderTempId}
            onMoveToOtherBoard={moveCardToOtherBoard}
            onViewDetails={setSelectedCardForDetailModal}
            moveCard={moveCardWithinSection}
            deckFormat={deck.format}
            isDetailModalOpen={!!selectedCardForDetailModal}
          />

          {!isCommanderFormat && (
            <DeckSection
              title="Sideboard"
              cards={deck.sideboard}
              section="sideboard"
              onQuantityChange={handleCardQuantityChange}
              onRemove={removeCardFromDeck}
              onMoveToOtherBoard={moveCardToOtherBoard}
              onViewDetails={setSelectedCardForDetailModal}
              moveCard={moveCardWithinSection}
              deckFormat={deck.format}
              isDetailModalOpen={!!selectedCardForDetailModal}
            />
          )}

          {maybeboardEnabled && (
            <DeckSection
              title="Maybeboard"
              cards={deck.maybeboard}
              section="maybeboard"
              onQuantityChange={handleCardQuantityChange}
              onRemove={removeCardFromDeck}
              onMoveToOtherBoard={moveCardToOtherBoard}
              onViewDetails={setSelectedCardForDetailModal}
              moveCard={moveCardWithinSection}
              deckFormat={deck.format}
              isDetailModalOpen={!!selectedCardForDetailModal}
            />
          )}

          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMaybeboardEnabled((v) => !v)}
              className="w-full"
            >
              {maybeboardEnabled ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" /> Hide Maybeboard
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" /> Show Maybeboard
                </>
              )}
            </Button>
          </div>
        </div>

        <DeckActions
          deckId={deckId}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onDeleteClick={() => setShowDeleteConfirm(true)}
          onSaveClick={handleSaveDeck}
        />

        {selectedCardForDetailModal && (
          <CardDetailModal
            open={!!selectedCardForDetailModal}
            onOpenChange={(open) =>
              !open && setSelectedCardForDetailModal(null)
            }
            card={selectedCardForDetailModal}
          />
        )}

        {showDeleteConfirm && deckId && (
          <AlertDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the deck "
                  <strong>{deck.name}</strong>"? This action cannot be undone.
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
      </div>

      <BulkImportModal
        open={showBulkImportModal}
        onOpenChange={setShowBulkImportModal}
        onImport={handleBulkImport}
        deckFormat={deck.format}
      />
    </div>
  );
};

export default DeckEditor;
