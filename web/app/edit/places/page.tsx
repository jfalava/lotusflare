import { Metadata } from "next";
import { Suspense } from "react";
import PlacesManageClient from "@/components/places/places-manage-client";
import type { PlaceDbo } from "#/backend/src/types";
import { PlacesManageSkeleton } from "@/components/places/places-manage-skeleton";
import { fetchPlaces } from "@/lib/api-server";

// Force this page to be dynamic since places data should always be fresh
export const dynamic = "force-dynamic";

async function getPlacesData(): Promise<PlaceDbo[]> {
  return await fetchPlaces();
}

function getPlacesStats(places: PlaceDbo[]) {
  const totalPlaces = places.length;

  // Type distribution
  const typeDistribution = places.reduce(
    (acc, place) => {
      acc[place.type] = (acc[place.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const mostCommonType =
    Object.entries(typeDistribution).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "none";

  const placesWithDescriptions = places.filter((p) => p.description).length;

  return {
    totalPlaces,
    typeDistribution,
    mostCommonType,
    placesWithDescriptions,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const places = await getPlacesData();
  const stats = getPlacesStats(places);

  const title =
    stats.totalPlaces > 0
      ? `Manage Storage Places (${stats.totalPlaces} locations) | Lotusflare`
      : "Manage Storage Places | Lotusflare";

  const description =
    stats.totalPlaces > 0
      ? `Organize your Magic: The Gathering card storage with ${stats.totalPlaces} configured locations. Most common type: ${stats.mostCommonType}. ${stats.placesWithDescriptions} places have detailed descriptions.`
      : "Create and manage storage locations for your Magic: The Gathering card collection. Organize cards by binders, boxes, decks, and other storage types.";

  return {
    title,
    description,
    keywords: [
      "MTG storage",
      "card organization",
      "binder management",
      "Magic The Gathering",
      "card collection",
      "storage places",
      "inventory organization",
    ],
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    other: {
      "places-count": stats.totalPlaces.toString(),
      "places-stats": JSON.stringify({
        total: stats.totalPlaces,
        types: stats.typeDistribution,
        mostCommonType: stats.mostCommonType,
        withDescriptions: stats.placesWithDescriptions,
      }),
    },
  };
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagePlacesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const places = await getPlacesData();

  // Extract URL parameters for initial state
  const initialSearch = (resolvedSearchParams.search as string) || "";

  return (
    <Suspense fallback={<PlacesManageSkeleton />}>
      <PlacesManageClient
        initialPlaces={places}
        initialSearch={initialSearch}
      />
    </Suspense>
  );
}
