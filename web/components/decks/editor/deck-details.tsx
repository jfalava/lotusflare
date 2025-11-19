// components/deck/editor/deck-details.tsx

"use client";

import React, { useRef } from "react";
import { useKeyPress } from "@/hooks/useKeyPress";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";
import SampleHandDrawer from "@/components/decks/sample-hand-drawer";
import { DECK_FORMATS_ARRAY } from "#/backend/src/validators";
import type { DeckFormat, DeckState } from "@/components/decks/editor/types";
import type { DeckWithDetails } from "#/backend/src/types";

interface DeckDetailsProps {
  deck: Pick<DeckState, "name" | "format" | "description">;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onFormatChange: (value: DeckFormat) => void;
  hasEnoughCards: boolean;
  deckForSampleHand: DeckWithDetails;
}

const DeckDetails: React.FC<DeckDetailsProps> = ({
  deck,
  onInputChange,
  onFormatChange,
  hasEnoughCards,
  deckForSampleHand,
}) => {
  const testHandBtnRef = useRef<HTMLButtonElement>(null);

  // Alt+T opens the Test Hand drawer
  useKeyPress("t", () => testHandBtnRef.current?.click(), {
    alt: true,
    disabled: !hasEnoughCards,
  });

  return (
    <div className="p-4 border rounded-lg bg-card space-y-3 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Deck Details</h2>
        <SampleHandDrawer deck={deckForSampleHand}>
          <Button
            ref={testHandBtnRef}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!hasEnoughCards}
            title={
              hasEnoughCards ? undefined : "Add at least 7 cards to test hand"
            }
          >
            <Hand className="h-4 w-4" />
            Test Hand
            <div className="hidden items-center gap-1 lg:flex ml-2">
              <Kbd>Alt</Kbd>
              <Kbd>T</Kbd>
            </div>
          </Button>
        </SampleHandDrawer>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="deckName">Deck Name</Label>
            <Input
              id="deckName"
              name="name"
              value={deck.name}
              onChange={onInputChange}
              placeholder="My Awesome Deck"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="deckFormat">Format</Label>
            <Select
              name="format"
              value={deck.format}
              onValueChange={(v) => onFormatChange(v as DeckFormat)}
            >
              <SelectTrigger id="deckFormat" className="mt-1">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {DECK_FORMATS_ARRAY.map((fmt) => (
                  <SelectItem key={fmt} value={fmt} className="capitalize">
                    {fmt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="deckDescription">Description</Label>
          <Textarea
            id="deckDescription"
            name="description"
            value={deck.description}
            onChange={onInputChange}
            placeholder="Notes about this deck, strategy, etc."
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
};

export default DeckDetails;
