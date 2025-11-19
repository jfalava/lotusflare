// components/decks/editor/types
import type { ScryfallApiCard } from "#/backend/src/types";
import { DECK_FORMATS_ARRAY } from "#/backend/src/validators";

export type DeckFormat = (typeof DECK_FORMATS_ARRAY)[number];

export interface EditableDeckCard {
  scryfall_id: string;
  quantity: string;
  is_commander: boolean;
  is_sideboard: boolean;
  cardDetails: ScryfallApiCard;
  tempId: string;
  canonicalName: string;
}

export interface DeckState {
  name: string;
  format: DeckFormat;
  description: string;
  mainboard: EditableDeckCard[];
  sideboard: EditableDeckCard[];
  maybeboard: EditableDeckCard[];
}

export interface DragItem {
  tempId: string;
  index: number;
  section: "mainboard" | "sideboard" | "maybeboard";
}
