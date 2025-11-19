// /lib/api-types.ts
export interface DeckCard {
  id: number;
  deck_id: number;
  card_scryfall_id: string;
  quantity: number;
  is_commander: boolean;
  is_sideboard: boolean;
  oracle_id: string;
  name: string;
  mana_cost: string | null;
  type_line: string | null;
  image_uri_normal: string | null;
  cmc: number | null;
  color_identity: string | null; // JSON‐string from the DB
}

export interface Deck {
  id: number;
  name: string;
  format: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  cards: DeckCard[];
}
