"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type {
  ScryfallApiCard,
  ScryfallListResponse,
} from "#/backend/src/types";
import { SearchResultsPopover } from "@/components/search/search-results-popover";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { useKeyPress } from "@/hooks/useKeyPress";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { searchScryfallCards } from "@/lib/api-server";

interface ScryfallSearchBarProps {
  onCardSelected: (card: ScryfallApiCard) => void;
}

const ScryfallSearchBar: React.FC<ScryfallSearchBarProps> = ({
  onCardSelected,
}) => {
  const [scryfallSearchTerm, setScryfallSearchTerm] = useState("");
  const [scryfallResults, setScryfallResults] = useState<ScryfallApiCard[]>([]);
  const [isScryfallSearching, setIsScryfallSearching] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const scryfallInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const focusCountRef = useRef(0);
  const lastFocusTimeRef = useRef<number>(0);
  const cardSelectedRef = useRef(false);

  // Keybind to focus search input: Alt+A
  useKeyPress(
    "a",
    (e) => {
      const targetEl = e.target as HTMLElement;
      if (
        targetEl.tagName === "INPUT" ||
        targetEl.tagName === "TEXTAREA" ||
        targetEl.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      scryfallInputRef.current?.focus();
    },
    { alt: true },
  );

  // Reset counters when search term is cleared or card is selected
  useEffect(() => {
    if (!scryfallSearchTerm) {
      focusCountRef.current = 0;
      cardSelectedRef.current = false;
    }
  }, [scryfallSearchTerm]);

  const triggerScryfallSearch = useCallback(async () => {
    const currentTerm = scryfallSearchTerm;
    if (!currentTerm.trim() || currentTerm.length < 3) {
      setScryfallResults([]);
      setPopoverOpen(false);
      setIsScryfallSearching(false);
      return;
    }
    setIsScryfallSearching(true);
    setPopoverOpen(true);
    try {
      const data = await searchScryfallCards(currentTerm);
      setScryfallResults(data.data || []);
    } catch (error) {
      console.error("Scryfall search error:", error);
      toast.error("Failed to search for cards.");
      setScryfallResults([]);
    } finally {
      setIsScryfallSearching(false);
    }
  }, [scryfallSearchTerm]);

  const handleSelectCard = (card: ScryfallApiCard) => {
    cardSelectedRef.current = true; // Mark that a card was selected
    onCardSelected(card);
    setScryfallResults([]);
    setScryfallSearchTerm("");
    setPopoverOpen(false);
    focusCountRef.current = 0; // Reset counter on successful selection
    scryfallInputRef.current?.blur();
  };

  const handleScryfallInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      triggerScryfallSearch();
    }
  };

  const handleClearScryfall = () => {
    setScryfallSearchTerm("");
    setScryfallResults([]);
    setPopoverOpen(false);
    focusCountRef.current = 0;
    cardSelectedRef.current = false;
  };

  const handleInputFocus = () => {
    // Only track focus if there's already a search term and results that would show a popover
    if (scryfallSearchTerm.length >= 3 && scryfallResults.length > 0) {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTimeRef.current;

      if (timeSinceLastFocus < 10000) {
        // 10 seconds
        focusCountRef.current++;

        if (focusCountRef.current >= 3 && !cardSelectedRef.current) {
          toast.info(
            "Tip: Use the ❌ button to clear your search and try a different query",
          );
          focusCountRef.current = 0; // Reset counter after showing toast
        }
      } else {
        focusCountRef.current = 1; // Reset if too much time has passed
      }

      lastFocusTimeRef.current = now;
      cardSelectedRef.current = false; // Reset selection flag when focused
      setPopoverOpen(true);
    }
  };

  const placeholderText = isDesktop
    ? "Search cards to add... (Alt + A to focus)"
    : "Search cards to add...";

  return (
    <div className="relative flex-grow">
      <Input
        ref={scryfallInputRef}
        type="text"
        placeholder={placeholderText}
        value={scryfallSearchTerm}
        onChange={(e) => {
          const term = e.target.value;
          setScryfallSearchTerm(term);
          setScryfallResults([]); // clear previous results
          setPopoverOpen(false); // always keep popover closed until Enter
        }}
        onFocus={handleInputFocus}
        className="pl-10 pr-10 h-10 text-base"
        onKeyDown={handleScryfallInputKeyDown}
        aria-label="Search for new card"
        suppressHydrationWarning
      />
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        size={20}
      />
      {scryfallSearchTerm && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={handleClearScryfall}
          aria-label="Clear search"
        >
          <X size={16} />
        </Button>
      )}
      {isScryfallSearching && (
        <Loader2
          className="absolute right-10 top-1/2 -translate-y-1/2 animate-spin text-primary"
          size={20}
        />
      )}
      <SearchResultsPopover
        open={popoverOpen && scryfallSearchTerm.length >= 3}
        results={scryfallResults}
        isLoading={isScryfallSearching}
        onSelectCard={handleSelectCard}
        onClose={() => setPopoverOpen(false)}
      />
    </div>
  );
};

export default ScryfallSearchBar;
