"use server";

import {
  getApiBaseUrl,
  getAuthHeaders,
  serverFetchJson,
  serverFetchJsonSafe,
} from "@/lib/server-fetch";
import type {
  DeckWithDetails,
  PlaceDbo,
  PaginatedMasterInventoryResponse,
  InventoryDetailWithCardDetails,
  ScryfallApiCard,
} from "#/backend/src/types";

interface ScryfallListResponse<T> {
  data: T[];
  has_more: boolean;
  next_page?: string;
}

// =============================================================================
// DECK API FUNCTIONS
// =============================================================================

export async function fetchDecks(): Promise<DeckWithDetails[]> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const decks = await serverFetchJsonSafe<DeckWithDetails[]>(
      `${apiBaseUrl}/api/decks`,
    );
    return decks || [];
  } catch (error) {
    console.error("[Server] Failed to fetch decks:", error);
    return [];
  }
}

export async function fetchDeckById(
  id: string,
): Promise<DeckWithDetails | null> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    return await serverFetchJsonSafe<DeckWithDetails>(
      `${apiBaseUrl}/api/decks/${id}`,
    );
  } catch (error) {
    console.error(`[Server] Failed to fetch deck ${id}:`, error);
    return null;
  }
}

// =============================================================================
// INVENTORY API FUNCTIONS
// =============================================================================

export async function fetchInventoryMeta(
  page: number = 1,
  limit: number = 24,
  searchTerm?: string,
  colorGroup?: string,
): Promise<PaginatedMasterInventoryResponse> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = new URL(`${apiBaseUrl}/api/v2/inventory`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("limit", limit.toString());

    if (searchTerm) {
      url.searchParams.set("q", searchTerm);
    }
    if (colorGroup) {
      url.searchParams.set("colorGroup", colorGroup);
    }

    return await serverFetchJson<PaginatedMasterInventoryResponse>(
      url.toString(),
    );
  } catch (error) {
    console.error("[Server] Failed to fetch inventory metadata:", error);
    throw error;
  }
}

export async function fetchInventoryCounts(): Promise<Record<string, number>> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    return (
      (await serverFetchJsonSafe<Record<string, number>>(
        `${apiBaseUrl}/api/v2/inventory/counts`,
      )) || {}
    );
  } catch (error) {
    console.error("[Server] Failed to fetch inventory counts:", error);
    return {};
  }
}

export async function deleteInventoryDetail(detailId: number): Promise<void> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(
      `${apiBaseUrl}/api/v2/inventory/details/${detailId}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete inventory detail: ${response.status}`);
    }
  } catch (error) {
    console.error("[Server] Failed to delete inventory detail:", error);
    throw error;
  }
}

export async function createOrFindMasterInventory(
  oracleId: string,
  name: string,
): Promise<{ oracle_id: string }> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/v2/inventory`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ oracle_id: oracleId, name }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create master inventory: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[Server] Failed to create master inventory:", error);
    throw error;
  }
}

export async function createInventoryDetail(payload: {
  master_oracle_id: string;
  scryfall_id: string;
  quantity: number;
  place_id: number;
  condition: string;
  is_foil: boolean;
  language: string;
  notes: string | null;
}): Promise<InventoryDetailWithCardDetails> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/v2/inventory/details`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create inventory detail: ${response.status} - ${errorText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("[Server] Failed to create inventory detail:", error);
    throw error;
  }
}

// =============================================================================
// SCRYFALL API FUNCTIONS
// =============================================================================

export async function searchScryfallCards(
  query: string,
): Promise<ScryfallListResponse<ScryfallApiCard>> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    return await serverFetchJson<ScryfallListResponse<ScryfallApiCard>>(
      `${apiBaseUrl}/api/scryfall/cards/search?q=${encodeURIComponent(query)}`,
    );
  } catch (error) {
    console.error("[Server] Failed to search Scryfall cards:", error);
    throw error;
  }
}

export async function fetchScryfallCardById(
  scryfallId: string,
): Promise<ScryfallApiCard> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    return await serverFetchJson<ScryfallApiCard>(
      `${apiBaseUrl}/api/scryfall/cards/${scryfallId}`,
    );
  } catch (error) {
    console.error("[Server] Failed to fetch Scryfall card:", error);
    throw error;
  }
}

// =============================================================================
// PLACES API FUNCTIONS
// =============================================================================

export async function fetchPlaces(): Promise<PlaceDbo[]> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    return (
      (await serverFetchJsonSafe<PlaceDbo[]>(`${apiBaseUrl}/api/places`)) || []
    );
  } catch (error) {
    console.error("[Server] Failed to fetch places:", error);
    return [];
  }
}
