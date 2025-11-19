// components/inventory/add-to-master-modal.tsx
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
import { CARD_CONDITIONS_ARRAY } from "#/backend/src/validators";
import { LANGUAGE_OPTIONS } from "@/components/inventory/shared/inventory-constants";
import {
  CardCondition,
  InventoryDetailWithCardDetails,
  LanguageCode,
  PlaceDbo,
  ScryfallApiCard,
} from "#/backend/src/types";

interface AddToMasterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ScryfallApiCard | null;
  places: PlaceDbo[];
  onSuccess: (detail: InventoryDetailWithCardDetails) => void;
}

// sentinel for "no place selected"
const NONE_PLACE_VALUE = "__none__";

export const AddToMasterModal: React.FC<AddToMasterModalProps> = ({
  open,
  onOpenChange,
  card,
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

  React.useEffect(() => {
    if (open) return;

    queueMicrotask(() => {
      setQuantity(1);
      setCondition("NM");
      setIsFoil(false);
      setLanguage("en");
      setPlaceId(NONE_PLACE_VALUE);
      setNotes("");
    });
  }, [open]);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!card?.oracle_id) {
        toast.error("Selected card has no Oracle ID.");
        return;
      }
      setIsLoading(true);

      try {
        // 1) create or find master entry
        const masterRes = await fetch("/api/v2/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oracle_id: card.oracle_id,
            name: card.name,
            notes: null,
          }),
        });
        if (!masterRes.ok && masterRes.status !== 409) {
          const err = await masterRes.json().catch(() => null);
          throw new Error(
            (err as { message?: string })?.message ||
              "Failed to create master entry",
          );
        }

        // 2) create the detail line
        const detailPayload = {
          master_oracle_id: card.oracle_id,
          scryfall_card_id: card.id,
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
        onOpenChange(false);
      } catch (error: unknown) {
        toast.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      card,
      condition,
      isFoil,
      language,
      notes,
      onOpenChange,
      onSuccess,
      placeId,
      quantity,
    ],
  );

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add "{card.name}" to Inventory</DialogTitle>
          <DialogDescription>
            Set quantity, condition, foil, language, location, and notes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
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
                  <Button id="condition" variant="outline">
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
                    <span>
                      {LANGUAGE_OPTIONS.find((l) => l.code === language)?.flag}
                    </span>
                    <span>
                      {
                        LANGUAGE_OPTIONS.find((l) => l.code === language)
                          ?.nativeName
                      }
                    </span>
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
                    {placeId === NONE_PLACE_VALUE
                      ? "-"
                      : places.find((p) => String(p.id) === placeId)?.name}
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

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to Inventory
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
