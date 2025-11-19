// ./mtg-companion-api.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import packageJson from "../package.json";
import type { StatusCode } from "hono/utils/http-status";
import { ZodError, z } from "zod";
import type { D1Database } from "@cloudflare/workers-types";

import { mapScryfallCardToDbo, mapDboToScryfallApiCard } from "./card-utils";
import type {
  ScryfallApiCard,
  CardDbo,
  PlaceDbo,
  CreatePlacePayload,
  UpdatePlacePayload,
  InventoryItemDbo,
  AddToInventoryPayload,
  InventoryItemWithCardDetails, // For API responses
  DeckCardDbo,
  DeckDbo,
  DeckWithDetails, // For API responses
  ScryfallListResponse, // For Scryfall search response
  MasterInventoryDbo,
  InventoryDetailDbo,
  MasterInventoryWithDetails,
  InventoryDetailWithCardDetails,
  CreateMasterInventoryPayload,
  UpdateMasterInventoryPayload,
  AddInventoryDetailPayload,
  UpdateInventoryDetailPayload,
} from "./types";

import {
  createPlaceSchema,
  updatePlaceSchema,
  addToInventorySchema,
  updateInventoryItemSchema,
  createDeckSchema,
  updateDeckSchema,
  createMasterInventorySchema,
  updateMasterInventorySchema,
  addInventoryDetailSchema,
  updateInventoryDetailSchema,
  // deckFormatSchema, // Not directly used here, but available
} from "./validators";

// Import new shared utilities
import { validateRequest, getValidatedData } from "./middlewares/validate-request";
import { withErrorHandling, handleKnownErrors, NotFoundError } from "./middlewares/error-handler";
import {
  getIntId,
  getStringId,
  getPaginationParams,
  getOptionalString,
  getOptionalInt,
} from "./helpers/param-helpers";
import {
  createPaginatedResponse,
  createEmptyPaginatedResponse,
} from "./helpers/response-helpers";
import {
  prepareCardInsert,
  batchInsertCards,
  ensureEntityExists,
  getPlaceName,
  buildUpdateQuery,
  boolToInt,
  intToBool,
} from "./helpers/db-helpers";
import { mapDeckCardRows } from "./mappers/deck-mappers";
import { buildInventoryDetailResponse } from "./mappers/inventory-mappers";

// --- Hono App Setup ---
type Bindings = {
  DB: D1Database;
  PROD_APP_URL?: string; // For CORS
  REFRESH_SECRET?: string; // Secret for admin endpoints
};

const app = new Hono<{ Bindings: Bindings }>();

// --- CORS Middleware ---
app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      // Define all allowed origins
      const allowedOrigins: string[] = [];
      const prodAppUrl = c.env.PROD_APP_URL;
      if (prodAppUrl) {
        allowedOrigins.push(prodAppUrl);
      }
      // 2. If in the development environment, ALSO allow localhost.
      if (c.env.WORKER_ENV === "development") {
        allowedOrigins.push("http://localhost:3000");
      }

      // 3. Check if the incoming request's origin is on the constructed whitelist.
      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"], // Add any other custom headers
    maxAge: 86400, // Cache preflight response for 1 day
    credentials: true, // If you use cookies or authorization headers
  })
);

// Throttle wrapper for calls to api.scryfall.com (>=100ms between calls)
const SCRYFALL_RATE_LIMIT_DELAY = 100; // ms
let lastScryfallRequest = 0;
async function fetchScryfall(input: string | Request, init?: RequestInit) {
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
async function ensureCardsExist(
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

// Helper: function to parse Scryfall-like search query
interface ParsedInventoryCondition {
  field: string; // e.g., "cr.name", "cr.oracle_text"
  value: string; // e.g., "%search term%"
}

function parseInventorySearchQuery(rawQuery: string): {
  searchConditions: ParsedInventoryCondition[];
  generalSearchTerm: string | null;
} {
  const conditions: ParsedInventoryCondition[] = [];
  let remainingQuery = rawQuery;

  // Define simple keyword to database field mappings
  // Using cr. prefix as these fields are from the Cards table aliased as 'cr'
  const keywordMappings: Record<string, string> = {
    o: "cr.oracle_text",
    oracle: "cr.oracle_text",
    t: "cr.type_line",
    type: "cr.type_line",
    n: "cr.name",
    name: "cr.name",
    // Future simple text fields:
    // "set": "cr.set_code",
    // "artist": "cr.artist",
    // "rarity": "cr.rarity",
  };

  // Regex to find keyword:value or keyword:"quoted value"
  // \b ensures keyword is a whole word. \s* consumes trailing spaces for cleaner remainingQuery.
  const pattern = /\b(\w+):(?:"([^"]*)"|([^\s"]+))\s*/g;
  let match;

  while ((match = pattern.exec(rawQuery)) !== null) {
    const keyword = match[1].toLowerCase();
    const value = (match[2] || match[3] || "").trim(); // match[2] for quoted, match[3] for unquoted

    if (keywordMappings[keyword] && value) {
      conditions.push({
        field: keywordMappings[keyword],
        value: `%${value}%`, // Prepare for LIKE search
      });
      remainingQuery = remainingQuery.replace(match[0], ""); // Remove matched part
    }
  }

  const generalSearchTerm = remainingQuery.trim();
  return {
    searchConditions: conditions,
    generalSearchTerm: generalSearchTerm || null,
  };
}

