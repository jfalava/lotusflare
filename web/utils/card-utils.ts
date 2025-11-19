import type { ScryfallApiCard } from "#/backend/src/types";
import type { InventoryColorGroup } from "@/utils/inventory-color-group";

/**
 * @deprecated Use getCardImageUri from @/lib/image-utils instead
 */
export const getCardImageUri = (
  card: ScryfallApiCard | undefined | null,
): string | undefined => {
  if (!card) return undefined;
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.image_uris?.png) return card.image_uris.png;
  if (card.image_uris?.border_crop) return card.image_uris.border_crop;
  const face0 = card.card_faces?.[0]?.image_uris;
  if (face0?.normal) return face0.normal;
  if (face0?.png) return face0.png;
  if (face0?.border_crop) return face0.border_crop;
  return undefined;
};

/**
 * Get the primary card type from a type line
 * @param typeLine - The type line from a Scryfall card
 * @returns The primary card type (Land, Creature, Instant, Sorcery, etc.)
 */
export function getPrimaryCardType(typeLine?: string): string {
  if (!typeLine) return "Unknown";
  if (typeLine.includes("Land")) return "Land";
  if (typeLine.includes("Creature")) return "Creature";
  if (typeLine.includes("Instant")) return "Instant";
  if (typeLine.includes("Sorcery")) return "Sorcery";
  if (typeLine.includes("Artifact")) return "Artifact";
  if (typeLine.includes("Enchantment")) return "Enchantment";
  if (typeLine.includes("Planeswalker")) return "Planeswalker";
  if (typeLine.includes("Battle")) return "Battle";
  return "Other";
}

export function getCardColorGroup(card: ScryfallApiCard): InventoryColorGroup {
  // Handle lands
  if (card.type_line.toLowerCase().includes("land")) {
    return "Land";
  }

  // Handle artifacts (non-creature artifacts or artifact creatures without other colors)
  if (card.type_line.toLowerCase().includes("artifact")) {
    if (!card.colors || card.colors.length === 0) {
      return "Artifact";
    }
  }

  // Handle colorless (no colors and not artifact/land)
  if (!card.colors || card.colors.length === 0) {
    return "Colorless";
  }

  // Handle multicolor
  if (card.colors.length > 1) {
    return "Multicolor";
  }

  // Handle single colors
  const color = card.colors[0];
  switch (color) {
    case "W":
      return "White";
    case "U":
      return "Blue";
    case "B":
      return "Black";
    case "R":
      return "Red";
    case "G":
      return "Green";
    default:
      return "Colorless";
  }
}
