// components/deck/deck-header.tsx
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import type { DeckWithDetails } from "#/backend/src/types";

interface DeckHeaderProps {
  deck: DeckWithDetails;
  totalMainboardCards: number;
  totalSideboardCards: number;
}

export const DeckHeader: React.FC<DeckHeaderProps> = ({
  deck,
  totalMainboardCards,
  totalSideboardCards,
}) => {
  return (
    <div className="mb-8 pb-6 border-b border-border">
      <h2 className="text-4xl font-beleren-caps font-bold tracking-tight mb-2">
        {deck.name}
      </h2>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm">
        <Badge
          variant="outline"
          className="text-base px-3 py-1 capitalize flex items-center gap-1.5"
        >
          <BookOpen className="h-4 w-4" />
          {deck.format}
        </Badge>

        <span>Updated: {new Date(deck.updated_at).toLocaleDateString()}</span>
        <span>Total Cards: {totalMainboardCards + totalSideboardCards}</span>
      </div>

      {deck.description && (
        <p className="mt-3 text-md text-muted-foreground max-w-3xl">
          {deck.description}
        </p>
      )}
    </div>
  );
};