// --- API Sub-Router ---
const api = new Hono<{ Bindings: Bindings }>();

// == Dashboard Analytics Routes ==
api.get("/dashboard/analytics", async (c) => {
  try {
    const db = c.env.DB;
    // Comprehensive analytics query
    const [
      totalStats,
      colorStats,
      rarityStats,
      setStats,
      formatLegality,
      recentActivity,
      topCards,
      collectionValue,
    ] = await Promise.all([
      // Total collection stats
      db
        .prepare(
          `
        SELECT 
          COUNT(DISTINCT id.master_oracle_id) as unique_cards,
          SUM(id.quantity) as total_cards,
          COUNT(DISTINCT id.place_id) as locations_used,
          COUNT(DISTINCT c.set_code) as sets_collected,
          SUM(CASE WHEN id.is_foil = 1 THEN id.quantity ELSE 0 END) as foil_cards
        FROM InventoryDetails id
        JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
      `
        )
        .first<{
          unique_cards: number;
          total_cards: number;
          locations_used: number;
          sets_collected: number;
          foil_cards: number;
        }>(),

      // Color identity breakdown
      db
        .prepare(
          `
        SELECT 
          CASE 
            WHEN c.type_line LIKE '%Land%' THEN 'Land'
            WHEN c.type_line LIKE '%Artifact%' AND c.type_line NOT LIKE '%Land%' THEN 'Artifact'
            WHEN json_array_length(c.color_identity) = 0 AND c.type_line NOT LIKE '%Land%' AND c.type_line NOT LIKE '%Artifact%' THEN 'Colorless'
            WHEN json_array_length(c.color_identity) > 1 AND c.type_line NOT LIKE '%Land%' THEN 'Multicolor'
            WHEN json_extract(c.color_identity, '$[0]') = 'W' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE '%Land%' THEN 'White'
            WHEN json_extract(c.color_identity, '$[0]') = 'U' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE '%Land%' THEN 'Blue'
            WHEN json_extract(c.color_identity, '$[0]') = 'B' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE '%Land%' THEN 'Black'
            WHEN json_extract(c.color_identity, '$[0]') = 'R' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE '%Land%' THEN 'Red'
            WHEN json_extract(c.color_identity, '$[0]') = 'G' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE '%Land%' THEN 'Green'
            ELSE 'Other'
          END as color_group,
          COUNT(DISTINCT id.master_oracle_id) as unique_cards,
          SUM(id.quantity) as total_cards
        FROM InventoryDetails id
        JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
        GROUP BY color_group
        ORDER BY total_cards DESC
      `
        )
        .all<{
          color_group: string;
          unique_cards: number;
          total_cards: number;
        }>(),

      // Rarity breakdown
      db
        .prepare(
          `
        SELECT 
          c.rarity,
          COUNT(DISTINCT id.master_oracle_id) as unique_cards,
          SUM(id.quantity) as total_cards
        FROM InventoryDetails id
        JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
        GROUP BY c.rarity
        ORDER BY 
          CASE c.rarity 
            WHEN 'mythic' THEN 1 
            WHEN 'rare' THEN 2 
            WHEN 'uncommon' THEN 3 
            WHEN 'common' THEN 4 
            ELSE 5 
          END
      `
        )
        .all<{
          rarity: string;
          unique_cards: number;
          total_cards: number;
        }>(),

      // Top sets by count
      db
        .prepare(
          `
        SELECT 
          c.set_name,
          c.set_code,
          COUNT(DISTINCT id.master_oracle_id) as unique_cards,
          SUM(id.quantity) as total_cards,
          c.released_at
        FROM InventoryDetails id
        JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
        GROUP BY c.set_code, c.set_name, c.released_at
        ORDER BY total_cards DESC
        LIMIT 10
      `
        )
        .all<{
          set_name: string;
          set_code: string;
          unique_cards: number;
          total_cards: number;
          released_at: string;
        }>(),

      // Format legality summary
      db
        .prepare(
          `
        SELECT 
          'commander' as format,
          COUNT(DISTINCT id.master_oracle_id) as legal_cards
        FROM InventoryDetails id
        JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
        WHERE json_extract(c.legalities, '$.commander') IN ('legal', 'restricted')
        
        UNION ALL
        
        SELECT 
          'modern' as format,
          COUNT(DISTINCT id.master_oracle_id) as legal_cards
        FROM InventoryDetails id
        JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
        WHERE json_extract(c.legalities, '$.modern') IN ('legal', 'restricted')
        
        UNION ALL
        
        SELECT 
          'standard' as format,
          COUNT(DISTINCT id.master_oracle_id) as legal_cards
        FROM InventoryDetails id
        JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
        WHERE json_extract(c.legalities, '$.standard') IN ('legal', 'restricted')
      `
        )
        .all<{
          format: string;
          legal_cards: number;
        }>(),

      // Recent activity (last 30 days)
      db
        .prepare(
          `
          SELECT
            'inventory_add' as type,
            c.name as card_name,
            id.quantity as quantity,
            id.added_at as timestamp,
            p.name as location
          FROM InventoryDetails id
          JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
          LEFT JOIN Places p ON id.place_id = p.id
          WHERE datetime(id.added_at) >= datetime('now', '-30 days')

          UNION ALL

          SELECT
            'deck_create' as type,
            d.name as card_name,
            NULL as quantity,
            d.created_at as timestamp,
            d.format as location
          FROM Decks d
          WHERE datetime(d.created_at) >= datetime('now', '-30 days')

          UNION ALL

          SELECT
            'deck_update' as type,
            d.name as card_name,
            NULL as quantity,
            d.updated_at as timestamp,
            d.format as location
          FROM Decks d
          WHERE datetime(d.updated_at) >= datetime('now', '-30 days')
            AND d.updated_at != d.created_at

          ORDER BY timestamp DESC
          LIMIT 20
      `
        )
        .all<{
          type: string;
          card_name: string;
          quantity: number | null;
          timestamp: string;
          location: string | null;
        }>(),

      // Most collected cards
      db
        .prepare(
          `
        SELECT 
          c.name,
          c.scryfall_id,
          c.image_uris,
          c.card_faces,
          SUM(id.quantity) as total_copies,
          COUNT(*) as different_printings,
          c.rarity,
          c.set_name
        FROM InventoryDetails id
        JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
        GROUP BY id.master_oracle_id, c.name
        ORDER BY total_copies DESC, different_printings DESC
        LIMIT 10
      `
        )
        .all<{
          name: string;
          scryfall_id: string;
          image_uris: string | null;
          card_faces: string | null;
          total_copies: number;
          different_printings: number;
          rarity: string;
          set_name: string;
        }>(),

      // Collection value estimate (placeholder - you'd integrate with pricing APIs)
      Promise.resolve({
        estimated_value: 0,
        last_updated: new Date().toISOString(),
        price_source: "placeholder",
      }),
    ]);

    return c.json({
      totalStats: totalStats || {
        unique_cards: 0,
        total_cards: 0,
        locations_used: 0,
        sets_collected: 0,
        foil_cards: 0,
      },
      colorStats: colorStats?.results || [],
      rarityStats: rarityStats?.results || [],
      setStats: setStats?.results || [],
      formatLegality: formatLegality?.results || [],
      recentActivity: recentActivity?.results || [],
      topCards: topCards?.results || [],
      collectionValue,
    });
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch dashboard analytics");
  }
});

