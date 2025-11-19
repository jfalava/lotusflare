import type { DeckCardDbo, CardDbo, DeckCardWithDetails } from "../types";
import { mapDboToScryfallApiCard } from "../card-utils";
import { intToBool } from "../helpers/db-helpers";

/**
 * Map deck card database rows to DeckCardWithDetails
 * @param rows - Array of deck card rows joined with card data
 * @returns Array of deck cards with full card details
 */
export function mapDeckCardRows(
  rows: (DeckCardDbo & CardDbo)[],
): DeckCardWithDetails[] {
  return (rows || []).map((row) => ({
    id: row.id,
    card_scryfall_id: row.card_scryfall_id,
    quantity: row.quantity,
    is_commander: intToBool(row.is_commander),
    is_sideboard: intToBool(row.is_sideboard),
    is_maybeboard: intToBool(row.is_maybeboard),
    added_at: row.added_at,
    card: mapDboToScryfallApiCard(row as CardDbo),
  }));
}
