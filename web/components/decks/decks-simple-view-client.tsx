// components/decks/decks-simple-view-client.tsx
"use client";

import React from "react";
import DeckListClient from "@/components/decks/deck-list-client";
import type { DeckWithDetails } from "#/backend/src/types";

interface DecksSimpleViewClientProps {
  initialDecks: DeckWithDetails[];
  initialSearch?: string;
  initialPage?: number;
}

export default function DecksSimpleViewClient({
  initialDecks,
  initialSearch,
}: DecksSimpleViewClientProps) {
  return (
    <DeckListClient
      initialDecks={initialDecks}
      initialSearchTerm={initialSearch}
    />
  );
}