api.get("/dashboard/quick-stats", async (c) => {
  try {
    const db = c.env.DB;
    const [deckStats, inventoryGrowth] = await Promise.all([
      // Deck statistics
      db
        .prepare(
          `
        SELECT 
          d.format,
          COUNT(*) as deck_count,
          AVG(card_counts.total_cards) as avg_deck_size
        FROM Decks d
        LEFT JOIN (
          SELECT 
            deck_id,
            SUM(quantity) as total_cards
          FROM DeckCards 
          WHERE is_sideboard = 0
          GROUP BY deck_id
        ) card_counts ON d.id = card_counts.deck_id
        GROUP BY d.format
        ORDER BY deck_count DESC
      `
        )
        .all<{
          format: string;
          deck_count: number;
          avg_deck_size: number;
        }>(),

      // Collection growth (last 7 days)
      db
        .prepare(
          `
        SELECT 
          DATE(added_at) as date,
          COUNT(*) as cards_added,
          SUM(quantity) as total_quantity
        FROM InventoryDetails
        WHERE datetime(added_at) >= datetime('now', '-7 days')
        GROUP BY DATE(added_at)
        ORDER BY date ASC
      `
        )
        .all<{
          date: string;
          cards_added: number;
          total_quantity: number;
        }>(),
    ]);

    return c.json({
      deckStats: deckStats?.results || [],
      inventoryGrowth: inventoryGrowth?.results || [],
    });
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch quick stats");
  }
});

