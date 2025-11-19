import { Metadata } from "next";
import { Suspense } from "react";
import BrowseDecksClient from "@/components/decks/decklists-edit-client";
import type { DeckWithDetails } from "#/backend/src/types";
import { DeckListViewSkeleton } from "@/components/decks/deck-list-view-skeleton";
import { calculateSimpleDeckStats } from "@/lib/stats-utils";
import { pickRepresentativeDeckImage } from "@/lib/image-utils";
import { generateDecksMetadata } from "@/lib/metadata-utils";
import { fetchDecks } from "@/lib/api-server";

export const dynamic = "force-dynamic";

async function getDeckData(): Promise<{
  decks: DeckWithDetails[];
}> {
  const decks = await fetchDecks();
  return { decks };
}

export async function generateMetadata(): Promise<Metadata> {
  const { decks } = await getDeckData();
  const stats = calculateSimpleDeckStats(decks);
  const deckImage = pickRepresentativeDeckImage(decks);

  // Calculate average cards per deck
  const averageCards =
    stats.totalDecks > 0 ? Math.round(stats.totalCards / stats.totalDecks) : 0;

  // Get top format
  const topFormat =
    Object.entries(stats.formatGroups).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "unknown";

  return generateDecksMetadata({
    totalDecks: stats.totalDecks,
    totalCards: stats.totalCards,
    formatCounts: stats.formatGroups,
    topFormat,
    averageCards,
    imageUrl: deckImage,
    isEditMode: true,
    mostRecentDeckName: stats.mostRecentDeck?.name || null,
  });
}

export default async function BrowseDecksPage() {
  const { decks } = await getDeckData();

  return (
    <Suspense fallback={<DeckListViewSkeleton />}>
      <BrowseDecksClient initialDecks={decks} />
    </Suspense>
  );
}
