// ./types.ts

// --- Scryfall API Related Structures ---

export interface ScryfallImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface ScryfallCardFace {
  object: "card_face";
  name: string;
  mana_cost: string;
  type_line: string;
  oracle_text?: string | null;
  colors?: string[] | null; // Colors of this face
  power?: string | null;
  toughness?: string | null;
  loyalty?: string | null;
  artist?: string | null;
  illustration_id?: string | null;
  image_uris?: ScryfallImageUris | null; // Images for this specific face
}

// Represents the structure of a card object as fetched from Scryfall API,
// focusing on the fields relevant to physical card archiving and deckbuilding.
export interface ScryfallApiCard {
  object: "card";
  id: string; // This is the scryfall_id for a specific printing
  oracle_id: string | null; // ID for the abstract card concept
  cardmarket_id?: number | null;
  name: string;
  lang: string;
  released_at: string; // YYYY-MM-DD
  set_id: string; // Scryfall's UUID for the set
  set: string; // set_code
  set_name: string;
  collector_number: string;
  rarity: "common" | "uncommon" | "rare" | "mythic" | "special" | "bonus";
  layout: string;
  mana_cost?: string | null;
  cmc: number | null;
  type_line: string;
  oracle_text?: string | null;
  power?: string | null;
  toughness?: string | null;
  loyalty?: string | null;
  keywords: string[];
  colors?: string[] | null; // Actual colors derived from mana cost/color indicators
  color_identity: string[]; // Colors for deck building rules
  image_uris?: ScryfallImageUris | null;
  finishes: ("foil" | "nonfoil" | "etched" | "glossy")[]; // Available finishes for this printing
  card_faces?: ScryfallCardFace[] | null;
  artist?: string | null;
  illustration_id?: string | null; // UUID for the artwork
  scryfall_uri: string; // Link to Scryfall page
  legalities: Record<string, "legal" | "not_legal" | "banned" | "restricted">;
  purchase_uris?: Record<string, string> | null;
  // Fields we are explicitly ignoring for this app's purpose:
  // arena_id, mtgo_id, mtgo_foil_id, multiverse_ids, tcgplayer_id, cardmarket_id,
  // prices, reserved, foil (boolean, superseded by finishes array), nonfoil (boolean),
  // digital, promo, reprint, variation, border_color, frame, frame_effects, full_art, textless,
  // oversized, edhrec_rank, penny_rank, story_spotlight, card_back_id, purchase_uris, related_uris, etc.
}

// --- Database Object (DBO) Types ---

// Mirrors the `Cards` table in `db/schema.sql`
export interface CardDbo {
  scryfall_id: string; // PK
  oracle_id: string | null;
  name: string;
  cardmarket_id: number | null;
  lang: string;
  released_at: string | null;
  set_id: string;
  set_code: string;
  set_name: string;
  collector_number: string;
  rarity: "common" | "uncommon" | "rare" | "mythic" | "special" | "bonus";
  layout: string;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string;
  oracle_text: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  keywords: string | null; // JSON string array: string[]
  colors: string | null; // JSON string array: string[]
  color_identity: string; // JSON string array: string[], NOT NULL
  image_uris: string | null; // JSON string: ScryfallImageUris
  finishes: string; // JSON string array: string[], NOT NULL
  card_faces: string | null; // JSON string array: ScryfallCardFace[]
  artist: string | null;
  illustration_id: string | null;
  scryfall_uri: string | null;
  legalities: string | null; // JSON string: Record<string, string>
  purchase_uris: string | null; // JSON string: Record<string, string>
  created_at: string; // ISO8601 DateTime string
  updated_at: string; // ISO8601 DateTime string
}

export type PlaceType =
  | "binder"
  | "deck_box" // Changed from "deck" to avoid confusion with Deck DBO
  | "box"
  | "trade_binder"
  | "wishlist"
  | "other";

// Mirrors the `Places` table
export interface PlaceDbo {
  id: number; // PK
  name: string;
  type: PlaceType;
  description: string | null;
  created_at: string; // ISO8601 DateTime string
  updated_at: string; // ISO8601 DateTime string
}

