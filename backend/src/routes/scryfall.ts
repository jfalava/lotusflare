import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import packageJson from "../../package.json";
import { mapScryfallCardToDbo, mapDboToScryfallApiCard } from "../card-utils";
import { batchInsertCards, prepareCardInsert } from "../helpers/db-helpers";
import { fetchScryfall } from "../helpers/scryfall-helpers";
import { handleKnownErrors } from "../middlewares/error-handler";
import type {
  ScryfallApiCard,
  ScryfallListResponse,
  Bindings,
  CardDbo,
} from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// == Scryfall Search Route ==
app.get("/cards/search", async (c) => {
  const db = c.env.DB;
  const query = c.req.query("q");
  const pageParam = c.req.query("page");
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  if (!query) {
    return c.json({ message: 'Search query "q" is required' }, 400);
  }

  try {
    const scryfallApiUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=name&dir=asc&page=${page}`;

    const directResponse = await fetchScryfall(scryfallApiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": `Lotusflare/API v${packageJson.version}`,
      },
    });

    const responseText = await directResponse.text();

    if (!directResponse.ok) {
      console.error(
        `[WORKER] Scryfall API fetch FAILED. Status: ${directResponse.status}, Query: "${query}", URL: ${scryfallApiUrl}, Body: ${responseText.substring(0, 500)}...`,
      );
      try {
        const errorJson = JSON.parse(responseText); // Scryfall often returns JSON errors
        if (errorJson.object === "error" && errorJson.code === "not_found") {
          return c.json({
            object: "list",
            data: [],
            has_more: false,
            total_cards: 0,
          } as ScryfallListResponse<ScryfallApiCard>);
        }
        c.status(directResponse.status as StatusCode);
        return c.json(errorJson); // Forward Scryfall's error
      } catch (e) {
        // If parsing errorJson fails, return a generic one
        return c.json({
          message: `Scryfall API request failed: ${directResponse.status}`,
          details: responseText.substring(0, 200),
        });
      }
    }

    const scryfallResponse = JSON.parse(responseText) as
      | ScryfallListResponse<ScryfallApiCard>
      | { object: "error"; code: string; details: string; status: number };

    if (scryfallResponse.object === "error") {
      console.warn(
        `[WORKER] Scryfall API returned an error object. Query: "${query}", Details: ${scryfallResponse.details}`,
      );
      if (scryfallResponse.code === "not_found") {
        return c.json({
          object: "list",
          data: [],
          has_more: false,
          total_cards: 0,
        });
      }
      c.status(scryfallResponse.status as StatusCode);
      return c.json(scryfallResponse);
    }

    if (
      scryfallResponse.object !== "list" ||
      !Array.isArray(scryfallResponse.data)
    ) {
      console.warn(
        `[WORKER] Scryfall response not a recognized list. Query: "${query}", Body: ${responseText.substring(0, 200)}...`,
      );
      return c.json({
        object: "list",
        data: [],
        has_more: false,
        total_cards: 0,
      });
    }

    const scryfallCards: ScryfallApiCard[] = scryfallResponse.data;

    if (query.toLowerCase().includes("kumena speaker")) {
      // Or whatever card is causing it
      console.log(
        "RAW SCRYFALL DATA FOR SOL RING:",
        JSON.stringify(
          scryfallResponse.data.find((c) =>
            c.name.toLowerCase().includes("kumena speaker"),
          ),
          null,
          2,
        ),
      );
    }

    // Batch D1 Inserts for performance
    const cardsToInsert = scryfallCards.map((cardData) => {
      if (cardData.name.toLowerCase().includes("kumena speaker")) {
        console.log(
          "INDIVIDUAL cardData for Sol Ring (before map):",
          JSON.stringify(cardData, null, 2),
        );
      }
      const cardDbo = mapScryfallCardToDbo(cardData);
      if (cardData.name.toLowerCase().includes("kumena speaker")) {
        console.log(
          "cardToInsert for Sol Ring (after map):",
          JSON.stringify(cardDbo, null, 2),
        );
      }
      return cardDbo;
    });

    if (cardsToInsert.length > 0) {
      await batchInsertCards(db, cardsToInsert);
    }

    // Return the Scryfall-like list object, data contains ScryfallApiCard objects
    return c.json(scryfallResponse);
  } catch (error: unknown) {
    console.error(
      `[WORKER] Error in /scryfall/cards/search (Query: "${query}"):`,
      error instanceof Error ? error.message : error,
      error instanceof Error ? error.stack : "",
    );
    return c.json(
      {
        message: "Error searching for cards. Please try again.",
        errorDetail: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// == Scryfall Get Card By ID Route ==
app.get("/cards/:id", async (c) => {
  const id = c.req.param("id");

  try {
    // 1) Try local DB first
    const local = await c.env.DB.prepare(
      "SELECT * FROM Cards WHERE scryfall_id = ?",
    )
      .bind(id)
      .first<CardDbo>();
    if (local) {
      return c.json(mapDboToScryfallApiCard(local));
    }

    // 2) Fallback to remote Scryfall
    const scryfallApiUrl = `https://api.scryfall.com/cards/${id}`;
    const directResponse = await fetchScryfall(scryfallApiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": `Lotusflare/API v${packageJson.version}`,
      },
    });
    const responseText = await directResponse.text();

    if (!directResponse.ok) {
      try {
        const errorJson = JSON.parse(responseText);
        c.status(directResponse.status as StatusCode);
        return c.json(errorJson);
      } catch {
        c.status(directResponse.status as StatusCode);
        return c.text(responseText);
      }
    }

    const card = JSON.parse(responseText) as ScryfallApiCard;
    return c.json(card);
  } catch (e: unknown) {
    console.error(`Error in /scryfall/cards/:id for id ${id}:`, e);
    return c.json(
      {
        message: "Error fetching card by ID.",
        errorDetail: e instanceof Error ? e.message : "Unknown error",
      },
      500,
    );
  }
});

