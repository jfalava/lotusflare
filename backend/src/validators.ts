// ./validators.ts
import { z } from "zod";
import type { PlaceType, CardCondition, LanguageCode } from "./types"; // Assuming types.ts is in the same directory or adjust path

// --- Enum Arrays for Zod ---
// These should match the type definitions in types.ts and CHECK constraints in schema.sql

export const PLACE_TYPES_ARRAY: [PlaceType, ...PlaceType[]] = [
  "binder",
  "deck_box", // Updated from "deck"
  "box",
  "trade_binder",
  "wishlist",
  "other",
];

export const CARD_CONDITIONS_ARRAY: [CardCondition, ...CardCondition[]] = [
  "NM",
  "LP",
  "MP",
  "HP",
  "DMG",
  "Sealed",
];

export const LANGUAGE_CODES_ARRAY: [LanguageCode, ...LanguageCode[]] = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ja",
  "ko",
  "ru",
  "zhs",
  "zht",
  "ph", // Added Phyrexian
];

export const DECK_FORMATS_ARRAY = [
  "commander",
  "modern",
  "standard",
  "pioneer",
  "legacy",
  "vintage",
  "pauper",
  "brawl",
  "oathbreaker", // Added
  "historic", // Added
  "premodern", // Added
  "custom", // Added
] as const; // Use "as const" for z.enum with an array

// --- Schemas ---

export const createPlaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(PLACE_TYPES_ARRAY).default("binder"),
  description: z.string().max(500).optional().nullable(),
});
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;

export const updatePlaceSchema = createPlaceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update.",
  });
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;

export const addToInventorySchema = z.object({
  scryfall_card_id: z.uuid("Invalid Scryfall Card ID"),
  place_id: z.number().int().positive().nullable().optional(), // Kept as optional and nullable
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  condition: z.enum(CARD_CONDITIONS_ARRAY).default("NM"),
  is_foil: z.boolean().default(false),
  language: z.enum(LANGUAGE_CODES_ARRAY).default("en"),
  notes: z.string().max(500).nullable().optional(),
  // purchase_price and purchase_date removed as per your requirements
});
export type AddToInventoryInput = z.infer<typeof addToInventorySchema>;

export const updateInventoryItemSchema = addToInventorySchema
  .omit({ scryfall_card_id: true }) // Typically, you don't change the card an inventory item represents
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update.",
  });
export type UpdateInventoryItemInput = z.infer<
  typeof updateInventoryItemSchema
>;

export const deckFormatSchema = z.enum(DECK_FORMATS_ARRAY);
export type DeckFormat = z.infer<typeof deckFormatSchema>;

const deckCardSchema = z.object({
  scryfall_id: z.uuid("Invalid Scryfall Card ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  is_commander: z.boolean().optional().default(false),
  is_sideboard: z.boolean().optional().default(false),
  is_maybeboard: z.boolean().optional().default(false),
});
export type DeckCardInput = z.infer<typeof deckCardSchema>;

export const createDeckSchema = z.object({
  name: z.string().min(1, "Deck name is required").max(100),
  format: deckFormatSchema,
  description: z.string().max(500).optional().nullable(),
  cards: z.array(deckCardSchema).min(0), // A deck can be created empty and cards added later
});
export type CreateDeckInput = z.infer<typeof createDeckSchema>;

export const updateDeckSchema = z
  .object({
    name: z.string().min(1, "Deck name is required").max(100).optional(),
    format: deckFormatSchema.optional(),
    description: z.string().max(500).optional().nullable(),
    cards: z.array(deckCardSchema).min(0).optional(), // Cards array is optional for update
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the deck.",
  });
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;

// --- Master Inventory Schemas ---

export const createMasterInventorySchema = z.object({
  oracle_id: z.uuid("Invalid Oracle ID"),
  name: z.string().min(1, "Name is required"),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateMasterInventorySchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update.",
  });

export const addInventoryDetailSchema = z.object({
  master_oracle_id: z.uuid("Invalid Master Oracle ID"),
  scryfall_card_id: z.uuid("Invalid Scryfall Card ID"),
  place_id: z.number().int().positive().nullable().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  condition: z.enum(CARD_CONDITIONS_ARRAY).default("NM"),
  is_foil: z.boolean().default(false),
  language: z.enum(LANGUAGE_CODES_ARRAY).default("en"),
  notes: z.string().max(500).nullable().optional(),
});

export const updateInventoryDetailSchema = addInventoryDetailSchema
  .omit({ master_oracle_id: true, scryfall_card_id: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update.",
  });
