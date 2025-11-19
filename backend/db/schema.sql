-- ./db/schema.sql

DROP TABLE IF EXISTS DeckCards;
DROP TABLE IF EXISTS Decks;
DROP TABLE IF EXISTS Inventory;
DROP TABLE IF EXISTS Cards;
DROP TABLE IF EXISTS Places;

CREATE TABLE Cards (
  -- Core Identifiers
  scryfall_id TEXT PRIMARY KEY, -- Scryfall's unique ID for this specific printing
  oracle_id TEXT,               -- Scryfall's ID for the abstract card concept (nullable if Scryfall omits it for certain layouts)
  name TEXT NOT NULL,           -- Card name; for multi-face, Scryfall often uses "Name A // Name B"
  lang TEXT NOT NULL DEFAULT 'en', -- Language of this printing
  released_at TEXT,             -- Release date of the set (YYYY-MM-DD)
  cardmarket_id INTEGER,        -- CardMarket Product ID

  -- Set Information
  set_id TEXT NOT NULL,         -- Scryfall's UUID for the set
  set_code TEXT NOT NULL,       -- Abbreviated set code (e.g., "mh2")
  set_name TEXT NOT NULL,       -- Full name of the set
  collector_number TEXT NOT NULL, -- Collector number for this printing
  rarity TEXT NOT NULL,         -- Rarity (common, uncommon, rare, mythic, special, bonus)

  -- Gameplay Mechanics & Text
  layout TEXT NOT NULL,         -- Card layout (normal, transform, modal_dfc, split, etc.)
  mana_cost TEXT,               -- Mana cost (e.g., "{1}{W}{U}"); null for lands, etc.
  cmc REAL,                     -- Converted mana cost
  type_line TEXT NOT NULL,      -- Full type line (e.g., "Creature — Human Soldier")
  oracle_text TEXT,             -- Rules text; null if no rules text
  power TEXT,                   -- Power (e.g., "2", "*", "X"); null if not applicable
  toughness TEXT,               -- Toughness (e.g., "3", "*", "X"); null if not applicable
  loyalty TEXT,                 -- Loyalty for planeswalkers; null if not applicable
  keywords TEXT,                -- JSON string array of keywords (e.g., '["Flying", "Trample"]')

  -- Color Information
  colors TEXT,                  -- JSON string array of Scryfall color codes (W,U,B,R,G) derived from mana_cost or color_indicator; null if colorless
  color_identity TEXT NOT NULL, -- JSON string array of Scryfall color codes for deckbuilding

  -- Visual & Print Details
  image_uris TEXT,              -- JSON string of ScryfallImageUris object (small, normal, large, png, art_crop, border_crop)
  finishes TEXT NOT NULL,       -- JSON string array of available finishes for this printing (e.g., '["nonfoil", "foil", "etched"]')
  card_faces TEXT,              -- JSON string array of ScryfallCardFace objects for multi-face cards; null for single-face
  artist TEXT,                  -- Illustrator's name
  illustration_id TEXT,         -- Scryfall's UUID for the artwork (consistent across reprints of the same art)

  -- Links & Legality
  scryfall_uri TEXT,            -- Link to this card's page on Scryfall
  legalities TEXT,              -- JSON string object mapping format to legality (legal, not_legal, restricted, banned)
  purchase_uris TEXT,           -- JSON string of Scryfall PurchaseUris object

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Cards table
CREATE INDEX idx_cards_oracle_id ON Cards(oracle_id);
CREATE INDEX idx_cards_name ON Cards(name COLLATE NOCASE);
CREATE INDEX idx_cards_set_code ON Cards(set_code);
CREATE INDEX idx_cards_type_line ON Cards(type_line COLLATE NOCASE); -- Useful for searching by type
CREATE INDEX idx_cards_artist ON Cards(artist COLLATE NOCASE); -- If you plan to search/filter by artist
CREATE INDEX idx_cards_cardmarket_id ON Cards(cardmarket_id); -- For the new lookup

-- Places for organizing inventory
CREATE TABLE Places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'binder', -- e.g., binder, box, deck_box
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_places_name ON Places(name COLLATE NOCASE);
CREATE INDEX idx_places_type ON Places(type);

-- Inventory of physical cards
CREATE TABLE Inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_scryfall_id TEXT NOT NULL, -- Foreign key to Cards.scryfall_id
  place_id INTEGER,               -- Foreign key to Places.id (optional)
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
  condition TEXT NOT NULL DEFAULT 'NM', -- Card condition (NM, LP, MP, HP, DMG, Sealed)
  is_foil BOOLEAN NOT NULL DEFAULT FALSE, -- Simplified: true if this specific item is foil.
                                          -- `Cards.finishes` tells what's possible for the printing.
                                          -- Consider if you need to distinguish etched/other special foils here.
                                          -- For simplicity, `is_foil` can represent any non-standard finish.
  language TEXT NOT NULL DEFAULT 'en', -- Language of this specific card instance
  notes TEXT,                     -- User notes for this inventory item
  -- purchase_price REAL, -- Removed as per "not for selling"
  -- purchase_date TEXT,  -- Removed
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_scryfall_id) REFERENCES Cards(scryfall_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (place_id) REFERENCES Places(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_inventory_card_scryfall_id ON Inventory(card_scryfall_id);
CREATE INDEX idx_inventory_place_id ON Inventory(place_id);
CREATE INDEX idx_inventory_language ON Inventory(language);
CREATE INDEX idx_inventory_condition ON Inventory(condition);

-- Master Inventory based on Oracle ID
CREATE TABLE MasterInventory (
  oracle_id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- Canonical name for the card
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_master_inventory_name ON MasterInventory(name COLLATE NOCASE);

-- Details for each printing within a MasterInventory entry
CREATE TABLE InventoryDetails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_oracle_id TEXT NOT NULL,
  card_scryfall_id TEXT NOT NULL,
  place_id INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
  condition TEXT NOT NULL DEFAULT 'NM',
  is_foil BOOLEAN NOT NULL DEFAULT FALSE,
  language TEXT NOT NULL DEFAULT 'en',
  notes TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (master_oracle_id) REFERENCES MasterInventory(oracle_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (card_scryfall_id) REFERENCES Cards(scryfall_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (place_id) REFERENCES Places(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX idx_inventory_details_master_oracle_id ON InventoryDetails(master_oracle_id);
CREATE INDEX idx_inventory_details_card_scryfall_id ON InventoryDetails(card_scryfall_id);
CREATE INDEX idx_inventory_details_place_id ON InventoryDetails(place_id);

-- Decks
CREATE TABLE Decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (
    format IN ('commander', 'modern', 'standard', 'pioneer', 'legacy', 'vintage', 'pauper', 'brawl', 'oathbreaker', 'historic', 'premodern', 'custom') -- Added more, and 'custom'
  ),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_decks_name ON Decks(name COLLATE NOCASE);
CREATE INDEX idx_decks_format ON Decks(format);

-- Cards within Decks
CREATE TABLE DeckCards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id TEXT NOT NULL,
  card_scryfall_id TEXT NOT NULL, -- Foreign key to Cards.scryfall_id
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_commander INTEGER NOT NULL DEFAULT 0 CHECK (is_commander IN (0, 1)),
  is_sideboard INTEGER NOT NULL DEFAULT 0 CHECK (is_sideboard IN (0, 1)),
  is_maybeboard   INTEGER NOT NULL DEFAULT 0 CHECK (is_maybeboard   IN (0, 1)),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES Decks(id) ON DELETE CASCADE,
  FOREIGN KEY (card_scryfall_id) REFERENCES Cards(scryfall_id) ON DELETE CASCADE -- Or ON DELETE RESTRICT if you prefer
);
CREATE INDEX idx_deckcards_deck_id ON DeckCards(deck_id);
CREATE INDEX idx_deckcards_card_id ON DeckCards(card_scryfall_id);
CREATE INDEX idx_deckcards_maybeboard ON DeckCards(is_maybeboard);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS trg_cards_updated_at
AFTER UPDATE ON Cards FOR EACH ROW
BEGIN UPDATE Cards SET updated_at = CURRENT_TIMESTAMP WHERE scryfall_id = OLD.scryfall_id; END;

CREATE TRIGGER IF NOT EXISTS trg_places_updated_at
AFTER UPDATE ON Places FOR EACH ROW
BEGIN UPDATE Places SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;

CREATE TRIGGER IF NOT EXISTS trg_inventory_updated_at
AFTER UPDATE ON Inventory FOR EACH ROW
BEGIN UPDATE Inventory SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;

CREATE TRIGGER IF NOT EXISTS trg_decks_updated_at
AFTER UPDATE ON Decks FOR EACH ROW
BEGIN UPDATE Decks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;