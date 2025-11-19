// components/inventory/add-print-modal.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CARD_CONDITIONS_ARRAY } from "#/backend/src/validators";
import { LANGUAGE_OPTIONS } from "@/components/inventory/shared/inventory-constants";
import {
  CardCondition,
  InventoryDetailWithCardDetails,
  LanguageCode,
  PlaceDbo,
  ScryfallApiCard,
} from "#/backend/src/types";
import { ManaCost } from "@/components/ui/mana-cost";
import { getCardImageUri } from "@/utils/card-utils";
import { searchScryfallCards } from "@/lib/api-server";

interface AddPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oracleId: string;
  cardName: string;
  places: PlaceDbo[];
  onSuccess: (detail: InventoryDetailWithCardDetails) => void;
}

// Sentinel for "no place selected"
const NONE_PLACE_VALUE = "__none__";

export const AddPrintModal: React.FC<AddPrintModalProps> = ({
  open,
  onOpenChange,
  oracleId,
  cardName,
  places,
  onSuccess,
}) => {
  const [quantity, setQuantity] = React.useState<number>(1);
  const [condition, setCondition] = React.useState<CardCondition>("NM");
  const [isFoil, setIsFoil] = React.useState<boolean>(false);
  const [language, setLanguage] = React.useState<LanguageCode>("en");
  const [placeId, setPlaceId] = React.useState<string>(NONE_PLACE_VALUE);
  const [notes, setNotes] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Print selection state
  const [selectedCard, setSelectedCard] =
    React.useState<ScryfallApiCard | null>(null);
  const [availablePrints, setAvailablePrints] = React.useState<
    ScryfallApiCard[]
  >([]);
  const [isLoadingPrints, setIsLoadingPrints] = React.useState<boolean>(false);
  const [printsOpen, setPrintsOpen] = React.useState<boolean>(false);

  // Load available prints when modal opens
  React.useEffect(() => {
    if (!open || !oracleId) return;

    let ignore = false;
    queueMicrotask(() => setIsLoadingPrints(true));

    searchScryfallCards(`oracleid:${oracleId} unique:prints`)
      .then((data) => {
        if (!ignore) {
          setAvailablePrints(data.data || []);
          if (data.data?.length) setSelectedCard(data.data[0]);
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error("Error fetching prints:", error);
          toast.error("Failed to load available prints");
          setAvailablePrints([]);
        }
      })
      .finally(() => {
        if (!ignore) queueMicrotask(() => setIsLoadingPrints(false));
      });

    return () => {
      ignore = true;
    };
  }, [open, oracleId]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (open) return;

    queueMicrotask(() => {
      setQuantity(1);
      setCondition("NM");
      setIsFoil(false);
      setLanguage("en");
      setPlaceId(NONE_PLACE_VALUE);
      setNotes("");
      setSelectedCard(null);
      setAvailablePrints([]);
      setPrintsOpen(false);
    });
  }, [open]);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedCard) {
        toast.error("Please select a print of the card.");
        return;
      }

      setIsLoading(true);

      try {
        const detailPayload = {
          master_oracle_id: oracleId,
          scryfall_card_id: selectedCard.id,
          place_id: placeId === NONE_PLACE_VALUE ? null : Number(placeId),
          quantity,
          condition,
          is_foil: isFoil,
          language,
          notes: notes || null,
        };

        const detailRes = await fetch("/api/v2/inventory/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(detailPayload),
        });

        if (!detailRes.ok) {
          const err = await detailRes.json().catch(() => null);
          throw new Error(
            (err as { message?: string })?.message ||
              "Failed to add inventory detail",
          );
        }

        const detailData =
          (await detailRes.json()) as InventoryDetailWithCardDetails;

        onSuccess(detailData);
        // Let the parent handle closing the modal after success
      } catch (error: unknown) {
        toast.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedCard,
      oracleId,
      condition,
      isFoil,
      language,
      notes,
      onSuccess,
      placeId,
      quantity,
    ],
  );

  const selectedLanguageOption = LANGUAGE_OPTIONS.find(
    (l) => l.code === language,
  );
  const selectedPlace = places.find((p) => String(p.id) === placeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Copy of "{cardName}"</DialogTitle>
          <DialogDescription>
            Select a specific print and set quantity, condition, and other
            details.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-hidden flex flex-col gap-4 py-4"
        >
          {/* Print Selection */}
          <div className="flex flex-col space-y-1">
            <Label htmlFor="print-select">Select Print</Label>
            {isLoadingPrints ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading available prints...
              </div>
            ) : (
              <Popover open={printsOpen} onOpenChange={setPrintsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="print-select"
                    variant="outline"
                    className="justify-between h-auto p-3"
                    disabled={availablePrints.length === 0}
                  >
                    {selectedCard ? (
                      <div className="flex items-center gap-3 text-left min-w-0 flex-1">
                        <img
                          src={getCardImageUri(selectedCard)}
                          alt=""
                          className="w-8 h-8 object-cover rounded border flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">
                              {selectedCard.set_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {selectedCard.set.toUpperCase()} #
                              {selectedCard.collector_number}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {selectedCard.mana_cost && (
                              <ManaCost
                                manaCost={selectedCard.mana_cost}
                                size="xs"
                              />
                            )}
                            <span>{selectedCard.rarity}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {availablePrints.length === 0
                          ? "No prints available"
                          : "Select a print..."}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[400px]" align="start">
                  <Command>
                    <CommandInput placeholder="Search prints..." />
                    <CommandEmpty>No prints found.</CommandEmpty>
                    <ScrollArea className="max-h-[300px]">
                      <CommandGroup>
                        {availablePrints.map((card) => {
                          const imgUri = getCardImageUri(card);
                          return (
                            <CommandItem
                              key={card.id}
                              onSelect={() => {
                                setSelectedCard(card);
                                setPrintsOpen(false);
                              }}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <img
                                src={imgUri}
                                alt=""
                                className="w-8 h-8 object-cover rounded border flex-shrink-0"
                                loading="lazy"
                              />
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm truncate">
                                    {card.set_name}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {card.set.toUpperCase()} #
                                    {card.collector_number}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {card.mana_cost && (
                                    <ManaCost
                                      manaCost={card.mana_cost}
                                      size="xs"
                                    />
                                  )}
                                  <span>{card.rarity}</span>
                                  <span>•</span>
                                  <span>{card.released_at}</span>
                                </div>
                              </div>
                              {selectedCard?.id === card.id && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </ScrollArea>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="flex flex-col space-y-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>

            {/* Condition */}
            <div className="flex flex-col space-y-1">
              <Label htmlFor="condition">Condition</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="condition"
                    variant="outline"
                    className="justify-between"
                  >
                    {condition}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[150px]">
                  <Command>
                    <CommandInput placeholder="Search condition..." />
                    <CommandEmpty>No condition found.</CommandEmpty>
                    <CommandGroup>
                      {CARD_CONDITIONS_ARRAY.map((c) => (
                        <CommandItem key={c} onSelect={() => setCondition(c)}>
                          {c}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Foil */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_foil"
                checked={isFoil}
                onCheckedChange={(v) => setIsFoil(!!v)}
              />
              <Label htmlFor="is_foil">Premium finish</Label>
            </div>

            {/* Language */}
            <div className="flex flex-col space-y-1">
              <Label htmlFor="language">Language</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="language"
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <span>{selectedLanguageOption?.flag}</span>
                    <span>{selectedLanguageOption?.nativeName}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[200px]">
                  <Command>
                    <CommandInput placeholder="Search language..." />
                    <CommandEmpty>No language found.</CommandEmpty>
                    <CommandGroup>
                      {LANGUAGE_OPTIONS.map((l) => (
                        <CommandItem
                          key={l.code}
                          onSelect={() => setLanguage(l.code)}
                          className="flex gap-2"
                        >
                          <span>{l.flag}</span>
                          <span>{l.nativeName}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Place */}
            <div className="col-span-2 flex flex-col space-y-1">
              <Label htmlFor="place">Location</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="place"
                    variant="outline"
                    className="justify-between"
                  >
                    {placeId === NONE_PLACE_VALUE ? "-" : selectedPlace?.name}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[200px]">
                  <Command>
                    <CommandInput placeholder="Search location..." />
                    <CommandEmpty>No location found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        key="none"
                        onSelect={() => setPlaceId(NONE_PLACE_VALUE)}
                      >
                        None
                      </CommandItem>
                      {places.map((p) => (
                        <CommandItem
                          key={p.id}
                          onSelect={() => setPlaceId(String(p.id))}
                        >
                          {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="mt-auto pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedCard}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Copy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