// == Scryfall Search Route ==
api.get("/scryfall/cards/search", async (c) => {
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
        `[WORKER] Scryfall API fetch FAILED. Status: ${directResponse.status}, Query: "${query}", URL: ${scryfallApiUrl}, Body: ${responseText.substring(0, 500)}...`
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
        `[WORKER] Scryfall API returned an error object. Query: "${query}", Details: ${scryfallResponse.details}`
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
        `[WORKER] Scryfall response not a recognized list. Query: "${query}", Body: ${responseText.substring(0, 200)}...`
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
            c.name.toLowerCase().includes("kumena speaker")
          ),
          null,
          2
        )
      );
    }

    // Batch D1 Inserts for performance
    const cardsToInsert = scryfallCards.map((cardData) => {
      if (cardData.name.toLowerCase().includes("kumena speaker")) {
        console.log(
          "INDIVIDUAL cardData for Sol Ring (before map):",
          JSON.stringify(cardData, null, 2)
        );
      }
      const cardDbo = mapScryfallCardToDbo(cardData);
      if (cardData.name.toLowerCase().includes("kumena speaker")) {
        console.log(
          "cardToInsert for Sol Ring (after map):",
          JSON.stringify(cardDbo, null, 2)
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
      error instanceof Error ? error.stack : ""
    );
    return c.json(
      {
        message: "Error searching for cards. Please try again.",
        errorDetail: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// == Scryfall Get Card By ID Route ==
api.get("/scryfall/cards/:id", async (c) => {
  const id = c.req.param("id");

  try {
    // 1) Try local DB first
    const local = await c.env.DB.prepare(
      "SELECT * FROM Cards WHERE scryfall_id = ?"
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
      500
    );
  }
});

// == Scryfall Get by CardMarket ID Route ==
api.get("/scryfall/cards/cardmarket/:cardmarket_id", async (c) => {
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
        `[WORKER] Scryfall API CardMarket ID fetch FAILED. Status: ${directResponse.status}, ID: ${cardmarketId}, URL: ${scryfallApiUrl}, Body: ${responseText.substring(0, 500)}...`
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
        `[WORKER] Scryfall CardMarket ID response not a card object. ID: ${cardmarketId}, Body: ${responseText.substring(0, 200)}...`
      );
      return c.json({ message: "Unexpected response from Scryfall" }, 502); // Bad Gateway
    }

    const cardDbo = mapScryfallCardToDbo(scryfallCard);
    await prepareCardInsert(db, cardDbo).run();

    return c.json(scryfallCard); // Return the ScryfallApiCard object
  } catch (error: unknown) {
    console.error(
      `[WORKER] Error in /scryfall/cards/cardmarket/${cardmarketId}:`,
      error
    );
    return c.json(
      {
        message: "Error fetching card by CardMarket ID.",
        errorDetail: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// == Places Routes ==
api.get("/places", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM Places ORDER BY name ASC"
    ).all<PlaceDbo>();
    return c.json(results || []);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch places");
  }
});

api.post("/places", validateRequest(createPlaceSchema), async (c) => {
  try {
    const { name, type, description } = getValidatedData<CreatePlacePayload>(c);

    const result = await c.env.DB.prepare(
      "INSERT INTO Places (name, type, description) VALUES (?, ?, ?) RETURNING *"
    )
      .bind(name, type, description || null)
      .first<PlaceDbo>();

    return result
      ? c.json(result, 201)
      : c.json({ message: "Failed to create place" }, 500);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      return c.json({ message: "A place with this name already exists." }, 409);
    }
    return handleKnownErrors(e, c, "Failed to create place");
  }
});

api.get("/places/:id", async (c) => {
  try {
    const id = getIntId(c);
    const place = await c.env.DB.prepare("SELECT * FROM Places WHERE id = ?")
      .bind(id)
      .first<PlaceDbo>();

    return place ? c.json(place) : c.json({ message: "Place not found" }, 404);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch place");
  }
});

api.put("/places/:id", validateRequest(updatePlaceSchema), async (c) => {
  try {
    const id = getIntId(c);
    const { name, type, description } = getValidatedData<UpdatePlacePayload>(c);

    const fieldsToUpdate: string[] = [];
    const valuesToBind: (string | null)[] = [];

    if (name !== undefined) {
      fieldsToUpdate.push("name = ?");
      valuesToBind.push(name);
    }
    if (type !== undefined) {
      fieldsToUpdate.push("type = ?");
      valuesToBind.push(type);
    }
    // For description, allow setting to null explicitly
    if (Object.prototype.hasOwnProperty.call({ name, type, description }, "description")) {
      fieldsToUpdate.push("description = ?");
      valuesToBind.push(description === undefined ? null : description);
    }

    if (fieldsToUpdate.length === 0) {
      return c.json({ message: "No valid fields to update" }, 400);
    }

    fieldsToUpdate.push("updated_at = CURRENT_TIMESTAMP");
    valuesToBind.push(id.toString());

    const updatedPlace = await c.env.DB.prepare(
      `UPDATE Places SET ${fieldsToUpdate.join(", ")} WHERE id = ? RETURNING *`
    )
      .bind(...valuesToBind)
      .first<PlaceDbo>();

    return updatedPlace
      ? c.json(updatedPlace)
      : c.json({ message: "Place not found or failed to update" }, 404);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      return c.json({ message: "A place with this name already exists." }, 409);
    }
    return handleKnownErrors(e, c, "Failed to update place");
  }
});

api.delete("/places/:id", async (c) => {
  try {
    const id = getIntId(c);

    const { success, meta } = await c.env.DB.prepare(
      "DELETE FROM Places WHERE id = ?"
    )
      .bind(id)
      .run();

    return success && meta.changes > 0
      ? c.body(null, 204)
      : c.json({ message: "Place not found or failed to delete" }, 404);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to delete place");
  }
});

// Helper function to generate SQL for color group filtering
function buildColorGroupSubquery(colorGroup: string): {
  sql: string;
  bindings: (string | number)[];
} {
  const subqueryBase = `
    SELECT DISTINCT master_oracle_id
    FROM InventoryDetails id
    JOIN Cards c ON id.card_scryfall_id = c.scryfall_id
  `;

  switch (colorGroup) {
    case "Land":
      return {
        sql: `${subqueryBase} WHERE c.type_line LIKE ?`,
        bindings: ["%Land%"],
      };
    case "Artifact":
      return {
        sql: `${subqueryBase} WHERE c.type_line LIKE ? AND c.type_line NOT LIKE ?`,
        bindings: ["%Artifact%", "%Land%"],
      };
    case "Colorless":
      return {
        sql: `${subqueryBase} WHERE c.type_line NOT LIKE ? AND c.type_line NOT LIKE ? AND json_array_length(c.color_identity) = 0`,
        bindings: ["%Land%", "%Artifact%"],
      };
    case "Multicolor":
      return {
        sql: `${subqueryBase} WHERE json_array_length(c.color_identity) > 1 AND c.type_line NOT LIKE ?`,
        bindings: ["%Land%"],
      };
    case "White":
      return {
        sql: `${subqueryBase} WHERE json_extract(c.color_identity, '$[0]') = 'W' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE ?`,
        bindings: ["%Land%"],
      };
    case "Blue":
      return {
        sql: `${subqueryBase} WHERE json_extract(c.color_identity, '$[0]') = 'U' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE ?`,
        bindings: ["%Land%"],
      };
    case "Black":
      return {
        sql: `${subqueryBase} WHERE json_extract(c.color_identity, '$[0]') = 'B' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE ?`,
        bindings: ["%Land%"],
      };
    case "Red":
      return {
        sql: `${subqueryBase} WHERE json_extract(c.color_identity, '$[0]') = 'R' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE ?`,
        bindings: ["%Land%"],
      };
    case "Green":
      return {
        sql: `${subqueryBase} WHERE json_extract(c.color_identity, '$[0]') = 'G' AND json_array_length(c.color_identity) = 1 AND c.type_line NOT LIKE ?`,
        bindings: ["%Land%"],
      };
    default:
      return { sql: "", bindings: [] };
  }
}

// == Master Inventory Routes ==

api.post("/v2/inventory", validateRequest(createMasterInventorySchema), async (c) => {
  try {
    const { oracle_id, name, notes } = getValidatedData<CreateMasterInventoryPayload>(c);

    // Use INSERT OR IGNORE to avoid UNIQUE constraint errors
    const result = await c.env.DB.prepare(
      "INSERT OR IGNORE INTO MasterInventory (oracle_id, name, notes) VALUES (?, ?, ?) RETURNING *"
    )
      .bind(oracle_id, name, notes ?? null)
      .first<MasterInventoryDbo>();

    if (result) {
      // The row was inserted successfully
      return c.json(result, 201);
    } else {
      // The row already existed and was ignored. Fetch the existing one to return it.
      const existing = await c.env.DB.prepare(
        "SELECT * FROM MasterInventory WHERE oracle_id = ?"
      )
        .bind(oracle_id)
        .first<MasterInventoryDbo>();

      if (existing) {
        return c.json(existing, 200); // Return 200 OK for existing resource
      } else {
        // This case should be virtually impossible if the INSERT OR IGNORE failed
        // because of a constraint but the row can't be found.
        return c.json(
          { message: "Failed to create or find master inventory entry" },
          500
        );
      }
    }
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to create master inventory entry");
  }
});

api.get("/v2/inventory/counts", async (c) => {
  try {
    const db = c.env.DB;
    const colorGroups = [
      "White",
      "Blue",
      "Black",
      "Red",
      "Green",
      "Multicolor",
      "Colorless",
      "Artifact",
      "Land",
    ];
    const counts: Record<string, number> = {};

    for (const group of colorGroups) {
      const { sql, bindings } = buildColorGroupSubquery(group);
      if (sql) {
        const countResult = await db
          .prepare(`SELECT COUNT(*) as count FROM (${sql})`)
          .bind(...bindings)
          .first<{ count: number }>();
        counts[group] = countResult?.count || 0;
      }
    }

    return c.json(counts);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch master inventory counts");
  }
});

// Get all master inventory entries with their details
api.get("/v2/inventory", async (c) => {
  try {
    const db = c.env.DB;
    const { page, limit, offset } = getPaginationParams(c, 50, 200);
    const searchQuery = c.req.query("q");
    const colorGroup = c.req.query("colorGroup");

    let masterQuery = "SELECT * FROM MasterInventory";
    let countQuery = "SELECT COUNT(*) as count FROM MasterInventory";
    const bindings: (string | number)[] = [];
    const countBindings: (string | number)[] = [];

    if (searchQuery) {
      const { searchConditions, generalSearchTerm } =
        parseInventorySearchQuery(searchQuery);
      const whereClauses: string[] = [];
      const queryBindings: (string | number)[] = [];

      if (generalSearchTerm) {
        whereClauses.push("name LIKE ?");
        queryBindings.push(`%${generalSearchTerm}%`);
      }

      if (searchConditions.length > 0) {
        const cardConditions = searchConditions
          .map((c) => `${c.field} LIKE ?`)
          .join(" AND ");
        const cardBindings = searchConditions.map((c) => c.value);

        const subquery = `SELECT DISTINCT id.master_oracle_id FROM InventoryDetails id JOIN Cards cr ON id.card_scryfall_id = cr.scryfall_id WHERE ${cardConditions}`;

        whereClauses.push(`oracle_id IN (${subquery})`);
        queryBindings.push(...cardBindings);
      }

      if (whereClauses.length > 0) {
        const whereClause = ` WHERE ${whereClauses.join(" AND ")}`;
        masterQuery += whereClause;
        countQuery += whereClause;
        bindings.push(...queryBindings);
        countBindings.push(...queryBindings);
      }
    } else if (colorGroup) {
      const { sql, bindings: subqueryBindings } =
        buildColorGroupSubquery(colorGroup);
      if (sql) {
        const whereClause = ` WHERE oracle_id IN (${sql}) `;
        masterQuery += whereClause;
        countQuery += whereClause;
        bindings.push(...subqueryBindings);
        countBindings.push(...subqueryBindings);
      }
    }

    masterQuery += " ORDER BY name ASC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);

    // Fetch paginated master entries
    const { results: masters } = await db
      .prepare(masterQuery)
      .bind(...bindings)
      .all<MasterInventoryDbo>();

    // Get total count for pagination metadata
    const { results: totalCountResult } = await db
      .prepare(countQuery)
      .bind(...countBindings)
      .all<{ count: number }>();
    const totalCount = totalCountResult?.[0]?.count || 0;

    if (!masters || masters.length === 0) {
      return c.json({
        data: [],
        totalCount: totalCount,
        hasMore: false,
      });
    }

    // Efficiently fetch all details for the retrieved masters in one go
    const masterOracleIds = masters.map((m) => m.oracle_id);
    const placeholders = masterOracleIds.map(() => "?").join(",");

    const { results: allDetails } = await db
      .prepare(
        `
        SELECT
          id.*,
          cr.*,
          p.name as place_name
        FROM InventoryDetails id
        JOIN Cards cr ON id.card_scryfall_id = cr.scryfall_id
        LEFT JOIN Places p ON id.place_id = p.id
        WHERE id.master_oracle_id IN (${placeholders})
        ORDER BY cr.released_at ASC
      `
      )
      .bind(...masterOracleIds)
      .all<InventoryDetailDbo & CardDbo & { place_name: string | null }>();

    // Group details by master_oracle_id for efficient lookup
    const detailsMap = new Map<string, InventoryDetailWithCardDetails[]>();
    if (allDetails) {
      for (const row of allDetails) {
        const detail: InventoryDetailWithCardDetails = {
          id: row.id,
          master_oracle_id: row.master_oracle_id,
          card_scryfall_id: row.card_scryfall_id,
          place_id: row.place_id,
          quantity: row.quantity,
          condition: row.condition,
          is_foil: !!row.is_foil,
          language: row.language,
          notes: row.notes,
          added_at: row.added_at,
          updated_at: row.updated_at,
          card: mapDboToScryfallApiCard(row as CardDbo),
          place_name: row.place_name,
        };

        if (!detailsMap.has(detail.master_oracle_id)) {
          detailsMap.set(detail.master_oracle_id, []);
        }
        detailsMap.get(detail.master_oracle_id)!.push(detail);
      }
    }

    // Combine masters with their grouped details
    const response: MasterInventoryWithDetails[] = masters.map((master) => ({
      ...master,
      details: detailsMap.get(master.oracle_id) || [],
    }));

    return c.json({
      data: response,
      totalCount: totalCount,
      hasMore: page * limit < totalCount,
    });
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch master inventory");
  }
});

api.post("/v2/inventory/details", validateRequest(addInventoryDetailSchema), async (c) => {
  try {
    const data = getValidatedData<AddInventoryDetailPayload>(c);

    // ensure master exists
    const master = await c.env.DB.prepare(
      "SELECT oracle_id FROM MasterInventory WHERE oracle_id = ?"
    )
      .bind(data.master_oracle_id)
      .first();
    if (!master) {
      return c.json(
        {
          message: `Master inventory ${data.master_oracle_id} not found.`,
        },
        404
      );
    }

    // auto-fetch any missing card
    try {
      await ensureCardsExist(c.env.DB, [data.scryfall_card_id]);
    } catch {
      return c.json(
        { message: `Card ${data.scryfall_card_id} not found on Scryfall.` },
        404
      );
    }

    // verify place if provided
    if (data.place_id) {
      const place = await c.env.DB.prepare("SELECT id FROM Places WHERE id = ?")
        .bind(data.place_id)
        .first();
      if (!place) {
        return c.json(
          { message: `Place with ID ${data.place_id} not found.` },
          404
        );
      }
    }

    // insert detail
    const row = await c.env.DB.prepare(
      `INSERT INTO InventoryDetails
           (master_oracle_id, card_scryfall_id, place_id, quantity, condition, is_foil, language, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
    )
      .bind(
        data.master_oracle_id,
        data.scryfall_card_id,
        data.place_id ?? null,
        data.quantity,
        data.condition,
        data.is_foil ? 1 : 0,
        data.language,
        data.notes ?? null
      )
      .first<InventoryDetailDbo>();

    if (!row) {
      return c.json(
        { message: "Failed to add item to inventory details" },
        500
      );
    }

    // load card & place_name
    const card = await c.env.DB.prepare(
      "SELECT * FROM Cards WHERE scryfall_id = ?"
    )
      .bind(row.card_scryfall_id)
      .first<CardDbo>();

    if (!card) {
      return c.json({ message: "Card not found" }, 500);
    }

    const placeName = await getPlaceName(c.env.DB, row.place_id);
    const output = buildInventoryDetailResponse(row, card, placeName);

    return c.json(output, 201);
  } catch (err: unknown) {
    return handleKnownErrors(err, c, "Failed to add to inventory details");
  }
});

// Update an inventory detail item
api.put("/v2/inventory/details/:id", validateRequest(updateInventoryDetailSchema), async (c) => {
  try {
    const id = getIntId(c);
    const dataToUpdate = getValidatedData<UpdateInventoryDetailPayload>(c);

    const existingItem = await c.env.DB.prepare(
      "SELECT * FROM InventoryDetails WHERE id = ?"
    )
      .bind(id)
      .first<InventoryDetailDbo>();
    if (!existingItem) {
      return c.json({ message: "Inventory detail item not found" }, 404);
    }

    if (dataToUpdate.place_id) {
      const placeExists = await c.env.DB.prepare(
        "SELECT id FROM Places WHERE id = ?"
      )
        .bind(dataToUpdate.place_id)
        .first();
      if (!placeExists) {
        return c.json(
          { message: `Place with ID ${dataToUpdate.place_id} not found.` },
          404
        );
      }
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    (Object.keys(dataToUpdate) as Array<keyof typeof dataToUpdate>).forEach(
      (key) => {
        fields.push(`${key} = ?`);
        if (key === "is_foil") {
          values.push(dataToUpdate[key] ? 1 : 0);
        } else {
          values.push(
            dataToUpdate[key] === undefined ? null : dataToUpdate[key]
          );
        }
      }
    );

    if (fields.length === 0) {
      return c.json({ message: "No fields to update" }, 400);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const updatedItemDbo = await c.env.DB.prepare(
      `UPDATE InventoryDetails SET ${fields.join(", ")} WHERE id = ? RETURNING *`
    )
      .bind(...values)
      .first<InventoryDetailDbo>();

    if (!updatedItemDbo) {
      return c.json({ message: "Failed to update inventory detail" }, 500);
    }

    // Fetch related data for full response
    const cardDbo = await c.env.DB.prepare(
      "SELECT * FROM Cards WHERE scryfall_id = ?"
    )
      .bind(updatedItemDbo.card_scryfall_id)
      .first<CardDbo>();
    if (!cardDbo) return c.json({ message: "Card not found" }, 500);

    const placeName = await getPlaceName(c.env.DB, updatedItemDbo.place_id);
    const responseItem = buildInventoryDetailResponse(updatedItemDbo, cardDbo, placeName);

    return c.json(responseItem);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to update inventory detail");
  }
});

// Delete an inventory detail item
api.delete("/v2/inventory/details/:id", async (c) => {
  try {
    const id = getIntId(c);

    const { success, meta } = await c.env.DB.prepare(
      "DELETE FROM InventoryDetails WHERE id = ?"
    )
      .bind(id)
      .run();

    return success && meta.changes > 0
      ? c.body(null, 204)
      : c.json({ message: "Item not found or failed to delete" }, 404);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to delete inventory detail");
  }
});

// Delete a master inventory entry
api.delete("/v2/inventory/:oracle_id", async (c) => {
  try {
    const oracle_id = getStringId(c, "oracle_id");

    const { success, meta } = await c.env.DB.prepare(
      "DELETE FROM MasterInventory WHERE oracle_id = ?"
    )
      .bind(oracle_id)
      .run();

    return success && meta.changes > 0
      ? c.body(null, 204)
      : c.json({ message: "Master inventory entry not found" }, 404);
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to delete master inventory entry");
  }
});

// == Deckbuilder Routes ==

api.post("/decks", validateRequest(createDeckSchema), async (c) => {
  try {
    const { name, format, description, cards } = getValidatedData<z.infer<typeof createDeckSchema>>(c);
    const db = c.env.DB;
    // generate a UUID for this deck
    const id = crypto.randomUUID();

    // TODO: Consider D1 transactions if multiple operations need to be atomic.
    // For Cloudflare D1, true multi-statement transactions are complex.
    // Batching is available for multiple inserts/updates of the same type.

    const deckResult = await db
      .prepare(
        "INSERT INTO Decks (id, name, format, description) VALUES (?, ?, ?, ?) RETURNING *"
      )
      .bind(id, name, format, description || null)
      .first<DeckDbo>();

    if (!deckResult) {
      return c.json({ message: "Failed to create deck metadata" }, 500);
    }
    const deckId = deckResult.id;

    if (cards && cards.length > 0) {
      // Make sure every referenced card is present in Cards
      await ensureCardsExist(db, [...new Set(cards.map((c: { scryfall_id: string }) => c.scryfall_id))]);
      const cardStatements = cards.map((card: { scryfall_id: string; quantity: number; is_commander?: boolean; is_sideboard?: boolean; is_maybeboard?: boolean }) => {
        // Verify each card exists in local Cards table before attempting to add to deck
        // This check can be done upfront for all cards for efficiency
        return db
          .prepare(
            `INSERT INTO DeckCards (
              deck_id, card_scryfall_id, quantity,
              is_commander, is_sideboard, is_maybeboard
            ) VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(
            deckId,
            card.scryfall_id,
            card.quantity,
            boolToInt(card.is_commander),
            boolToInt(card.is_sideboard),
            boolToInt(card.is_maybeboard)
          );
      });
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
         WHERE dc.deck_id = ?`
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

api.get("/decks", async (c) => {
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
       WHERE dc.deck_id = ?`
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

api.get("/decks/:id", async (c) => {
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
     WHERE dc.deck_id = ?`
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

api.put("/decks/:id", validateRequest(updateDeckSchema), async (c) => {
  try {
    const id = getStringId(c);
    const db = c.env.DB;
    const { name, format, description, cards } = getValidatedData<z.infer<typeof updateDeckSchema>>(c);

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
      await ensureCardsExist(db, [...new Set(cards.map((c: { scryfall_id: string }) => c.scryfall_id))]);
      // Validate all card scryfall_ids exist in Cards table (omitted for brevity)
      await db
        .prepare("DELETE FROM DeckCards WHERE deck_id = ?")
        .bind(id)
        .run();
      if (cards.length > 0) {
        const cardStatements = cards.map((card: { scryfall_id: string; quantity: number; is_commander?: boolean; is_sideboard?: boolean; is_maybeboard?: boolean }) =>
          db
            .prepare(
              `INSERT INTO DeckCards (
                deck_id, card_scryfall_id, quantity,
                is_commander, is_sideboard, is_maybeboard
             ) VALUES (?, ?, ?, ?, ?, ?)`
            )
            .bind(
              id,
              card.scryfall_id,
              card.quantity,
              boolToInt(card.is_commander),
              boolToInt(card.is_sideboard),
              boolToInt(card.is_maybeboard)
            )
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
         WHERE dc.deck_id = ?`
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

api.delete("/decks/:id", async (c) => {
  try {
    const id = getStringId(c);

    const deckExists = await c.env.DB.prepare(
      "SELECT id FROM Decks WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!deckExists) {
      return c.json({ message: "Deck not found" }, 404);
    }

    // ON DELETE CASCADE in DeckCards table will handle associated cards
    const { success, meta } = await c.env.DB.prepare(
      "DELETE FROM Decks WHERE id = ?"
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
api.get("/decks/:id/legality", async (c) => {
  try {
    const id = getStringId(c);
    const format = c.req.query("format");
    if (!format) {
      return c.json({ message: "Format query parameter is required" }, 400);
    }
    const db = c.env.DB;
    const deck = await db.prepare("SELECT format FROM Decks WHERE id = ?")
      .bind(id)
      .first<{ format: string }>();

    if (!deck) {
      return c.json({ message: "Deck not found" }, 404);
    }

    const { results: cards } = await c.env.DB.prepare(
      `SELECT cr.name, cr.legalities
       FROM DeckCards dc
       JOIN Cards cr ON dc.card_scryfall_id = cr.scryfall_id
       WHERE dc.deck_id = ? AND dc.is_sideboard = 0`
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

api.get("/activity", async (c) => {
  try {
    const db = c.env.DB;
    const { page, limit, offset } = getPaginationParams(c, 20, 100);

      const activityQuery = `
      SELECT 'inventory_add' as type, c.name as card_name, id.quantity as quantity, id.added_at as timestamp, p.name as location FROM InventoryDetails id JOIN Cards c ON id.card_scryfall_id = c.scryfall_id LEFT JOIN Places p ON id.place_id = p.id
      UNION ALL
      SELECT 'deck_create' as type, d.name as card_name, NULL as quantity, d.created_at as timestamp, d.format as location FROM Decks d
      UNION ALL
      SELECT 'deck_update' as type, d.name as card_name, NULL as quantity, d.updated_at as timestamp, d.format as location FROM Decks d WHERE d.updated_at != d.created_at
    `;

    const totalResult = await db
      .prepare(`SELECT COUNT(*) as count FROM (${activityQuery})`)
      .first<{ count: number }>();
    const totalCount = totalResult?.count || 0;

    const { results: activities } = await db
      .prepare(
        `SELECT * FROM (${activityQuery}) ORDER BY timestamp DESC LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all<{
        type: string;
        card_name: string;
        quantity: number | null;
        timestamp: string;
        location: string | null;
      }>();

    return c.json({
      data: activities || [],
      totalCount,
      hasMore: page * limit < totalCount,
    });
  } catch (e: unknown) {
    return handleKnownErrors(e, c, "Failed to fetch activity feed");
  }
});

// == Admin Routes (Optional) ==
// Example: A protected route to refresh some data
api.get("/admin/refresh-scryfall-sets", async (c) => {
  const secret = c.req.header("X-Refresh-Secret");
  if (secret !== c.env.REFRESH_SECRET) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  // Your logic to refresh set data from Scryfall would go here
  return c.json({ message: "Set data refresh initiated." });
});

// --- Main Handler ---
export default {
  fetch: app.fetch,
};

// Error handling for Zod validation errors
app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        message: "Validation failed",
        errors: err.flatten().fieldErrors,
      },
      400
    );
  }
  // Log other errors to the console
  console.error(`[WORKER] Unhandled error: ${err.message}`, err.stack);
  return c.json(
    {
      message: "An unexpected error occurred.",
      error: err.message, // Be careful about exposing error details in production
    },
    500
  );
});

// Route all /api calls to the 'api' sub-router
app.route("/api", api);
("");
