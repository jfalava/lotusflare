// components/decks/decks-browse-client.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import DeckListClient from "@/components/decks/deck-list-client";
import type { DeckWithDetails } from "#/backend/src/types";

interface DecksBrowseClientProps {
  initialDecks: DeckWithDetails[];
  initialSearch?: string;
  initialPage?: number;
}

export default function DecksBrowseClient({
  initialDecks,
  initialSearch = "",
  initialPage = 1,
}: DecksBrowseClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm] = useState(initialSearch);
  const [currentPage] = useState(initialPage);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Sync `search` & `page` into URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchTerm.trim()) {
      params.set("search", debouncedSearchTerm.trim());
    } else {
      params.delete("search");
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    } else {
      params.delete("page");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debouncedSearchTerm, currentPage, pathname, router, searchParams]);

  // Client‐side filtering
  const filteredDecks = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return initialDecks;
    const term = debouncedSearchTerm.toLowerCase();
    return initialDecks.filter(
      (deck) =>
        deck.name.toLowerCase().includes(term) ||
        deck.format.toLowerCase().includes(term) ||
        (deck.description?.toLowerCase().includes(term) ?? false),
    );
  }, [initialDecks, debouncedSearchTerm]);

  return (
    <DeckListClient
      initialDecks={filteredDecks}
      initialSearchTerm={debouncedSearchTerm}
    />
  );
}