export type CardCondition = "NM" | "LP" | "MP" | "HP" | "DMG" | "Sealed";

// Standard language codes. Add more if needed.
export type LanguageCode =
  | "en" // English
  | "es" // Spanish
  | "fr" // French
  | "de" // German
  | "it" // Italian
  | "pt" // Portuguese
  | "ja" // Japanese
  | "ko" // Korean
  | "ru" // Russian
  | "zhs" // Chinese Simplified
  | "zht" // Chinese Traditional
  | "ph"; // Phyrexian (Scryfall uses 'ph')

// Mirrors the `Inventory` table
export interface InventoryItemDbo {
  id: number; // PK
  card_scryfall_id: string; // FK to Cards.scryfall_id
  place_id: number | null; // FK to Places.id
  quantity: number;
  condition: CardCondition;
  is_foil: number; // 0 for non-foil, 1 for any kind of foil/special finish.
  // `Cards.finishes` gives details on *what kind* of finish it is.
  language: LanguageCode;
  notes: string | null;
  added_at: string; // ISO8601 DateTime string
  updated_at: string; // ISO8601 DateTime string
}

// Mirrors the `MasterInventory` table
export interface MasterInventoryDbo {
  oracle_id: string; // PK
  name: string;
  notes: string | null;
  created_at: string; // ISO8601 DateTime string
  updated_at: string; // ISO8601 DateTime string
}

// Mirrors the `InventoryDetails` table
export interface InventoryDetailDbo {
  id: number; // PK
  master_oracle_id: string; // FK to MasterInventory.oracle_id
  card_scryfall_id: string; // FK to Cards.scryfall_id
  place_id: number | null; // FK to Places.id
  quantity: number;
  condition: CardCondition;
  is_foil: number;
  language: LanguageCode;
  notes: string | null;
  added_at: string; // ISO8601 DateTime string
  updated_at: string; // ISO8601 DateTime string
}

// Mirrors the `Decks` table
export interface DeckDbo {
  id: string; // PK
  name: string;
  format: string; // Consider an enum if you have a fixed list
  description: string | null;
  created_at: string; // ISO8601 DateTime string
  updated_at: string; // ISO8601 DateTime string
}

// Mirrors the `DeckCards` table
export interface DeckCardDbo {
  id: string; // PK
  deck_id: number; // FK to Decks.id
  card_scryfall_id: string; // FK to Cards.scryfall_id
  quantity: number;
  is_commander: number; // 0 or 1
  is_sideboard: number; // 0 or 1
  is_maybeboard: number; // 0 or 1
  added_at: string; // ISO8601 DateTime string
}

// --- API Payload & Response Types ---

export interface CreatePlacePayload {
  name: string;
  type: PlaceType;
  description?: string | null;
}
export interface UpdatePlacePayload extends Partial<CreatePlacePayload> {}

export interface AddToInventoryPayload {
  scryfall_card_id: string;
  place_id?: number | null;
  quantity: number;
  condition: CardCondition;
  is_foil: boolean; // Client sends boolean, API converts to 0/1
  language: LanguageCode;
  notes?: string | null;
}

// For updating, scryfall_card_id is usually not changed for an existing inventory item.
// If it needs to change, it's often conceptually a new item.
export interface UpdateInventoryItemPayload
  extends Partial<Omit<AddToInventoryPayload, "scryfall_card_id">> {}

// Type for an inventory item when joined with card details (reconstructed to ScryfallApiCard)
// and place details for API responses.
export interface InventoryItemWithCardDetails {
  locationName?: string;
  // InventoryItemDbo fields
  id: number;
  card_scryfall_id: string;
  place_id: number | null;
  quantity: number;
  condition: CardCondition;
  is_foil: boolean; // Converted back to boolean for client
  language: LanguageCode;
  notes: string | null;
  added_at: string;
  updated_at: string;
  // Joined/reconstructed data
  card: ScryfallApiCard; // The full (relevant parts of) card object
  place_name?: string | null; // Name of the place, if place_id is not null
}

