import type { D1Database } from "@cloudflare/workers-types";
import type { ScryfallApiCard, CardDbo } from "../types";
import { batchInsertCards } from "./db-helpers";
import { mapScryfallCardToDbo } from "../card-utils";

// Throttle wrapper for calls to api.scryfall.com (>=100ms between calls)
const SCRYFALL_RATE_LIMIT_DELAY = 100; // ms
let lastScryfallRequest = 0;

export async function fetchScryfall(input: string | Request, init?: RequestInit) {
  const now = Date.now();
  const elapsed = now - lastScryfallRequest;
  if (elapsed < SCRYFALL_RATE_LIMIT_DELAY) {
    await new Promise((r) =>
      setTimeout(r, SCRYFALL_RATE_LIMIT_DELAY - elapsed)
    );
  }
  lastScryfallRequest = Date.now();
  return fetch(input, init);
}

// Helper: make sure every scryfall_id in `cardIds` is present in `Cards`.
// Will live-fetch the missing ones from Scryfall and upsert them.
export async function ensureCardsExist(
  db: D1Database,
  cardIds: string[]
): Promise<void> {
  if (cardIds.length === 0) return;

  const placeholders = cardIds.map(() => "?").join(", ");
  const { results: existing } = await db
    .prepare(
      `SELECT scryfall_id FROM Cards WHERE scryfall_id IN (${placeholders})`
    )
    .bind(...cardIds)
    .all<{ scryfall_id: string }>();

  const existingSet = new Set(existing?.map((r) => r.scryfall_id) ?? []);
  const missing = cardIds.filter((id) => !existingSet.has(id));

  if (missing.length === 0) return;

  const cardsToInsert: Omit<CardDbo, "created_at" | "updated_at">[] = [];

  for (const id of missing) {
    const res = await fetchScryfall(`https://api.scryfall.com/cards/${id}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": `Lotusflare/ensureCardsExist`,
      },
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch card ${id} from Scryfall (${res.status})`
      );
    }

    const cardData = (await res.json()) as ScryfallApiCard;

    // Basic sanity check
    if (cardData.object !== "card") {
      throw new Error(`Scryfall returned a non-card object for ${id}`);
    }

    cardsToInsert.push(mapScryfallCardToDbo(cardData));
  }

  if (cardsToInsert.length > 0) {
    await batchInsertCards(db, cardsToInsert);
  }
}
