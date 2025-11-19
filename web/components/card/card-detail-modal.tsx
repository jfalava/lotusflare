// components/card/card-detail-modal.tsx
"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { ScryfallApiCard } from "#/backend/src/types";
import { CardDetailModalContent } from "@/components/card/card-detail-modal-content";

export type CardDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card:
    | (ScryfallApiCard & {
        quantity?: number;
        is_foil?: boolean;
        place_name?: string | null;
        notes?: string | null;
        condition?: string | null;
        language?: string | null;
        is_commander?: boolean;
        is_sideboard?: boolean;
      })
    | null;
};

export function CardDetailModal({
  open,
  onOpenChange,
  card,
}: CardDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-auto min-w-[360px] max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[1200px] 2xl:max-w-[1400px] max-h-[90vh] flex flex-col p-0 overflow-hidden transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0">
        {card && <CardDetailModalContent card={card} />}
      </DialogContent>
    </Dialog>
  );
}
