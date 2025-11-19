// components/decks/editor/add-cards-panel.tsx
"use client";

import React, { useRef } from "react";
import clsx from "clsx";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Upload, FileSearch2, Loader2, Info } from "lucide-react";
import { SearchResultsPopover } from "@/components/search/search-results-popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ScryfallApiCard } from "#/backend/src/types";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useKeyPress } from "@/hooks/useKeyPress";

interface AddCardsPanelProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  results: ScryfallApiCard[];
  isLoading: boolean;
  open: boolean;
  onSelectCard: (card: ScryfallApiCard) => void;
  onClose: () => void;
  onBulkImportClick: () => void;
  onInputFocus?: () => void;
  brewMode: boolean;
  onBrewModeChange: (value: boolean) => void;
  sendToMayeboardInBrew: boolean;
  onSendToMayeboardInBrewChange: (value: boolean) => void;
}

const AddCardsPanel: React.FC<AddCardsPanelProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearch,
  onClearSearch,
  results,
  isLoading,
  open,
  onSelectCard,
  onClose,
  onBulkImportClick,
  onInputFocus,
  brewMode,
  onBrewModeChange,
  sendToMayeboardInBrew,
  onSendToMayeboardInBrewChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Alt+A to focus
  useKeyPress(
    "a",
    (e) => {
      const tgt = e.target as HTMLElement;
      if (
        tgt.tagName === "INPUT" ||
        tgt.tagName === "TEXTAREA" ||
        tgt.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    },
    { alt: true },
  );

  // Alt+Y to syntax guide
  useKeyPress(
    "y",
    (e) => {
      const tgt = e.target as HTMLElement;
      if (
        tgt.tagName === "INPUT" ||
        tgt.tagName === "TEXTAREA" ||
        tgt.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      window.open("https://scryfall.com/docs/syntax", "_blank");
    },
    { alt: true },
  );

  // Alt+M to bulk import
  useKeyPress(
    "m",
    (e) => {
      const tgt = e.target as HTMLElement;
      if (
        tgt.tagName === "INPUT" ||
        tgt.tagName === "TEXTAREA" ||
        tgt.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      onBulkImportClick();
    },
    { alt: true },
  );

  // Alt+F to toggle Brew Mode
  useKeyPress(
    "f",
    (e) => {
      const tgt = e.target as HTMLElement;
      if (
        tgt.tagName === "INPUT" ||
        tgt.tagName === "TEXTAREA" ||
        tgt.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      onBrewModeChange(!brewMode);
    },
    { alt: true },
  );

  const handlePopoverClose = () => {
    onClose();
    onClearSearch();
  };

  // wrap select to refocus in brew mode
  const handleCardSelect = (card: ScryfallApiCard) => {
    onSelectCard(card);
    if (brewMode) {
      inputRef.current?.focus();
    }
  };

  const placeholderText = isDesktop
    ? "Search... (Alt + A to focus)"
    : "Search... (Enter to search)";

  return (
    <div className="p-4 border rounded-lg bg-card space-y-3 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="grid md:flex items-center gap-x-3 gap-y-1">
          <h2 className="text-xl font-semibold">Add Cards</h2>
          <Link target="_blank" href="https://scryfall.com/docs/syntax">
            <Button variant="outline">
              <FileSearch2 className="h-4 w-4" />
              <span>
                Search <span className="max-lg:hidden">syntax</span> guide ↗
              </span>
              <div className="hidden items-center gap-1 lg:flex ml-2">
                <Kbd>Alt</Kbd>
                <Kbd>Y</Kbd>
              </div>
            </Button>
          </Link>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkImportClick}
          className="gap-2"
        >
          <Upload className="h-4 w-4" /> Bulk Import
          <div className="hidden items-center gap-1 lg:flex ml-2">
            <Kbd>Alt</Kbd>
            <Kbd>M</Kbd>
          </div>
        </Button>
      </div>

      <div
        className={clsx(
          "flex flex-col md:flex-row",
          "items-start md:items-center",
          "gap-4 mb-3",
        )}
      >
        <div className="relative flex-grow w-full">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholderText}
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch();
                if (brewMode) {
                  inputRef.current?.focus();
                }
              }
            }}
            onFocus={onInputFocus}
            className="h-10 text-base pr-10 w-full"
            suppressHydrationWarning
          />
          {isLoading && (
            <Loader2
              className="absolute right-8 top-1/2 -translate-y-1/2
                         h-5 w-5 animate-spin text-primary"
              aria-hidden="true"
            />
          )}
          {searchTerm && !isLoading && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2
                         -translate-y-1/2 h-7 w-7 text-muted-foreground
                         hover:text-primary"
              onClick={onClearSearch}
              aria-label="Clear search"
            >
              <X size={18} />
            </Button>
          )}
          <SearchResultsPopover
            open={open}
            results={results}
            isLoading={isLoading}
            onSelectCard={handleCardSelect}
            onClose={handlePopoverClose}
            className="mt-1 w-full"
          />
        </div>

        <div className="flex items-center gap-6 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Switch
              id="brew-mode"
              checked={brewMode}
              onCheckedChange={onBrewModeChange}
            />
            <Label
              htmlFor="brew-mode"
              className="cursor-pointer select-none flex items-center gap-2"
            >
              Brew Mode
              <div className="hidden items-center gap-1 lg:flex">
                <Kbd>Alt</Kbd>
                <Kbd>F</Kbd>
              </div>
            </Label>
            <Tooltip>
              <TooltipTrigger asChild className="max-md:hidden">
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>
                  "Brew Mode" will skip the card print selection and add the
                  latest print available instead.
                </p>
                <p>The card name must be the canonical english name.</p>
                <p>Upon adding a card, the search bar will be focused again.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {brewMode && (
            <div className="flex items-center gap-2">
              <Switch
                id="send-to-maybeboard"
                checked={sendToMayeboardInBrew}
                onCheckedChange={onSendToMayeboardInBrewChange}
              />
              <Label
                htmlFor="send-to-maybeboard"
                className="cursor-pointer select-none"
              >
                <span className="max-md:hidden">
                  Add directly to Maybeboard
                </span>
                <span className="md:hidden">To Maybeboard</span>
              </Label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCardsPanel;
