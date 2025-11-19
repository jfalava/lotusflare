// components/deck/commander-section.tsx
"use client";

import React from "react";
import { Users } from "lucide-react";
import { CardImage } from "@/components/ui/card-image";
import type { DeckCardWithDetails } from "#/backend/src/types";

interface CommanderSectionProps {
  commanders: DeckCardWithDetails[];
  onCardClick: (c: DeckCardWithDetails) => void;
}

export const CommanderSection: React.FC<CommanderSectionProps> = ({
  commanders,
  onCardClick,
}) => {
  if (commanders.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        Commander(s)
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {commanders.map((item) => (
          <div
            key={item.card.id}
            onClick={() => onCardClick(item)}
            className="block group cursor-pointer"
          >
            <CardImage
              src={
                item.card.image_uris?.art_crop ?? item.card.image_uris?.normal
              }
              alt={item.card.name}
              className="rounded-xl shadow-lg hover:scale-105 transition-transform duration-200 border-2 border-transparent group-hover:border-primary"
              isCommander
            />
            <p className="text-center mt-2 font-medium text-sm group-hover:text-primary">
              {item.card.name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
