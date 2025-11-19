// app/decks/page.tsx
import { Metadata } from "next";
import packageJson from "@/package.json";
import { notFound } from "next/navigation";
import DeckViewClient from "@/components/decks/deck-viewer";
import type { DeckWithDetails } from "#/backend/src/types";
import UpdateBreadcrumbSegment from "@/utils/update-breadcrumb-segment";
import { fetchDeckById } from "@/lib/api-server";

// Force this page to be dynamic since deck data should always be fresh
export const dynamic = "force-dynamic";

async function getDeckData(deckId: string): Promise<DeckWithDetails | null> {
  return await fetchDeckById(deckId);
}

function getDeckStats(deck: DeckWithDetails) {
  if (!deck.cards) {
    return {
      totalCards: 0,
      mainboardCards: 0,
      sideboardCards: 0,
      commanders: 0,
      uniqueCards: 0,
    };
  }

  const mainboard = deck.cards.filter((c) => !c.is_sideboard);
  const sideboard = deck.cards.filter((c) => c.is_sideboard);
  const commanders = deck.cards.filter((c) => c.is_commander);

  const mainboardCount = mainboard.reduce((sum, c) => sum + c.quantity, 0);
  const sideboardCount = sideboard.reduce((sum, c) => sum + c.quantity, 0);
  const commanderCount = commanders.reduce((sum, c) => sum + c.quantity, 0);

  return {
    totalCards: mainboardCount + sideboardCount,
    mainboardCards: mainboardCount,
    sideboardCards: sideboardCount,
    commanders: commanderCount,
    uniqueCards: deck.cards.length,
  };
}

function getRepresentativeCardImage(deck: DeckWithDetails): string | null {
  if (!deck.cards || deck.cards.length === 0) return null;

  const mainboardCards = deck.cards.filter((card) => !card.is_sideboard);

  if (mainboardCards.length === 0) return null;

  // 1. Priority: Commander (for commander format)
  if (deck.format === "commander") {
    const commander = mainboardCards.find((card) => card.is_commander);
    if (commander?.card.image_uris) {
      const imageUris =
        typeof commander.card.image_uris === "string"
          ? JSON.parse(commander.card.image_uris)
          : commander.card.image_uris;
      // prefer the illustration crop, then fallbacks
      return (
        imageUris.art_crop ||
        imageUris.normal ||
        imageUris.large ||
        imageUris.small ||
        null
      );
    }
  }

  // 2. Priority: Most expensive card (by CMC as proxy)
  const highestCmcCard = mainboardCards
    .filter((card) => card.card.cmc && card.card.image_uris)
    .sort((a, b) => (b.card.cmc || 0) - (a.card.cmc || 0))[0];

  if (highestCmcCard?.card.image_uris) {
    const imageUris =
      typeof highestCmcCard.card.image_uris === "string"
        ? JSON.parse(highestCmcCard.card.image_uris)
        : highestCmcCard.card.image_uris;
    // prefer the illustration crop, then fallbacks
    return (
      imageUris.art_crop ||
      imageUris.normal ||
      imageUris.large ||
      imageUris.small ||
      null
    );
  }

  // 3. Fallback: First card with image
  const firstCardWithImage = mainboardCards.find(
    (card) => card.card.image_uris,
  );
  if (firstCardWithImage?.card.image_uris) {
    const imageUris =
      typeof firstCardWithImage.card.image_uris === "string"
        ? JSON.parse(firstCardWithImage.card.image_uris)
        : firstCardWithImage.card.image_uris;
    // prefer the illustration crop, then fallbacks
    return (
      imageUris.art_crop ||
      imageUris.normal ||
      imageUris.large ||
      imageUris.small ||
      null
    );
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const deck = await getDeckData(id);

  if (!deck) {
    console.log(`[Metadata] Deck ${id} not found - returning 404 metadata`);
    return {
      title: "Deck Not Found | Lotusflare",
      description: "The requested deck could not be found.",
    };
  }

  const stats = getDeckStats(deck);
  const cardImage = getRepresentativeCardImage(deck);

  const title = `${deck.name} (${deck.format}) | Lotusflare`;
  const description = deck.description
    ? `${deck.description.substring(0, 150)}${
        deck.description.length > 150 ? "..." : ""
      }`
    : `A ${deck.format} deck with ${stats.totalCards} cards. ${
        stats.mainboardCards
      } mainboard${
        stats.sideboardCards > 0 ? `, ${stats.sideboardCards} sideboard` : ""
      }${stats.commanders > 0 ? `, ${stats.commanders} commander(s)` : ""}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/decks/${id}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/decks/${id}`,
      images: cardImage
        ? [
            {
              url: cardImage,
              width: 488,
              height: 680,
              alt: `Representative card from ${deck.name}`,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cardImage ? [cardImage] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DeckViewPage({ params }: PageProps) {
  const { id } = await params;
  const deck = await getDeckData(id);

  if (!deck) {
    notFound();
  }

  // Add error boundary
  // console.log(`[Page] Rendering deck view for "${deck.name}"`);

  return (
    <UpdateBreadcrumbSegment
      segmentKey={id} // Use the string ID from params as the key
      segmentValue={deck.name} // Use the fetched deck name as the value
    >
      <DeckViewClient initialDeck={deck} />
    </UpdateBreadcrumbSegment>
  );
}
