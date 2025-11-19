import type { Metadata } from "next";
import { OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from "./constants";

/**
 * Options for generating Open Graph metadata
 */
export interface OpenGraphOptions {
  title: string;
  description: string;
  imageUrl?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
  additionalMetadata?: Record<string, string>;
}

/**
 * Generate comprehensive metadata with Open Graph and Twitter cards
 * @param options - Metadata options
 * @returns Next.js Metadata object
 */
export function generatePageMetadata(options: OpenGraphOptions): Metadata {
  const {
    title,
    description,
    imageUrl,
    imageAlt = "Card artwork",
    type = "website",
    additionalMetadata = {},
  } = options;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: OG_IMAGE_WIDTH,
              height: OG_IMAGE_HEIGHT,
              alt: imageAlt,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    other: additionalMetadata,
  };
}

/**
 * Generate metadata for inventory pages
 */
export interface InventoryMetadataOptions {
  totalUnique: number;
  imageUrl?: string | null;
  isEditMode?: boolean;
}

export function generateInventoryMetadata(
  options: InventoryMetadataOptions,
): Metadata {
  const { totalUnique, imageUrl, isEditMode = false } = options;

  const pageType = isEditMode ? "Edit Inventory" : "Inventory";
  const title =
    totalUnique > 0
      ? `${pageType} (${totalUnique.toLocaleString()} unique cards) | Lotusflare`
      : `${pageType} | Lotusflare`;

  const description =
    totalUnique > 0
      ? `${isEditMode ? "Edit your Master Inventory" : "Browse your Inventory"} with ${totalUnique.toLocaleString()} unique cards.`
      : `${isEditMode ? "Edit your Master Inventory" : "Browse your Inventory"}.`;

  return generatePageMetadata({
    title,
    description,
    imageUrl,
    imageAlt: "Featured card artwork",
    additionalMetadata: {
      "inventory-count": totalUnique.toString(),
    },
  });
}

/**
 * Generate metadata for deck pages
 */
export interface DeckMetadataOptions {
  totalDecks: number;
  totalCards: number;
  formatCounts: Record<string, number>;
  topFormat: string;
  averageCards: number;
  imageUrl?: string | null;
  isEditMode?: boolean;
  mostRecentDeckName?: string | null;
}

export function generateDecksMetadata(options: DeckMetadataOptions): Metadata {
  const {
    totalDecks,
    totalCards,
    formatCounts,
    topFormat,
    averageCards,
    imageUrl,
    isEditMode = false,
    mostRecentDeckName,
  } = options;

  const pageType = isEditMode ? "Browse Decks" : "Browse Decks";
  const title =
    totalDecks > 0
      ? `${pageType} (${totalDecks} ${totalDecks === 1 ? "deck" : "decks"}) | Lotusflare`
      : `${pageType} | Lotusflare`;

  const description =
    totalDecks > 0
      ? isEditMode
        ? `Manage your Magic: The Gathering deck collection. ${totalDecks} total decks with ${totalCards.toLocaleString()} cards. Formats: ${Object.keys(formatCounts).join(", ")}.`
        : `Explore ${totalDecks} Magic: The Gathering deck builds with ${totalCards.toLocaleString()} total cards. Popular formats include ${topFormat}. Average ${averageCards} cards per deck.`
      : "Discover and explore Magic: The Gathering deck builds. Browse commander decks, standard builds, and more formats.";

  const keywords = isEditMode
    ? [
        "MTG deck builder",
        "Magic The Gathering decks",
        "deck management",
        "MTG deck editor",
        "competitive deck building",
        "Magic deck collection",
      ]
    : undefined;

  return {
    ...generatePageMetadata({
      title,
      description,
      imageUrl,
      imageAlt: isEditMode ? "A card from your decks" : "Featured deck artwork",
      additionalMetadata: {
        "deck-count": totalDecks.toString(),
        "deck-stats": JSON.stringify({
          total: totalDecks,
          ...(totalDecks > 0 && {
            cards: totalCards,
            totalCards,
            formats: formatCounts,
            topFormat,
            averageCards,
            ...(mostRecentDeckName && { recent: mostRecentDeckName }),
          }),
        }),
      },
    }),
    ...(keywords && { keywords }),
  };
}

/**
 * Generate metadata for a single deck page
 */
export interface SingleDeckMetadataOptions {
  deckName: string;
  format: string;
  totalCards: number;
  commander?: string;
  imageUrl?: string | null;
  description?: string;
}

export function generateSingleDeckMetadata(
  options: SingleDeckMetadataOptions,
): Metadata {
  const { deckName, format, totalCards, commander, imageUrl, description } =
    options;

  const title = `${deckName} | Lotusflare`;
  const desc =
    description ||
    (commander
      ? `${format} deck led by ${commander} with ${totalCards} cards.`
      : `${format} deck with ${totalCards} cards.`);

  return generatePageMetadata({
    title,
    description: desc,
    imageUrl,
    imageAlt: commander ? `${commander} - Commander` : "Deck card artwork",
    additionalMetadata: {
      "deck-name": deckName,
      format,
      "card-count": totalCards.toString(),
      ...(commander && { commander }),
    },
  });
}