export interface DeckCardPayload {
  scryfall_id: string; // Scryfall ID of the card printing
  quantity: number;
  is_commander?: boolean;
  is_sideboard?: boolean;
  is_maybeboard?: boolean;
}

export interface CreateDeckPayload {
  name: string;
  format: string; // Should match DeckDbo.format possibilities
  description?: string | null;
  cards: DeckCardPayload[];
}

export interface UpdateDeckPayload {
  name?: string;
  format?: string;
  description?: string | null;
  cards?: DeckCardPayload[]; // If cards are provided, it usually replaces all existing cards in the deck
}

// Type for a card within a deck, including its details (reconstructed to ScryfallApiCard)
export interface DeckCardWithDetails {
  // DeckCardDbo fields (excluding deck_id as it's contextually known)
  id: string; // DeckCard entry ID
  card_scryfall_id: string;
  quantity: number;
  is_commander: boolean; // Converted back to boolean
  is_sideboard: boolean; // Converted back to boolean
  is_maybeboard: boolean; // Converted back to boolean
  added_at: string;
  // Reconstructed card data
  card: ScryfallApiCard;
}

// Type for a full deck response, including its cards with details
export interface DeckWithDetails extends DeckDbo {
  cards: DeckCardWithDetails[];
}

// --- Master Inventory API Payload & Response Types ---

export interface CreateMasterInventoryPayload {
  oracle_id: string;
  name: string;
  notes?: string | null;
}

export interface UpdateMasterInventoryPayload {
  name?: string;
  notes?: string | null;
}

export interface AddInventoryDetailPayload {
  master_oracle_id: string;
  scryfall_card_id: string;
  place_id?: number | null;
  quantity: number;
  condition: CardCondition;
  is_foil: boolean;
  language: LanguageCode;
  notes?: string | null;
}

export interface UpdateInventoryDetailPayload
  extends Partial<
    Omit<AddInventoryDetailPayload, "master_oracle_id" | "scryfall_card_id">
  > {}

// Type for an inventory detail when joined with card details
export interface InventoryDetailWithCardDetails {
  // InventoryDetailDbo fields
  id: number;
  master_oracle_id: string;
  card_scryfall_id: string;
  place_id: number | null;
  quantity: number;
  condition: CardCondition;
  is_foil: boolean;
  language: LanguageCode;
  notes: string | null;
  added_at: string;
  updated_at: string;
  // Joined/reconstructed data
  card: ScryfallApiCard;
  place_name?: string | null;
}

// Type for a full master inventory response
export interface MasterInventoryWithDetails extends MasterInventoryDbo {
  details: InventoryDetailWithCardDetails[];
}

export interface PaginatedMasterInventoryResponse {
  data: MasterInventoryWithDetails[];
  totalCount: number;
  hasMore: boolean;
}

export interface PaginatedActivityResponse {
  data: {
    type: string;
    card_name: string;
    quantity: number | null;
    timestamp: string;
    location: string | null;
  }[];
  totalCount: number;
  hasMore: boolean;
}

// --- Utility Types ---

// Function signature for mapping Scryfall API card data to our CardDbo structure
export type ScryfallToCardDboMappingFn = (
  scryfallCard: ScryfallApiCard,
) => Omit<CardDbo, "created_at" | "updated_at">;

// Function signature for mapping CardDbo (from DB) back to ScryfallApiCard for API responses
export type DboToScryfallApiCardMappingFn = (
  cardDbo: CardDbo,
) => ScryfallApiCard;

// Type for Scryfall's list object structure (generic)
export interface ScryfallListResponse<T> {
  object: "list";
  total_cards?: number;
  has_more: boolean;
  next_page?: string;
  data: T[];
  warnings?: string[];
}

// --- Hono Bindings ---
import type { D1Database } from "@cloudflare/workers-types";

export type Bindings = {
  DB: D1Database;
  PROD_APP_URL?: string; // For CORS
  REFRESH_SECRET?: string; // Secret for admin endpoints
  LOTUSFLARE_AUTH?: string; // Bearer token for API authentication
};
