// utils/inventory-color-group.ts

import type { ScryfallApiCard } from "#/backend/src/types"; // Adjust path as needed

export type InventoryColorGroup =
  | "White"
  | "Blue"
  | "Black"
  | "Red"
  | "Green"
  | "Multicolor"
  | "Colorless"
  | "Artifact"
  | "Land";

export function getInventoryColorGroup(
  card: ScryfallApiCard, // Changed to accept ScryfallApiCard
): InventoryColorGroup {
  // color_identity is already string[] in ScryfallApiCard, no need to parse
  const colorIdentity: string[] = card.color_identity || [];
  const typeLine = (card.type_line ?? "").toLowerCase();

  // Lands are primarily identified by type_line
  if (typeLine.includes("land")) return "Land";

  // Artifacts are also primarily identified by type_line
  // This check comes after Land because some lands can be artifacts (e.g., artifact lands)
  if (typeLine.includes("artifact")) return "Artifact";

  // Colorless cards (non-artifact, non-land)
  if (colorIdentity.length === 0) return "Colorless";

  // Multicolor cards
  if (colorIdentity.length > 1) return "Multicolor";

  // Single-color cards
  switch (colorIdentity[0]) {
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
      // This case should ideally not be reached if colorIdentity has one element
      // that isn't WUBRG, but as a fallback.
      return "Colorless";
  }
}
