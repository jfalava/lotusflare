// lib/deck-utils.ts
import type { DeckWithDetails } from "#/backend/src/types";

export const getDeckCoverImage = (
  deck: DeckWithDetails | null | undefined,
): string | null | undefined => {
  if (!deck || !deck.cards || deck.cards.length === 0) {
    return null;
  }
  const commander = deck.cards.find((c) => c.is_commander);
  if (commander?.card.image_uris?.art_crop) {
    return commander.card.image_uris.art_crop;
  }
  // Fallback to normal if art_crop isn't available for commander
  if (commander?.card.image_uris?.normal) {
    return commander.card.image_uris.normal;
  }
  // If no commander, or commander has no image, try first card's art_crop
  if (deck.cards[0].card.image_uris?.art_crop) {
    return deck.cards[0].card.image_uris.art_crop;
  }
  // Fallback to first card's normal image
  if (deck.cards[0].card.image_uris?.normal) {
    return deck.cards[0].card.image_uris.normal;
  }
  return null;
};
