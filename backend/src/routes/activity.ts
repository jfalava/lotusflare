import { Hono } from "hono";
import { getPaginationParams } from "../helpers/param-helpers";
import { handleKnownErrors } from "../middlewares/error-handler";
import type { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
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
        `SELECT * FROM (${activityQuery}) ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
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

export default app;