// == Scryfall Get by CardMarket ID Route ==
app.get("/cards/cardmarket/:cardmarket_id", async (c) => {
  const db = c.env.DB;
  const cardmarketIdParam = c.req.param("cardmarket_id");
  const cardmarketId = parseInt(cardmarketIdParam, 10);

  if (isNaN(cardmarketId)) {
    return c.json({ message: "Valid CardMarket ID is required" }, 400);
  }

  // Optional: Check local DB first
  const localCard = await db
    .prepare("SELECT * FROM Cards WHERE cardmarket_id = ?")
    .bind(cardmarketId)
    .first<CardDbo>();

  if (localCard) {
    return c.json(mapDboToScryfallApiCard(localCard));
  }

  // If not in local DB, fetch from Scryfall
  try {
    const scryfallApiUrl = `https://api.scryfall.com/cards/cardmarket/${cardmarketId}`;
    const directResponse = await fetchScryfall(scryfallApiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": `Lotusflare/API v${packageJson.version}`,
      },
    });

    const responseText = await directResponse.text();

    if (!directResponse.ok) {
      console.error(
        `[WORKER] Scryfall API CardMarket ID fetch FAILED. Status: ${directResponse.status}, ID: ${cardmarketId}, URL: ${scryfallApiUrl}, Body: ${responseText.substring(0, 500)}...`,
      );
      try {
        const errorJson = JSON.parse(responseText);
        c.status(directResponse.status as StatusCode);
        return c.json(errorJson); // Forward Scryfall's error
      } catch (e) {
        c.status(directResponse.status as StatusCode);
        return c.json({
          message: `Scryfall API request failed: ${directResponse.status}`,
          details: responseText.substring(0, 200),
        });
      }
    }

    const scryfallCard = JSON.parse(responseText) as ScryfallApiCard;

    if (scryfallCard.object !== "card") {
      console.warn(
        `[WORKER] Scryfall CardMarket ID response not a card object. ID: ${cardmarketId}, Body: ${responseText.substring(0, 200)}...`,
      );
      return c.json({ message: "Unexpected response from Scryfall" }, 502); // Bad Gateway
    }

    const cardDbo = mapScryfallCardToDbo(scryfallCard);
    await prepareCardInsert(db, cardDbo).run();

    return c.json(scryfallCard); // Return the ScryfallApiCard object
  } catch (error: unknown) {
    console.error(
      `[WORKER] Error in /scryfall/cards/cardmarket/${cardmarketId}:`,
      error,
    );
    return c.json(
      {
        message: "Error fetching card by CardMarket ID.",
        errorDetail: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

export default app;
