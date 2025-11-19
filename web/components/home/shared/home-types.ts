import type {
  DeckWithDetails,
  InventoryDetailWithCardDetails,
} from "#/backend/src/types";

export interface DashboardAnalytics {
  totalStats: {
    unique_cards: number;
    total_cards: number;
    locations_used: number;
    sets_collected: number;
    foil_cards: number;
  };
  colorStats: Array<{
    color_group: string;
    unique_cards: number;
    total_cards: number;
  }>;
  rarityStats: Array<{
    rarity: string;
    unique_cards: number;
    total_cards: number;
  }>;
  setStats: Array<{
    set_name: string;
    set_code: string;
    unique_cards: number;
    total_cards: number;
    released_at: string;
  }>;
  formatLegality: Array<{
    format: string;
    legal_cards: number;
  }>;
  recentActivity: Array<{
    type: string;
    card_name: string;
    quantity: number | null;
    timestamp: string;
    location: string | null;
  }>;
  topCards: Array<{
    name: string;
    scryfall_id: string;
    image_uris: string | null;
    card_faces: string | null;
    total_copies: number;
    different_printings: number;
    rarity: string;
    set_name: string;
  }>;
}

export interface QuickStats {
  deckStats: Array<{
    format: string;
    deck_count: number;
    avg_deck_size: number;
  }>;
  inventoryGrowth: Array<{
    date: string;
    cards_added: number;
    total_quantity: number;
  }>;
}

export interface HomeClientProps {
  recentInventory: InventoryDetailWithCardDetails[];
  recentDecks: DeckWithDetails[];
  analytics: DashboardAnalytics;
  quickStats: QuickStats;
  isProd: boolean;
}

export interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

export interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

export type PieChartDataPoint = {
  color_group: string;
  percentage: number;
  fill: string;
  total_cards: number;
};

export interface PieChartLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  payload: PieChartDataPoint;
}
