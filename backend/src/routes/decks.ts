import { Hono } from "hono";
import { z } from "zod";
import { boolToInt } from "../helpers/db-helpers";
import { getStringId } from "../helpers/param-helpers";
import { ensureCardsExist } from "../helpers/scryfall-helpers";
import { mapDeckCardRows } from "../mappers/deck-mappers";
import { handleKnownErrors } from "../middlewares/error-handler";
import {
  getValidatedData,
  validateRequest,
} from "../middlewares/validate-request";
import type {
  Bindings,
  CardDbo,
  DeckCardDbo,
  DeckDbo,
  DeckWithDetails,
} from "../types";
import { createDeckSchema, updateDeckSchema } from "../validators";

const app = new Hono<{ Bindings: Bindings }>();

app.post("/", validateRequest(createDeckSchema), async (c) => {
  try {
    const { name, format, description, cards } =
      getValidatedData<z.infer<typeof createDeckSchema>>(c);
    const db = c.env.DB;
    // generate a UUID for this deck
    const id = crypto.randomUUID();

    // TODO: Consider D1 transactions if multiple operations need to be atomic.
    // For Cloudflare D1, true multi-statement transactions are complex.
    // Batching is available for multiple inserts/updates of the same type.

    const deckResult = await db
      .prepare(
        "INSERT INTO Decks (id, name, format, description) VALUES (?, ?, ?, ?) RETURNING *",
      )
      .bind(id, name, format, description || null)
      .first<DeckDbo>();

    if (!deckResult) {
      return c.json({ message: "Failed to create deck metadata" }, 500);
    }
    const deckId = deckResult.id;

    if (cards && cards.length > 0) {
      // Make sure every referenced card is present in Cards
      await ensureCardsExist(db, [
        ...new Set(cards.map((c: { scryfall_id: string }) => c.scryfall_id)),
      ]);
      const cardStatements = cards.map(
        (card: {
          scryfall_id: string;
          quantity: number;
          is_commander?: boolean;
          is_sideboard?: boolean;
          is_maybeboard?: boolean;
        }) => {
          // Verify each card exists in local Cards table before attempting to add to deck
          // This check can be done upfront for all cards for efficiency
          return db
            .prepare(
              `INSERT INTO DeckCards (
              deck_id, card_scryfall_id, quantity,
              is_commander, is_sideboard, is_maybeboard
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              deckId,
              card.scryfall_id,
              card.quantity,
              boolToInt(card.is_commander),
              boolToInt(card.is_sideboard),
              boolToInt(card.is_maybeboard),
            );
        },
      );
      // Before batching, ensure all scryfall_ids in `cards` are valid and exist in your `Cards` table.
      // This is an important validation step.
      // For brevity, this check is omitted here but crucial in production.
      await db.batch(cardStatements);
    }

    // Fetch the full deck with cards to return
    const deckDbo = await db
      .prepare("SELECT * FROM Decks WHERE id = ?")
      .bind(deckId)
      .first<DeckDbo>();

    if (!deckDbo) {
      // Should not happen if insert succeeded
      return c.json({ message: "Failed to retrieve created deck" }, 500);
    }

    const { results: deckCardRows } = await db
      .prepare(
        `SELECT dc.*, cr.*
         FROM DeckCards dc
         JOIN Cards cr ON dc.card_scryfall_id = cr.scryfall_id
         WHERE dc.deck_id = ?`,
      )
      .bind(deckId)
      .all<DeckCardDbo & CardDbo>();

    const responseDeck: DeckWithDetails = {
      ...deckDbo,
      cards: mapDeckCardRows(deckCardRows || []),
    };

    return c.json(responseDeck, 201);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to create deck");
  }
});

app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const { results: decksDbo } = await db
      .prepare("SELECT * FROM Decks ORDER BY updated_at DESC")
      .all<DeckDbo>();
    if (!decksDbo || decksDbo.length === 0) {
      return c.json([]);
    }

    const decksWithDetails: DeckWithDetails[] = [];

    for (const deckDbo of decksDbo) {
      const { results: deckCardRows } = await db
        .prepare(
          `SELECT dc.*, cr.*
       FROM DeckCards dc
       JOIN Cards cr ON dc.card_scryfall_id = cr.scryfall_id
       WHERE dc.deck_id = ?`,
        )
        .bind(deckDbo.id)
        .all<DeckCardDbo & CardDbo>();

      decksWithDetails.push({
        ...deckDbo,
        cards: mapDeckCardRows(deckCardRows || []),
      });
    }

    return c.json(decksWithDetails);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch decks");
  }
});

app.get("/:id", async (c) => {
  try {
    const id = getStringId(c);

    const deckDbo = await c.env.DB.prepare("SELECT * FROM Decks WHERE id = ?")
      .bind(id)
      .first<DeckDbo>();

    if (!deckDbo) {
      return c.json({ message: "Deck not found" }, 404);
    }

    const { results: deckCardRows } = await c.env.DB.prepare(
      `SELECT dc.*, cr.*
     FROM DeckCards dc
     JOIN Cards cr ON dc.card_scryfall_id = cr.scryfall_id
     WHERE dc.deck_id = ?`,
    )
      .bind(id)
      .all<DeckCardDbo & CardDbo>();

    const responseDeck: DeckWithDetails = {
      ...deckDbo,
      cards: mapDeckCardRows(deckCardRows || []),
    };

    return c.json(responseDeck);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch deck");
  }
});

app.put("/:id", validateRequest(updateDeckSchema), async (c) => {
  try {
    const id = getStringId(c);
    const db = c.env.DB;
    const { name, format, description, cards } =
      getValidatedData<z.infer<typeof updateDeckSchema>>(c);

    const deckExists = await db
      .prepare("SELECT id FROM Decks WHERE id = ?")
      .bind(id)
      .first();
    if (!deckExists) {
      return c.json({ message: "Deck not found" }, 404);
    }

    // Update deck metadata if provided
    const updateFields: string[] = [];
    const updateValues: (string | null)[] = [];
    if (name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }
    if (format !== undefined) {
      updateFields.push("format = ?");
      updateValues.push(format);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }

    if (updateFields.length > 0) {
      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id.toString());
      await db
        .prepare(`UPDATE Decks SET ${updateFields.join(", ")} WHERE id = ?`)
        .bind(...updateValues)
        .run();
    }

    // If cards array is provided, replace all existing cards in the deck
    if (cards !== undefined) {
      // Up-front: guarantee FK validity
      await ensureCardsExist(db, [
        ...new Set(cards.map((c: { scryfall_id: string }) => c.scryfall_id)),
      ]);
      // Validate all card scryfall_ids exist in Cards table (omitted for brevity)
      await db
        .prepare("DELETE FROM DeckCards WHERE deck_id = ?")
        .bind(id)
        .run();
      if (cards.length > 0) {
        const cardStatements = cards.map(
          (card: {
            scryfall_id: string;
            quantity: number;
            is_commander?: boolean;
            is_sideboard?: boolean;
            is_maybeboard?: boolean;
          }) =>
            db
              .prepare(
                `INSERT INTO DeckCards (
                deck_id, card_scryfall_id, quantity,
                is_commander, is_sideboard, is_maybeboard
             ) VALUES (?, ?, ?, ?, ?, ?)`,
              )
              .bind(
                id,
                card.scryfall_id,
                card.quantity,
                boolToInt(card.is_commander),
                boolToInt(card.is_sideboard),
                boolToInt(card.is_maybeboard),
              ),
        );
        await db.batch(cardStatements);
      }
    }

    // Fetch and return the updated deck with details
    const updatedDeckDbo = await db
      .prepare("SELECT * FROM Decks WHERE id = ?")
      .bind(id)
      .first<DeckDbo>();
    if (!updatedDeckDbo) {
      return c.json({ message: "Failed to retrieve updated deck" }, 500);
    }

    const { results: updatedDeckCardRows } = await db
      .prepare(
        `SELECT dc.*, cr.*
         FROM DeckCards dc
         JOIN Cards cr ON dc.card_scryfall_id = cr.scryfall_id
         WHERE dc.deck_id = ?`,
      )
      .bind(id)
      .all<DeckCardDbo & CardDbo>();

    const responseDeck: DeckWithDetails = {
      ...updatedDeckDbo,
      cards: mapDeckCardRows(updatedDeckCardRows || []),
    };
    return c.json(responseDeck);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to update deck");
  }
});

app.delete("/:id", async (c) => {
  try {
    const id = getStringId(c);

    const deckExists = await c.env.DB.prepare(
      "SELECT id FROM Decks WHERE id = ?",
    )
      .bind(id)
      .first();
    if (!deckExists) {
      return c.json({ message: "Deck not found" }, 404);
    }

    // ON DELETE CASCADE in DeckCards table will handle associated cards
    const { success, meta } = await c.env.DB.prepare(
      "DELETE FROM Decks WHERE id = ?",
    )
      .bind(id)
      .run();

    return success && meta.changes > 0
      ? c.body(null, 204)
      : c.json({ message: "Failed to delete deck" }, 500);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to delete deck");
  }
});

// Deck Legality Check
app.get("/:id/legality", async (c) => {
  try {
    const id = getStringId(c);
    const format = c.req.query("format");
    if (!format) {
      return c.json({ message: "Format query parameter is required" }, 400);
    }
    const db = c.env.DB;
    const deck = await db
      .prepare("SELECT format FROM Decks WHERE id = ?")
      .bind(id)
      .first<{ format: string }>();

    if (!deck) {
      return c.json({ message: "Deck not found" }, 404);
    }

    const { results: cards } = await c.env.DB.prepare(
      `SELECT cr.name, cr.legalities
       FROM DeckCards dc
       JOIN Cards cr ON dc.card_scryfall_id = cr.scryfall_id
       WHERE dc.deck_id = ? AND dc.is_sideboard = 0`,
    )
      .bind(id)
      .all<{ name: string; legalities: string }>();

    if (!cards || cards.length === 0) {
      return c.json({
        is_legal: true,
        illegal_cards: [],
        message: "Deck is empty or has no mainboard cards.",
      });
    }

    const illegalCards = cards
      .map((card) => {
        try {
          const legalities = JSON.parse(card.legalities);
          return {
            name: card.name,
            legality: legalities[format] || "not_legal",
          };
        } catch {
          return { name: card.name, legality: "not_legal" }; // Assume not legal if parse fails
        }
      })
      .filter((card) => card.legality !== "legal");

    return c.json({
      is_legal: illegalCards.length === 0,
      illegal_cards: illegalCards,
    });
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to check deck legality");
  }
});

export default app;
