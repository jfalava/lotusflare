import { Hono } from "hono";
import { handleKnownErrors } from "../middlewares/error-handler";
import type { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// == Dashboard Analytics Routes ==
app.get("/analytics", async (c) => {
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
      `,
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
      `,
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
      `,
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
      `,
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
      `,
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
      `,
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
      `,
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

app.get("/quick-stats", async (c) => {
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
      `,
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
      `,
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

export default app;
