// components/deck/legality-rules.ts
import type { ScryfallApiCard } from "#/backend/src/types";

// --- Types & Constants ---

export interface LegalityCheckCardInfo {
  scryfall_id: string;
  name: string; // Assumed to be the canonical English name
  quantity: number;
  is_commander?: boolean;
  is_sideboard?: boolean;
  cardDetails: Pick<
    ScryfallApiCard,
    | "type_line"
    | "color_identity"
    | "name" // Name from specific Scryfall printing (can be localized)
    | "keywords"
    | "legalities"
    | "oracle_text" // Usually English Oracle text
  >;
}

export const DECK_SIZE_RULES: Record<
  string,
  { min?: number; exact?: number; sideboardMax?: number }
> = {
  commander: { exact: 100, sideboardMax: 0 },
  standard: { min: 60, sideboardMax: 15 },
  modern: { min: 60, sideboardMax: 15 },
  pioneer: { min: 60, sideboardMax: 15 },
  legacy: { min: 60, sideboardMax: 15 },
  vintage: { min: 60, sideboardMax: 15 },
  pauper: { min: 60, sideboardMax: 15 },
  brawl: { exact: 60, sideboardMax: 0 },
  "historic brawl": { exact: 100, sideboardMax: 0 },
  oathbreaker: { exact: 60, sideboardMax: 0 },
  custom: { min: 0 },
};

export const MAX_NON_BASIC_COPIES: Record<string, number> = {
  commander: 1,
  brawl: 1,
  "historic brawl": 1,
  oathbreaker: 1,
  default: 4,
};

export const BASIC_LAND_NAMES = [
  "Plains",
  "Island",
  "Swamp",
  "Mountain",
  "Forest",
  "Snow-Covered Plains",
  "Snow-Covered Island",
  "Snow-Covered Swamp",
  "Snow-Covered Mountain",
  "Snow-Covered Forest",
  "Wastes",
];

// --- Helper Functions for Legality Checks ---

export const isBasicLand = (cardName: string): boolean =>
  BASIC_LAND_NAMES.includes(cardName.trim());

export const allowsAnyNumberOfCopies = (
  cardName: string,
  oracleText: string | null | undefined,
): boolean => {
  if (!oracleText) {
    return false;
  }

  const trimmedCardName = cardName.trim();
  if (trimmedCardName.length === 0) {
    return false;
  }

  const escapedCardName = trimmedCardName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const regexPattern = `A deck can have any number of cards named ${escapedCardName}\\.`;
  const regex = new RegExp(regexPattern);

  return regex.test(oracleText);
};

export const checkDeckSize = (
  format: string,
  mainboardCount: number,
): string | null => {
  const rules = DECK_SIZE_RULES[format.toLowerCase()];
  if (!rules) return null;

  if (rules.exact && mainboardCount !== rules.exact) {
    return `Deck must have exactly ${rules.exact} cards (currently ${mainboardCount}).`;
  }
  if (rules.min && mainboardCount < rules.min) {
    return `Deck must have at least ${rules.min} cards (currently ${mainboardCount}).`;
  }
  return null;
};

export const checkMaxCopies = (
  format: string,
  cards: LegalityCheckCardInfo[],
): string[] => {
  const issues: string[] = [];
  const cardCounts: Record<string, { quantity: number; isUnlimited: boolean }> =
    {};
  const maxCopiesRule =
    MAX_NON_BASIC_COPIES[format.toLowerCase()] || MAX_NON_BASIC_COPIES.default;
  const functionName = "[LegalityRules] checkMaxCopies";

  cards.forEach((c) => {
    const canonicalCardName = c.name.trim();

    if (!canonicalCardName) {
      console.warn(
        `${functionName}: Encountered card with empty name (scryfall_id: ${c.scryfall_id}). Skipping.`,
      );
      return;
    }

    if (!isBasicLand(canonicalCardName)) {
      const currentOracleText = c.cardDetails.oracle_text;

      if (!cardCounts[canonicalCardName]) {
        const isUnlimited = allowsAnyNumberOfCopies(
          canonicalCardName,
          currentOracleText,
        );
        cardCounts[canonicalCardName] = {
          quantity: 0,
          isUnlimited: isUnlimited,
        };
      }
      cardCounts[canonicalCardName].quantity += c.quantity;
    }
  });

  for (const cardNameKey in cardCounts) {
    const info = cardCounts[cardNameKey];
    if (info.isUnlimited) {
      continue;
    }
    if (info.quantity > maxCopiesRule) {
      issues.push(
        `Too many copies of ${cardNameKey} (max ${maxCopiesRule} for this format, found ${info.quantity}).`,
      );
    }
  }
  return issues;
};

export const getCommanderColorIdentity = (
  commanders: LegalityCheckCardInfo[],
): string[] => {
  if (!commanders.length) return [];
  const identitySet = new Set<string>();
  commanders.forEach((cmd) => {
    (cmd.cardDetails.color_identity || []).forEach((color) =>
      identitySet.add(color),
    );
  });
  return Array.from(identitySet);
};

