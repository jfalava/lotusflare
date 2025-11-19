// components/decks/bulk-import-modal.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import type {
  ScryfallApiCard,
  ScryfallListResponse,
} from "#/backend/src/types";
import type { EditableDeckCard } from "@/components/decks/editor/types";

interface ParsedCard {
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  isCommander?: boolean;
  isSideboard: boolean;
  originalLine: string;
}

interface ResolvedCard extends ParsedCard {
  scryfallCard?: ScryfallApiCard;
  error?: string;
}

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    cards: {
      mainboard: EditableDeckCard[];
      sideboard: EditableDeckCard[];
      commanderTempId?: string | null;
    },
    mode: "replace" | "append",
  ) => void;
  deckFormat: string;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const [decklistText, setDecklistText] = useState("");
  const [importMode, setImportMode] = useState<"replace" | "append">("append");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedCards, setParsedCards] = useState<ResolvedCard[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const parseDecklist = useCallback((text: string): ParsedCard[] => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const cards: ParsedCard[] = [];
    let currentSection: "mainboard" | "sideboard" | "commander" = "mainboard";

    // Detect format by looking for arena-style parentheses
    const isArenaFormat = lines.some((line) =>
      /^\d+\s+.+\s+\([A-Z0-9]+\)\s+\d+/.test(line),
    );

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Check for section headers
      const lowerLine = line.toLowerCase().trim();

      // Remove colons and check for exact matches or lines that start with the section name
      const cleanLine = lowerLine.replace(/[:\s]+$/, "");

      if (cleanLine === "commander" || lowerLine.startsWith("commander:")) {
        currentSection = "commander";
        continue;
      }
      if (
        cleanLine === "mainboard" ||
        lowerLine.startsWith("mainboard:") ||
        cleanLine === "deck" ||
        lowerLine.startsWith("deck:")
      ) {
        currentSection = "mainboard";
        continue;
      }
      if (cleanLine === "sideboard" || lowerLine.startsWith("sideboard:")) {
        currentSection = "sideboard";
        continue;
      }

      let parsed: ParsedCard | null = null;

      if (isArenaFormat) {
        // Arena format: "4 Stonecoil Serpent (CMM) 976"
        const arenaMatch = line.match(
          /^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+(\d+)$/,
        );
        if (arenaMatch) {
          const [, quantity, name, setCode, collectorNumber] = arenaMatch;
          parsed = {
            quantity: parseInt(quantity, 10),
            name: name.trim(),
            setCode,
            collectorNumber,
            isCommander: currentSection === "commander",
            isSideboard: currentSection === "sideboard",
            originalLine: line,
          };
        }
      } else {
        // Text format: "4x Stonecoil Serpent" or "4 Stonecoil Serpent"
        const textMatch = line.match(/^(\d+)x?\s+(.+)$/);
        if (textMatch) {
          const [, quantity, name] = textMatch;
          parsed = {
            quantity: parseInt(quantity, 10),
            name: name.trim(),
            isCommander: currentSection === "commander",
            isSideboard: currentSection === "sideboard",
            originalLine: line,
          };
        }
      }

      // Fallback: treat any non-header, non-empty line as 1x that card name
      if (!parsed) {
        parsed = {
          quantity: 1,
          name: line.trim(),
          isCommander: currentSection === "commander",
          isSideboard: currentSection === "sideboard",
          originalLine: line,
        };
      }

      if (parsed && parsed.quantity > 0) {
        cards.push(parsed);
      }
    }

    return cards;
  }, []);

  const searchCard = useCallback(
    async (card: ParsedCard): Promise<ResolvedCard> => {
      try {
        let searchQuery: string;

        if (card.setCode && card.collectorNumber) {
          // Arena format - search by set and collector number
          searchQuery = `set:${card.setCode} number:${card.collectorNumber} !"//"`; // Exclude DFC back faces
        } else {
          // Text format - search by exact name
          searchQuery = `!"${card.name}" unique:prints`;
        }

        const response = await fetch(
          `/api/scryfall/cards/search?q=${encodeURIComponent(searchQuery)}`,
        );

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data: ScryfallListResponse<ScryfallApiCard> =
          await response.json();

        if (data.data && data.data.length > 0) {
          let selectedCard: ScryfallApiCard;

          if (card.setCode && card.collectorNumber) {
            // For arena format, we should get the exact card
            selectedCard = data.data[0];
          } else {
            // For text format, find exact name match (case insensitive)
            const exactMatch = data.data.find(
              (c) => c.name.toLowerCase() === card.name.toLowerCase(),
            );
            selectedCard = exactMatch || data.data[0];
          }

          return {
            ...card,
            scryfallCard: selectedCard,
          };
        } else {
          return {
            ...card,
            error: "Card not found",
          };
        }
      } catch (error) {
        return {
          ...card,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [],
  );

  const processDecklist = useCallback(async () => {
    if (!decklistText.trim()) {
      toast.error("Please paste a decklist first.");
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = parseDecklist(decklistText);
      if (parsed.length === 0) {
        toast.error("No valid cards found in the decklist.");
        setIsProcessing(false);
        return;
      }

      // Search for all cards
      const resolved = await Promise.all(
        parsed.map((card) => searchCard(card)),
      );

      setParsedCards(resolved);
      setShowPreview(true);
    } catch (error) {
      console.error("Error processing decklist:", error);
      toast.error("Failed to process decklist.");
    } finally {
      setIsProcessing(false);
    }
  }, [decklistText, parseDecklist, searchCard]);

  const handleImport = useCallback(() => {
    const successfulCards = parsedCards.filter((card) => card.scryfallCard);

    if (successfulCards.length === 0) {
      toast.error("No cards available to import.");
      return;
    }

    const mainboard: EditableDeckCard[] = [];
    const sideboard: EditableDeckCard[] = [];
    let commanderTempId: string | null = null;

    successfulCards.forEach((card) => {
      if (!card.scryfallCard) return;

      const editableCard: EditableDeckCard = {
        scryfall_id: card.scryfallCard.id,
        quantity: card.quantity.toString(),
        is_commander: !!card.isCommander,
        is_sideboard: card.isSideboard,
        cardDetails: card.scryfallCard,
        tempId:
          card.scryfallCard.id + Math.random().toString(36).substring(2, 9),
        canonicalName: card.scryfallCard.name,
      };

      if (card.isCommander) {
        commanderTempId = editableCard.tempId;
        mainboard.push(editableCard);
      } else if (card.isSideboard) {
        sideboard.push(editableCard);
      } else {
        mainboard.push(editableCard);
      }
    });

    onImport({ mainboard, sideboard, commanderTempId }, importMode);

    const failedCount = parsedCards.length - successfulCards.length;
    if (failedCount > 0) {
      toast.warning(
        `Imported ${successfulCards.length} cards. ${failedCount} cards failed to import.`,
      );
    } else {
      toast.success(`Successfully imported ${successfulCards.length} cards!`);
    }

    // Reset state
    setDecklistText("");
    setParsedCards([]);
    setShowPreview(false);
    onOpenChange(false);
  }, [parsedCards, onImport, onOpenChange, importMode]);

  const handleClose = useCallback(() => {
    // Don't clear the textarea when closing
    setParsedCards([]);
    setShowPreview(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const successfulCards = parsedCards.filter((card) => card.scryfallCard);
  const failedCards = parsedCards.filter((card) => !card.scryfallCard);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import Decklist
          </DialogTitle>
          <DialogDescription className="grid">
            <span>
              Headers like "<code>Mainboard:</code>" , "<code>Sideboard:</code>"
              , and "<code>Commander:</code>" will be recognized.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showPreview ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="importMode" className="mb-2">
                    Import Mode
                  </Label>
                  <Select
                    value={importMode}
                    onValueChange={(value: "replace" | "append") =>
                      setImportMode(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replace">
                        Replace current deck
                      </SelectItem>
                      <SelectItem value="append">
                        Add to current deck
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="decklist" className="mb-2">
                  Decklist
                </Label>
                <Textarea
                  id="decklist"
                  placeholder={`Paste your decklist here...

Example formats:
Text: 4x Lightning Bolt
Arena: 4 Lightning Bolt (M21) 159

Mainboard:
4x Stonecoil Serpent

Sideboard:
3x Mystical Dispute

Commander:
1x Tajic, Blade of the Legion
`}
                  value={decklistText}
                  onChange={(e) => setDecklistText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Import Preview</h3>
                <div className="flex items-center gap-2">
                  {/* mode badge */}
                  <Badge variant="outline" className="text-xs">
                    {importMode === "append"
                      ? "Adding to current deck"
                      : "Replacing current deck"}
                  </Badge>
                  {/* found / failed */}
                  <Badge
                    variant={
                      successfulCards.length > 0 ? "default" : "secondary"
                    }
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {successfulCards.length} found
                  </Badge>
                  {failedCards.length > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {failedCards.length} failed
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded-md p-4">
                <div className="space-y-2">
                  {parsedCards.map((card, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded ${
                        card.scryfallCard
                          ? "bg-green-50 dark:bg-green-950"
                          : "bg-red-50 dark:bg-red-950"
                      }`}
                    >
                      <div className="flex-1">
                        <span className="font-medium">
                          {card.quantity}x {card.name}
                        </span>
                        {card.setCode && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({card.setCode}) {card.collectorNumber}
                          </span>
                        )}
                        {card.isCommander && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Commander
                          </Badge>
                        )}
                        {card.isSideboard && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Sideboard
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {card.scryfallCard ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-red-600">
                              {card.error}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {!showPreview ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={processDecklist}
                disabled={isProcessing || !decklistText.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Preview Import
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Back to Edit
              </Button>
              <Button
                onClick={handleImport}
                disabled={successfulCards.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Import {successfulCards.length} Cards
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportModal;
