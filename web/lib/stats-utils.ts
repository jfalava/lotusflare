import type { DeckWithDetails } from "#/backend/src/types";

/**
 * Deck statistics interface
 */
export interface DeckStats {
  totalDecks: number;
  totalCards: number;
  formatCounts: Record<string, number>;
  topFormat: string;
  averageCardsPerDeck: number;
  mostRecentDeck?: DeckWithDetails;
}

/**
 * Calculate comprehensive statistics for a collection of decks
 * @param decks - Array of decks with details
 * @returns Deck statistics object
 */
export function calculateDeckStats(decks: DeckWithDetails[]): DeckStats {
  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, deck) => {
    return (
      sum +
      (deck.cards?.reduce((cardSum, card) => cardSum + card.quantity, 0) || 0)
    );
  }, 0);

  // Format distribution
  const formatCounts = decks.reduce(
    (acc, deck) => {
      acc[deck.format] = (acc[deck.format] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topFormat =
    Object.entries(formatCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "unknown";

  // Most recent deck
  const mostRecentDeck =
    decks.length > 0
      ? [...decks].sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )[0]
      : undefined;

  return {
    totalDecks,
    totalCards,
    formatCounts,
    topFormat,
    averageCardsPerDeck:
      totalDecks > 0 ? Math.round(totalCards / totalDecks) : 0,
    mostRecentDeck,
  };
}

/**
 * Simple deck stats for basic counts
 */
export interface SimpleDeckStats {
  totalDecks: number;
  totalCards: number;
  formatGroups: Record<string, number>;
  mostRecentDeck?: DeckWithDetails;
}

/**
 * Calculate simple deck statistics (lighter version)
 * @param decks - Array of decks with details
 * @returns Simple deck statistics
 */
export function calculateSimpleDeckStats(
  decks: DeckWithDetails[],
): SimpleDeckStats {
  const totalDecks = decks.length;
  const totalCards = decks.reduce(
    (sum, deck) =>
      sum + deck.cards.reduce((deckSum, card) => deckSum + card.quantity, 0),
    0,
  );

  // Format distribution
  const formatGroups = decks.reduce(
    (acc, deck) => {
      acc[deck.format] = (acc[deck.format] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Most recent deck
  const mostRecentDeck =
    decks.length > 0
      ? [...decks].sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )[0]
      : undefined;

  return {
    totalDecks,
    totalCards,
    formatGroups,
    mostRecentDeck,
  };
}
