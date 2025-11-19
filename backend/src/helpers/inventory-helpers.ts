// Helper: function to parse Scryfall-like search query
export interface ParsedInventoryCondition {
  field: string; // e.g., "cr.name", "cr.oracle_text"
  value: string; // e.g., "%search term%"
}

export function parseInventorySearchQuery(rawQuery: string): {
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

// Helper function to generate SQL for color group filtering
export function buildColorGroupSubquery(colorGroup: string): {
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
