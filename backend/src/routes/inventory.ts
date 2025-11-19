import { Hono } from "hono";
import { mapDboToScryfallApiCard } from "../card-utils";
import { getPlaceName } from "../helpers/db-helpers";
import { buildColorGroupSubquery, parseInventorySearchQuery } from "../helpers/inventory-helpers";
import { getIntId, getPaginationParams, getStringId } from "../helpers/param-helpers";
import { ensureCardsExist } from "../helpers/scryfall-helpers";
import { buildInventoryDetailResponse } from "../mappers/inventory-mappers";
import { handleKnownErrors } from "../middlewares/error-handler";
import { getValidatedData, validateRequest } from "../middlewares/validate-request";
import type {
  AddInventoryDetailPayload,
  Bindings,
  CardDbo,
  CreateMasterInventoryPayload,
  InventoryDetailDbo,
  InventoryDetailWithCardDetails,
  MasterInventoryDbo,
  MasterInventoryWithDetails,
  UpdateInventoryDetailPayload,
} from "../types";
import {
  addInventoryDetailSchema,
  createMasterInventorySchema,
  updateInventoryDetailSchema,
} from "../validators";

const app = new Hono<{ Bindings: Bindings }>();

// == Master Inventory Routes ==

app.get("/counts", async (c) => {
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
app.get("/", async (c) => {
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

app.post("/", validateRequest(createMasterInventorySchema), async (c) => {
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

app.post("/details", validateRequest(addInventoryDetailSchema), async (c) => {
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
app.put("/details/:id", validateRequest(updateInventoryDetailSchema), async (c) => {
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
app.delete("/details/:id", async (c) => {
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
app.delete("/:oracle_id", async (c) => {
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

export default app;
