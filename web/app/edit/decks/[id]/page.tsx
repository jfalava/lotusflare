// app/edit/decks/[id]/page.tsx
import DeckEditorClient from "@/components/decks/deck-editor-client";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { DeckWithDetails } from "#/backend/src/types";
import UpdateBreadcrumbSegment from "@/utils/update-breadcrumb-segment";
import { getApiBaseUrl, serverFetchJsonSafe } from "@/lib/server-fetch";
import { parseImageUris } from "@/lib/image-utils";

async function getDeck(id: string): Promise<DeckWithDetails | null> {
  const apiBaseUrl = getApiBaseUrl();
  return await serverFetchJsonSafe<DeckWithDetails>(
    `${apiBaseUrl}/api/decks/${id}`,
  );
}

function getRepresentativeCardImage(deck: DeckWithDetails): string | null {
  const mainboardCards = deck.cards.filter((card) => !card.is_sideboard);

  if (mainboardCards.length === 0) return null;

  // 1. Priority: Commander (for commander format)
  if (deck.format === "commander") {
    const commander = mainboardCards.find((card) => card.is_commander);
    if (commander?.card.image_uris) {
      const imageUris = parseImageUris(commander.card.image_uris);
      if (imageUris) {
        return (
          imageUris.art_crop ||
          imageUris.normal ||
          imageUris.large ||
          imageUris.small ||
          null
        );
      }
    }
  }

  // 2. Priority: Most expensive card (by CMC as proxy)
  const highestCmcCard = mainboardCards
    .filter((card) => card.card.cmc && card.card.image_uris)
    .sort((a, b) => (b.card.cmc || 0) - (a.card.cmc || 0))[0];

  if (highestCmcCard?.card.image_uris) {
    const imageUris = parseImageUris(highestCmcCard.card.image_uris);
    if (imageUris) {
      return (
        imageUris.art_crop ||
        imageUris.normal ||
        imageUris.large ||
        imageUris.small ||
        null
      );
    }
  }

  // 3. Fallback: First card with image
  const firstCardWithImage = mainboardCards.find(
    (card) => card.card.image_uris,
  );
  if (firstCardWithImage?.card.image_uris) {
    const imageUris = parseImageUris(firstCardWithImage.card.image_uris);
    if (imageUris) {
      return (
        imageUris.art_crop ||
        imageUris.normal ||
        imageUris.large ||
        imageUris.small ||
        null
      );
    }
  }

  return null;
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const deckId = params.id;
  const deck = await getDeck(deckId);
  if (!deck) {
    return {
      title: "Deck Not Found | Lotusflare",
      description: "The requested deck could not be found.",
    };
  }

  const mainboardCount = deck.cards
    .filter((c) => !c.is_sideboard)
    .reduce((sum, c) => sum + c.quantity, 0);
  const sideboardCount = deck.cards
    .filter((c) => c.is_sideboard)
    .reduce((sum, c) => sum + c.quantity, 0);
  const cardImage = getRepresentativeCardImage(deck);

  const title = `Edit ${deck.name} | Lotusflare`;
  const description = deck.description
    ? `${deck.description} • ${mainboardCount} main/${sideboardCount} side • ${deck.format.charAt(0).toUpperCase() + deck.format.slice(1)} format`
    : `Edit your ${deck.format.charAt(0).toUpperCase() + deck.format.slice(1)} deck: ${deck.name}. ${mainboardCount} main/${sideboardCount} side.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
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
      index: false, // Don't index edit pages
      follow: false,
    },
  };
}

export default async function EditDeckPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const deckId = params.id;
  const deck = await getDeck(deckId);
  if (!deck) notFound();
  return (
    <UpdateBreadcrumbSegment segmentKey={deckId} segmentValue={deck.name}>
      <DeckEditorClient deckId={deckId} />
    </UpdateBreadcrumbSegment>
  );
}
