import type {
  InventoryDetailDbo,
  CardDbo,
  InventoryDetailWithCardDetails,
} from "../types";
import { mapDboToScryfallApiCard } from "../card-utils";
import { intToBool } from "../helpers/db-helpers";

/**
 * Build inventory detail response with card details
 * @param row - Inventory detail database object
 * @param cardDbo - Card database object
 * @param placeName - Optional place name
 * @returns Inventory detail with full card details
 */
export function buildInventoryDetailResponse(
  row: InventoryDetailDbo,
  cardDbo: CardDbo,
  placeName: string | null = null,
): InventoryDetailWithCardDetails {
  return {
    ...row,
    is_foil: intToBool(row.is_foil),
    card: mapDboToScryfallApiCard(cardDbo),
    place_name: placeName,
  };
}
