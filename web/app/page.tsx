// app/page.tsx
import { Metadata } from "next";
import { Suspense } from "react";
import HomeClient from "@/components/home/home-client";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import type {
  DeckWithDetails,
  InventoryDetailWithCardDetails,
  MasterInventoryWithDetails,
} from "#/backend/src/types";
import type {
  DashboardAnalytics,
  QuickStats,
} from "@/components/home/shared/home-types";
import { getApiBaseUrl, serverFetch } from "@/lib/server-fetch";
import { EXTENDED_FETCH_TIMEOUT_MS } from "@/lib/constants";
import { fetchInventoryMeta, fetchDecks } from "@/lib/api-server";

interface InventoryResponse {
  data: MasterInventoryWithDetails[];
  totalCount: number;
  hasMore: boolean;
}

export const dynamic = "force-dynamic";

async function getHomeData() {
  try {
    const apiBaseUrl = getApiBaseUrl();

    const [analyticsResponse, quickStatsResponse, inventoryData, allDecks] =
      await Promise.all([
        serverFetch(`${apiBaseUrl}/api/dashboard/analytics`, {
          timeout: EXTENDED_FETCH_TIMEOUT_MS,
        }),
        serverFetch(`${apiBaseUrl}/api/dashboard/quick-stats`, {
          timeout: EXTENDED_FETCH_TIMEOUT_MS,
        }),
        fetchInventoryMeta(1, 6),
        fetchDecks(),
      ]);

    if (!analyticsResponse.ok || !quickStatsResponse.ok) {
      throw new Error("One or more API requests failed");
    }

    const [analytics, quickStats] = await Promise.all([
      analyticsResponse.json() as Promise<DashboardAnalytics>,
      quickStatsResponse.json() as Promise<QuickStats>,
    ]);

    const recentInventory: InventoryDetailWithCardDetails[] =
      inventoryData.data?.flatMap((m) => m.details) || [];
    const recentDecks = allDecks.slice(0, 4);

    return { analytics, quickStats, recentInventory, recentDecks };
  } catch (error) {
    console.error("[SSR] Failed to fetch dashboard data:", error);
    return {
      analytics: {
        totalStats: {
          unique_cards: 0,
          total_cards: 0,
          locations_used: 0,
          sets_collected: 0,
          foil_cards: 0,
        },
        colorStats: [],
        rarityStats: [],
        setStats: [],
        formatLegality: [],
        recentActivity: [],
        topCards: [],
      } as DashboardAnalytics,
      quickStats: { deckStats: [], inventoryGrowth: [] } as QuickStats,
      recentInventory: [] as InventoryDetailWithCardDetails[],
      recentDecks: [] as DeckWithDetails[],
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { analytics } = await getHomeData();

  const title = "Dashboard | Lotusflare";
  const description =
    analytics.totalStats.total_cards > 0
      ? `MTG Collection Dashboard - ${analytics.totalStats.total_cards.toLocaleString()} total cards, ${analytics.totalStats.unique_cards.toLocaleString()} unique cards across ${analytics.totalStats.sets_collected} sets.`
      : "MTG Collection Dashboard - Comprehensive insights into your Magic: The Gathering collection.";

  return {
    title,
    description,
    keywords: [
      "MTG Dashboard",
      "Magic The Gathering",
      "Collection Analytics",
      "Card Statistics",
      "Deck Building",
      "Collection Management",
    ],
  };
}

export default async function HomePage() {
  const { analytics, quickStats, recentInventory, recentDecks } =
    await getHomeData();
  const isProd = process.env.PROD_APP_URL === "https://lotusflare.jfa.dev";

  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeClient
        analytics={analytics}
        quickStats={quickStats}
        recentInventory={recentInventory}
        recentDecks={recentDecks}
        isProd={isProd}
      />
    </Suspense>
  );
}
