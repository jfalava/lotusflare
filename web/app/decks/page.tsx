// app/decks/page.tsx

import { Metadata } from "next";
import { Suspense } from "react";
import DecksBrowseClient from "@/components/decks/decks-detailed-view-client";
import type { DeckWithDetails } from "#/backend/src/types";
import { DecksBrowseSkeleton } from "@/components/decks/decklists-view-skeleton";
import { calculateDeckStats } from "@/lib/stats-utils";
import { pickRepresentativeDeckImage } from "@/lib/image-utils";
import { generateDecksMetadata } from "@/lib/metadata-utils";
import { fetchDecks } from "@/lib/api-server";

export const dynamic = "force-dynamic";

async function getDecksData(): Promise<DeckWithDetails[]> {
  return await fetchDecks();
}

export async function generateMetadata(): Promise<Metadata> {
  const decks = await getDecksData();
  const stats = calculateDeckStats(decks);
  const representativeImage = pickRepresentativeDeckImage(decks);

  return generateDecksMetadata({
    totalDecks: stats.totalDecks,
    totalCards: stats.totalCards,
    formatCounts: stats.formatCounts,
    topFormat: stats.topFormat,
    averageCards: stats.averageCardsPerDeck,
    imageUrl: representativeImage,
    isEditMode: false,
  });
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DecksPage({}: PageProps) {
  const decks = await getDecksData();

  return (
    <Suspense fallback={<DecksBrowseSkeleton />}>
      <DecksBrowseClient initialDecks={decks} />
    </Suspense>
  );
}
