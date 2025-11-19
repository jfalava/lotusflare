import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";
import type { CardDbo } from "../types";
import { NotFoundError } from "../middlewares/error-handler";

/**
 * Card insert SQL statement
 */
const CARD_INSERT_SQL = `
  INSERT OR IGNORE INTO Cards (
    scryfall_id, oracle_id, name, lang, released_at,
    set_id, set_code, set_name, collector_number, rarity,
    cardmarket_id, layout, mana_cost, cmc, type_line,
    oracle_text, power, toughness, loyalty, keywords,
    colors, color_identity, image_uris, finishes, card_faces,
    artist, illustration_id, scryfall_uri, legalities, purchase_uris
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`.trim();

/**
 * Bind card data to prepared statement parameters
 * @param dbo - Card database object (without created_at/updated_at)
 * @returns Array of values to bind
 */
export function bindCardParams(dbo: Omit<CardDbo, "created_at" | "updated_at">): unknown[] {
  return [
    dbo.scryfall_id,
    dbo.oracle_id,
    dbo.name,
    dbo.lang,
    dbo.released_at,
    dbo.set_id,
    dbo.set_code,
    dbo.set_name,
    dbo.collector_number,
    dbo.rarity,
    dbo.cardmarket_id,
    dbo.layout,
    dbo.mana_cost,
    dbo.cmc,
    dbo.type_line,
    dbo.oracle_text,
    dbo.power,
    dbo.toughness,
    dbo.loyalty,
    dbo.keywords,
    dbo.colors,
    dbo.color_identity,
    dbo.image_uris,
    dbo.finishes,
    dbo.card_faces,
    dbo.artist,
    dbo.illustration_id,
    dbo.scryfall_uri,
    dbo.legalities,
    dbo.purchase_uris,
  ];
}

/**
 * Create a prepared statement for card insertion
 * @param db - D1 database
 * @param card - Card database object (without created_at/updated_at)
 * @returns Prepared statement ready to execute
 */
export function prepareCardInsert(
  db: D1Database,
  card: Omit<CardDbo, "created_at" | "updated_at">
): D1PreparedStatement {
  return db.prepare(CARD_INSERT_SQL).bind(...bindCardParams(card));
}

/**
 * Insert multiple cards in a batch
 * @param db - D1 database
 * @param cards - Array of card database objects (without created_at/updated_at)
 * @returns Batch result
 */
export async function batchInsertCards(
  db: D1Database,
  cards: Omit<CardDbo, "created_at" | "updated_at">[]
): Promise<D1Result[]> {
  const statements = cards.map((card) => prepareCardInsert(db, card));
  return await db.batch(statements);
}

/**
 * Ensure an entity exists in the database
 * @param db - D1 database
 * @param query - SQL query to check existence
 * @param param - Parameter to bind
 * @param entityName - Name of entity for error message
 * @returns Entity data
 * @throws NotFoundError if entity doesn't exist
 */
export async function ensureEntityExists<T>(
  db: D1Database,
  query: string,
  param: string | number,
  entityName: string
): Promise<T> {
  const result = await db.prepare(query).bind(param).first<T>();

  if (!result) {
    throw new NotFoundError(`${entityName} not found`);
  }

  return result;
}

/**
 * Get place name by ID
 * @param db - D1 database
 * @param placeId - Place ID
 * @returns Place name or null if not found
 */
export async function getPlaceName(
  db: D1Database,
  placeId: number | null
): Promise<string | null> {
  if (!placeId) return null;

  const result = await db
    .prepare("SELECT name FROM Places WHERE id = ?")
    .bind(placeId)
    .first<{ name: string }>();

  return result?.name ?? null;
}

/**
 * Build dynamic UPDATE query
 * @param updates - Object with fields to update
 * @param tableName - Name of the table
 * @param whereClause - WHERE clause (should include placeholders)
 * @param typeConversions - Optional type conversion functions
 * @returns SQL query and values to bind
 */
export function buildUpdateQuery<T extends Record<string, unknown>>(
  updates: T,
  tableName: string,
  whereClause: string,
  typeConversions?: Record<string, (val: unknown) => unknown>
): { sql: string; values: unknown[] } {
  const fields: string[] = [];
  const values: unknown[] = [];

  Object.entries(updates).forEach(([key, val]) => {
    fields.push(`${key} = ?`);

    if (typeConversions?.[key]) {
      values.push(typeConversions[key](val));
    } else {
      values.push(val ?? null);
    }
  });

  // Add updated_at timestamp
  fields.push("updated_at = CURRENT_TIMESTAMP");

  const sql = `UPDATE ${tableName} SET ${fields.join(", ")} ${whereClause}`;

  return { sql, values };
}

/**
 * Convert boolean to SQLite integer (0 or 1)
 * @param value - Boolean value
 * @returns 0 for false, 1 for true
 */
export function boolToInt(value: boolean | undefined | null): number {
  return value ? 1 : 0;
}

/**
 * Convert SQLite integer to boolean
 * @param value - Integer value (0 or 1)
 * @returns Boolean value
 */
export function intToBool(value: number | undefined | null): boolean {
  return !!value;
}