export const checkCommanderRules = (
  cards: LegalityCheckCardInfo[],
): string[] => {
  const issues: string[] = [];
  const commanders = cards.filter((c) => c.is_commander);

  if (commanders.length === 0) {
    issues.push("Deck must have a commander.");
    return issues; // Early exit if no commander, other rules depend on it.
  }

  commanders.forEach((cmd) => {
    const cmdName = cmd.cardDetails.name || cmd.name;
    if (
      !cmd.cardDetails.type_line
        ?.toLowerCase()
        .includes("legendary creature") &&
      !cmd.cardDetails.type_line
        ?.toLowerCase()
        .includes("legendary planeswalker") && // Added for completeness, though typically "Legendary Creature"
      !cmd.cardDetails.keywords?.includes("can be your commander")
    ) {
      issues.push(`${cmdName} is not a legal commander type.`);
    }
    if (cmd.quantity > 1) {
      issues.push(`Commander (${cmdName}) quantity must be 1.`);
    }
  });

  if (commanders.length === 2) {
    // Check for "Partner" or "Partner with" or "Friends forever"
    const allHavePartnerLikeAbility = commanders.every(
      (cmd) =>
        cmd.cardDetails.keywords?.includes("Partner") ||
        (cmd.cardDetails.oracle_text &&
          (/Partner with [A-Z][a-zA-Z\s,'-]+/.test(
            cmd.cardDetails.oracle_text,
          ) ||
            /Friends forever/.test(cmd.cardDetails.oracle_text))),
    );

    if (!allHavePartnerLikeAbility) {
      issues.push(
        "If using two commanders, both must have a suitable pairing ability (e.g., Partner, Friends forever, specific Partner with).",
      );
    } else {
      // More specific "Partner with" validation could be added here if needed,
      // e.g., ensuring they partner with each other.
      // For now, just checking they *have* such an ability.
    }
  } else if (commanders.length > 2) {
    issues.push("A deck cannot have more than two commanders.");
  }

  const commanderIdentity = getCommanderColorIdentity(commanders);
  cards.forEach((card) => {
    if (!card.is_commander) {
      const cardIdentity = card.cardDetails.color_identity || [];
      const cardNameForError = card.cardDetails.name || card.name;
      if (!cardIdentity.every((color) => commanderIdentity.includes(color))) {
        issues.push(
          `${cardNameForError} (${cardIdentity.join("") || "C"}) is outside the commander's color identity (${commanderIdentity.join("") || "C"}).`,
        );
      }
    }
  });

  return issues;
};

export const checkOathbreakerRules = (
  cards: LegalityCheckCardInfo[],
): string[] => {
  const issues: string[] = [];
  const allCommandZoneCards = cards.filter((c) => c.is_commander);

  const oathbreaker = allCommandZoneCards.find((c) =>
    c.cardDetails.type_line?.toLowerCase().includes("planeswalker"),
  );
  const signatureSpell = allCommandZoneCards.find(
    (c) =>
      c.cardDetails.type_line?.toLowerCase().includes("instant") ||
      c.cardDetails.type_line?.toLowerCase().includes("sorcery"),
  );

  if (allCommandZoneCards.length > 2) {
    issues.push(
      "An Oathbreaker deck can only have one Oathbreaker and one Signature Spell in the command zone.",
    );
  }
  if (!oathbreaker) {
    issues.push("Deck must have a Planeswalker as an Oathbreaker.");
  }
  if (!signatureSpell) {
    issues.push("Deck must have an Instant or Sorcery as a Signature Spell.");
  }

  if (oathbreaker && signatureSpell) {
    const obName = oathbreaker.cardDetails.name || oathbreaker.name;
    const ssName = signatureSpell.cardDetails.name || signatureSpell.name;

    if (oathbreaker.quantity > 1) {
      issues.push(`Oathbreaker (${obName}) quantity must be 1.`);
    }
    if (signatureSpell.quantity > 1) {
      issues.push(`Signature Spell (${ssName}) quantity must be 1.`);
    }

    if (oathbreaker.scryfall_id === signatureSpell.scryfall_id) {
      issues.push("Oathbreaker and Signature Spell must be different cards.");
    }

    const oathbreakerIdentity = oathbreaker.cardDetails.color_identity || [];
    const spellIdentity = signatureSpell.cardDetails.color_identity || [];

    if (!spellIdentity.every((color) => oathbreakerIdentity.includes(color))) {
      issues.push(
        `Signature Spell (${ssName}) must be within the Oathbreaker's (${obName}) color identity.`,
      );
    }

    // Check all other cards in the deck for color identity
    cards.forEach((card) => {
      if (!card.is_commander) {
        // Only check non-command zone cards
        const cardIdentity = card.cardDetails.color_identity || [];
        const cardNameForError = card.cardDetails.name || card.name;
        if (
          !cardIdentity.every((color) => oathbreakerIdentity.includes(color))
        ) {
          issues.push(
            `${cardNameForError} (${cardIdentity.join("") || "C"}) is outside the Oathbreaker's color identity (${oathbreakerIdentity.join("") || "C"}).`,
          );
        }
      }
    });
  } else if (allCommandZoneCards.length > 0 && !issues.length) {
    // This case handles if one is defined but not the other, or if there are other commanders.
    // The specific missing Oathbreaker/Signature Spell messages are already added.
    // If there are other cards marked `is_commander` that are neither, it's an issue.
    const otherCommanders = allCommandZoneCards.filter(
      (c) => c !== oathbreaker && c !== signatureSpell,
    );
    if (otherCommanders.length > 0) {
      issues.push(
        "Invalid card(s) designated for the command zone. Must be one Planeswalker (Oathbreaker) and one Instant/Sorcery (Signature Spell).",
      );
    }
  }

  return issues;
};
