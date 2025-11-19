// ./card-utils.ts
import type {
  ScryfallApiCard,
  CardDbo,
  LanguageCode,
  ScryfallToCardDboMappingFn,
  DboToScryfallApiCardMappingFn,
  ScryfallCardFace,
  ScryfallImageUris,
} from "./types";

/**
 * Pick the “default” image URI (normal → small → face[0].normal → face[0].small).
 */
export function getCardImageUri(card: ScryfallApiCard): string | undefined {
  return (
    card.image_uris?.normal ??
    card.image_uris?.small ??
    card.card_faces?.[0]?.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.small
  );
}

/**
 * Try to fetch the Scryfall printing in the requested language.
 * If that fails (404 or no image), fall back to getCardImageUri.
 */
export async function getCardLocalizedImageUri(
  card: ScryfallApiCard,
  lang: LanguageCode,
): Promise<string | undefined> {
  // If the “card” you already have is in the right language, just use it:
  if (card.lang === lang) {
    return getCardImageUri(card);
  }

  // Otherwise, attempt a language‐specific fetch:
  try {
    const setCode = card.set; // e.g. "m21"
    const collectorNumber = card.collector_number; // e.g. "002"
    // Scryfall endpoint: GET /cards/{set}/{number}/{lang}
    const res = await fetch(
      `https://api.scryfall.com/cards/${encodeURIComponent(
        setCode,
      )}/${encodeURIComponent(collectorNumber)}/${encodeURIComponent(lang)}`,
      { headers: { Accept: "application/json" } },
    );
    if (res.ok) {
      const localized = (await res.json()) as ScryfallApiCard;
      const uri = localized.image_uris?.normal ?? localized.image_uris?.small;
      if (uri) return uri;
    }
  } catch {
    // swallow
  }

  // fallback
  return getCardImageUri(card);
}

/**
 * Maps a Scryfall API card object to the CardDbo structure for database storage.
 * It only includes fields defined in the ScryfallApiCard type (our relevant subset).
 * Made more defensive against potentially undefined incoming fields.
 */
export const mapScryfallCardToDbo: ScryfallToCardDboMappingFn = (
  scryfallCard: ScryfallApiCard,
): Omit<CardDbo, "created_at" | "updated_at"> => {
  return {
    scryfall_id: scryfallCard.id,
    oracle_id: scryfallCard.oracle_id ?? null,
    name: scryfallCard.name || "",
    cardmarket_id: scryfallCard.cardmarket_id ?? null,
    lang: scryfallCard.lang || "en",
    released_at: scryfallCard.released_at ?? null,
    set_id: scryfallCard.set_id || "",
    set_code: scryfallCard.set || "",
    set_name: scryfallCard.set_name || "",
    collector_number: scryfallCard.collector_number || "",
    rarity: scryfallCard.rarity || "common",
    layout: scryfallCard.layout || "normal",
    mana_cost: scryfallCard.mana_cost ?? null,
    cmc: scryfallCard.cmc ?? null,
    type_line: scryfallCard.type_line || "",
    oracle_text: scryfallCard.oracle_text ?? null,
    power: scryfallCard.power ?? null,
    toughness: scryfallCard.toughness ?? null,
    loyalty: scryfallCard.loyalty ?? null,
    keywords: JSON.stringify(scryfallCard.keywords || []),
    colors: scryfallCard.colors ? JSON.stringify(scryfallCard.colors) : null,
    color_identity: JSON.stringify(scryfallCard.color_identity || []),
    image_uris: scryfallCard.image_uris
      ? JSON.stringify(scryfallCard.image_uris)
      : null,
    finishes: JSON.stringify(scryfallCard.finishes || []),
    card_faces: scryfallCard.card_faces
      ? JSON.stringify(scryfallCard.card_faces)
      : null,
    artist: scryfallCard.artist ?? null,
    illustration_id: scryfallCard.illustration_id ?? null,
    scryfall_uri: scryfallCard.scryfall_uri || "",
    legalities: scryfallCard.legalities
      ? JSON.stringify(scryfallCard.legalities)
      : null,
    purchase_uris: scryfallCard.purchase_uris
      ? JSON.stringify(scryfallCard.purchase_uris)
      : null,
  };
};

/**
 * Maps a CardDbo object (from the database) back to a ScryfallApiCard structure
 * for API responses. It reconstructs complex objects from their JSON string representations,
 * and ensures mana_cost is populated for adventure/DFC cards.
 */
export const mapDboToScryfallApiCard: DboToScryfallApiCardMappingFn = (
  cardDbo: CardDbo,
): ScryfallApiCard => {
  // Safely parse a JSON string into T, or return null
  const safeJsonParse = <T>(jsonString: string | null): T | null => {
    if (jsonString == null) return null;
    try {
      return JSON.parse(jsonString) as T;
    } catch (e) {
      console.error(
        `Failed to parse JSON for card ${cardDbo.scryfall_id} ('${cardDbo.name}'):`,
        jsonString,
        e,
      );
      return null;
    }
  };

  // Safely parse a JSON array string into T[], or return empty array
  const safeJsonParseArray = <T>(jsonString: string | null): T[] => {
    if (jsonString == null) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (e) {
      console.error(
        `Failed to parse JSON array for card ${cardDbo.scryfall_id} ('${cardDbo.name}'):`,
        jsonString,
        e,
      );
      return [];
    }
  };

  // Parse card_faces once and fallback to its first face's mana_cost if root is empty
  const faces = safeJsonParse<ScryfallCardFace[]>(cardDbo.card_faces);
  const manaCost = cardDbo.mana_cost ?? faces?.[0]?.mana_cost ?? null;

  return {
    object: "card",
    id: cardDbo.scryfall_id,
    oracle_id: cardDbo.oracle_id,
    cardmarket_id: cardDbo.cardmarket_id,
    name: cardDbo.name,
    lang: cardDbo.lang,
    released_at: cardDbo.released_at || "",
    set_id: cardDbo.set_id,
    set: cardDbo.set_code,
    set_name: cardDbo.set_name,
    collector_number: cardDbo.collector_number,
    rarity: cardDbo.rarity,
    layout: cardDbo.layout,
    mana_cost: manaCost,
    cmc: cardDbo.cmc,
    type_line: cardDbo.type_line,
    oracle_text: cardDbo.oracle_text,
    power: cardDbo.power,
    toughness: cardDbo.toughness,
    loyalty: cardDbo.loyalty,
    keywords: safeJsonParseArray<string>(cardDbo.keywords),
    colors: safeJsonParse<string[]>(cardDbo.colors),
    color_identity: safeJsonParseArray<string>(cardDbo.color_identity),
    image_uris: safeJsonParse<ScryfallImageUris>(cardDbo.image_uris),
    finishes: safeJsonParseArray<"foil" | "nonfoil" | "etched" | "glossy">(
      cardDbo.finishes,
    ),
    card_faces: faces,
    artist: cardDbo.artist,
    illustration_id: cardDbo.illustration_id,
    scryfall_uri: cardDbo.scryfall_uri || "",
    legalities:
      safeJsonParse<
        Record<string, "legal" | "not_legal" | "banned" | "restricted">
      >(cardDbo.legalities) || {},
    purchase_uris: safeJsonParse<Record<string, string>>(cardDbo.purchase_uris),
  };
};
