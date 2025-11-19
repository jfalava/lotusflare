import type {
  ScryfallApiCard,
  ScryfallImageUris,
  DeckWithDetails,
  MasterInventoryWithDetails,
} from "#/backend/src/types";

/**
 * Image URI type definition (union of possible input types)
 */
type ImageUrisInput =
  | string
  | ScryfallImageUris
  | Record<string, string>
  | null
  | undefined;

/**
 * Parse image URIs from string or object
 */
export function parseImageUris(
  imageUris: ImageUrisInput,
): ScryfallImageUris | null {
  if (!imageUris) return null;

  try {
    if (typeof imageUris === "string") {
      return JSON.parse(imageUris) as ScryfallImageUris;
    }
    return imageUris as ScryfallImageUris;
  } catch {
    return null;
  }
}

/**
 * Get card image URI with fallback priority
 * Priority: normal -> large -> png -> border_crop -> small
 */
export function getCardImageUri(
  card: ScryfallApiCard | undefined | null,
  preferArtCrop = false,
): string | undefined {
  if (!card) return undefined;

  const uris = parseImageUris(card.image_uris);

  if (uris) {
    if (preferArtCrop && uris.art_crop) return uris.art_crop;
    if (uris.normal) return uris.normal;
    if (uris.large) return uris.large;
    if (uris.png) return uris.png;
    if (uris.border_crop) return uris.border_crop;
    if (uris.small) return uris.small;
  }

  // Check card faces for double-faced cards
  const face0 = card.card_faces?.[0];
  if (face0?.image_uris) {
    const faceUris = parseImageUris(face0.image_uris);
    if (faceUris) {
      if (preferArtCrop && faceUris.art_crop) return faceUris.art_crop;
      if (faceUris.normal) return faceUris.normal;
      if (faceUris.large) return faceUris.large;
      if (faceUris.png) return faceUris.png;
      if (faceUris.border_crop) return faceUris.border_crop;
      if (faceUris.small) return faceUris.small;
    }
  }

  return undefined;
}

/**
 * Get art crop image URI specifically (fallback to normal/large)
 */
export function getCardArtCrop(
  card: ScryfallApiCard | undefined | null,
): string | null {
  if (!card) return null;

  const uris = parseImageUris(card.image_uris);
  if (uris) {
    return uris.art_crop || uris.normal || uris.large || null;
  }

  // Check card faces
  const face0 = card.card_faces?.[0];
  if (face0?.image_uris) {
    const faceUris = parseImageUris(face0.image_uris);
    if (faceUris) {
      return faceUris.art_crop || faceUris.normal || faceUris.large || null;
    }
  }

  return null;
}

/**
 * Pick a representative image from inventory items
 */
export function pickRepresentativeInventoryImage(
  items?: MasterInventoryWithDetails[] | null,
): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  for (const item of items) {
    const detail = item.details?.[0];
    if (!detail?.card?.image_uris) continue;

    const uris = parseImageUris(detail.card.image_uris);
    if (!uris) continue;

    const img = uris.art_crop ?? uris.normal ?? uris.large;
    if (img) return img;
  }

  return null;
}

/**
 * Get a representative image from decks
 * Priority: commander cards first, then highest quantity cards
 */
export function pickRepresentativeDeckImage(
  decks: DeckWithDetails[],
): string | null {
  if (decks.length === 0) return null;

  // Look for commander cards first
  for (const deck of decks) {
    if (deck.cards && deck.cards.length > 0) {
      const commander = deck.cards.find((c) => c.is_commander);
      if (commander?.card.image_uris) {
        const uris = parseImageUris(commander.card.image_uris);
        if (uris) {
          const img = uris.art_crop || uris.normal || uris.large;
          if (img) return img;
        }
      }
    }
  }

  // Try most recent decks sorted by update time
  const sortedDecks = [...decks].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  for (const deck of sortedDecks) {
    // Sort cards by quantity to get the most prominent cards
    const sortedCards = [...(deck.cards || [])].sort(
      (a, b) => b.quantity - a.quantity,
    );

    for (const deckCard of sortedCards) {
      if (deckCard.card.image_uris) {
        const uris = parseImageUris(deckCard.card.image_uris);
        if (uris) {
          const img = uris.normal || uris.large || uris.small;
          if (img) return img;
        }
      }
    }
  }

  return null;
}

/**
 * Get a representative image from a single deck
 */
export function pickSingleDeckImage(deck: DeckWithDetails): string | null {
  if (!deck.cards || deck.cards.length === 0) return null;

  // Look for commander first
  const commander = deck.cards.find((c) => c.is_commander);
  if (commander?.card.image_uris) {
    const uris = parseImageUris(commander.card.image_uris);
    if (uris) {
      const img = uris.art_crop || uris.normal || uris.large;
      if (img) return img;
    }
  }

  // Sort by quantity and find first card with image
  const sortedCards = [...deck.cards].sort((a, b) => b.quantity - a.quantity);
  for (const deckCard of sortedCards) {
    if (deckCard.card.image_uris) {
      const uris = parseImageUris(deckCard.card.image_uris);
      if (uris) {
        const img = uris.normal || uris.large || uris.small;
        if (img) return img;
      }
    }
  }

  return null;
}
